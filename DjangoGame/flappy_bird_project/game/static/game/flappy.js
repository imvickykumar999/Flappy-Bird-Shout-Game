const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startMessage = document.getElementById('startMessage');
const gameOverScreen = document.getElementById('gameOverScreen');
const loadingOverlay = document.getElementById('loadingOverlay');
const audioBar = document.getElementById('audioBar');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

let WIDTH = canvas.width;
let HEIGHT = canvas.height;
const birdSize = 30;
const gravity = 0.1;
const flapStrength = -3;
const pipeWidth = 80;
const pipeGap = 300;
const pipeSpeed = 2;
const pipeDistance = 400;
const threshold = 40;

let bird = {
    x: WIDTH / 4,
    y: HEIGHT / 2,
    speedY: 0,
    distanceTraveled: 0,
};

let pipes = [];
let score = 0;
let gameOver = false;

let audioContext;
let analyser;
let dataArray;

async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function getSoundIntensity() {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average;
}

function isSoundDetected() {
    const intensity = getSoundIntensity();
    updateAudioBar(intensity); // Update the audio bar height
    return intensity > threshold;
}

function updateAudioBar(intensity) {
    const barHeight = Math.min((intensity - 20) * 3, 150); // Adjusted for visual sensitivity
    audioBar.style.height = `${barHeight}px`;
}

function resetGame() {
    bird.y = HEIGHT / 2;
    bird.speedY = 0;
    bird.distanceTraveled = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    gameOverScreen.style.display = 'none'; // Hide game over screen
    addPipe();
}

function createPipe() {
    const pipeY = Math.random() * (HEIGHT - pipeGap - 100) + 50;
    pipes.push({
        x: WIDTH,
        y: pipeY,
    });
}

function addPipe() {
    createPipe();
}

function handleGameOver() {
    gameOver = true;
    gameOverScreen.style.display = 'block'; // Show game over screen
}

function showLoadingOverlay() {
    loadingOverlay.style.display = 'flex';
}

function restartGame() {
    showLoadingOverlay();
    setTimeout(() => {
        window.location.reload(); // Reload the page after showing the loading overlay
    }, 500); // Adjust delay as needed
}

function update() {
    if (gameOver) return;

    if (isSoundDetected()) {
        bird.speedY = flapStrength;
    }

    bird.speedY += gravity;
    bird.y += bird.speedY;

    bird.distanceTraveled += pipeSpeed; // Increase distance as the bird moves
    score = Math.floor(bird.distanceTraveled / 10); // Update score based on distance

    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;
    });

    pipes = filteredPipes(pipes, pipeWidth);

    if (pipes[pipes.length - 1].x < WIDTH - pipeDistance) {
        addPipe();
    }

    if (isCollisionDetected(bird, pipes, birdSize, pipeWidth, pipeGap)) {
        handleGameOver();
    }

    if (bird.y + birdSize / 2 > HEIGHT || bird.y - birdSize / 2 < 0) {
        handleGameOver();
    }
}

function filteredPipes(pipes, pipeWidth) {
    return pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

function isCollisionDetected(bird, pipes, birdSize, pipeWidth, pipeGap) {
    return pipes.some(pipe => (
        (bird.x + birdSize / 2 > pipe.x && bird.x - birdSize / 2 < pipe.x + pipeWidth) &&
        (bird.y - birdSize / 2 < pipe.y || bird.y + birdSize / 2 > pipe.y + pipeGap)
    ));
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    pipes.forEach(pipe => {
        ctx.fillStyle = 'green';
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.y);
        ctx.fillRect(pipe.x, pipe.y + pipeGap, pipeWidth, HEIGHT - pipe.y - pipeGap);
    });

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, birdSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = '36px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('click', async () => {
    await setupAudio();
    resetGame();
    startMessage.style.display = 'none';
    gameLoop();
});
