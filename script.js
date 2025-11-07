// Firebase config (REEMPLAZA con tu config de Firebase)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let questions = [];
let currentQuestionIndex = -1;
let score = 0;
let username = "";
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

// Load questions from JSON
fetch('questions.json')
    .then(response => response.json())
    .then(data => {
        questions = data;
        console.log('Questions loaded:', questions.length);
    })
    .catch(error => console.error('Error loading questions:', error));

// Roulette setup
const canvas = document.getElementById('roulette-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
let angle = 0;
let spinning = false;

// Draw roulette
function drawRoulette() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 140;
    const sliceAngle = (2 * Math.PI) / questions.length;

    questions.forEach((_, i) => {
        const startAngle = i * sliceAngle + angle;
        const endAngle = (i + 1) * sliceAngle + angle;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#ffcccc' : '#ccffcc';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const textAngle = startAngle + sliceAngle / 2;
        const textX = centerX + Math.cos(textAngle) * (radius / 2);
        const textY = centerY + Math.sin(textAngle) * (radius / 2);
        ctx.fillText(`Q${i+1}`, textX, textY);
    });
}

// Spin roulette
spinBtn.addEventListener('click', () => {
    if (spinning || questions.length === 0) return;
    spinning = true;
    const spinAngle = Math.random() * 360 + 720;
    const duration = 3000;
    const startTime = Date.now();
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        if (progress < 1) {
            angle += (spinAngle * (1 - progress)) / 10;
            drawRoulette();
            requestAnimationFrame(animate);
        } else {
            spinning = false;
            const finalAngle = angle % (2 * Math.PI);
            currentQuestionIndex = Math.floor((2 * Math.PI - finalAngle) / ((2 * Math.PI) / questions.length)) % questions.length;
            showQuestion();
        }
    };
    animate();
});

// Show question
function showQuestion() {
    const q = questions[currentQuestionIndex];
    document.getElementById('question').textContent = q.question;
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, i) => {
        btn.textContent = `${String.fromCharCode(65 + i)}. ${q.options[i]}`;
        btn.onclick = () => checkAnswer(btn.dataset.option);
    });
    document.getElementById('question-section').style.display = 'block';
}

// Check answer and save to Firebase
function checkAnswer(selected) {
    const q = questions[currentQuestionIndex];
    const feedback = document.getElementById('feedback');
    const isCorrect = selected === q.correct;
    if (isCorrect) {
        feedback.textContent = "Correct!";
        feedback.style.color = "green";
        score++;
    } else {
        feedback.textContent = `Wrong! Correct is ${q.correct}.`;
        feedback.style.color = "red";
    }
    document.getElementById('score').textContent = score;

    // Save to Firebase
    db.collection('responses').add({
        username: username,
        questionIndex: currentQuestionIndex,
        question: q.question,
        selectedOption: selected,
        correctOption: q.correct,
        isCorrect: isCorrect,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log('Response saved');
    }).catch(error => {
        console.error('Error saving response:', error);
    });

    setTimeout(() => {
        document.getElementById('question-section').style.display = 'none';
        feedback.textContent = "";
        if (currentQuestionIndex === questions.length - 1) {
            endGame();
        }
    }, 2000);
}

// End game
function endGame() {
    leaderboard.push({ name: username, score });
    leaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    updateLeaderboard();
    alert(`Game over! Your score: ${score}`);
    score = 0;
    currentQuestionIndex = -1;
    document.getElementById('score').textContent = score;
    document.getElementById('game-section').style.display = 'none';
    document.getElementById('username-section').style.display = 'block';
}

// Update leaderboard
function updateLeaderboard() {
    const lb = document.getElementById('leaderboard');
    lb.innerHTML = "";
    leaderboard.slice(0, 10).forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        lb.appendChild(li);
    });
}

// Start game
document.getElementById('start-btn').addEventListener('click', () => {
    username = document.getElementById('username').value.trim();
    if (!username) {
        alert("Please enter a username!");
        return;
    }
    document.getElementById('username-section').style.display = 'none';
    document.getElementById('game-section').style.display = 'block';
    drawRoulette();
    updateLeaderboard();
});

// Initial draw
drawRoulette();
updateLeaderboard();
