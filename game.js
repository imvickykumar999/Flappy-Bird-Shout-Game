// Set up the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game properties
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const ballSize = 30;
const gravity = 0.5;
const baseJumpStrength = -20;
const moveSpeed = 5;
const platformWidth = 100;
const platformHeight = 20;
const groundHeight = 50;
const platformMoveSpeed = 2;
const platformMoveRange = 100;
const gridSize = 40;

// Initialize game state
let ball = { x: WIDTH / 2, y: HEIGHT / 2, speedX: 0, speedY: 0 };
let platforms = [];
let cameraX = 0;
let isJumping = false;
let score = 0;
let steppedOnPlatforms = new Set();
let platformLandingState = {};
let startX = ball.x;

// Audio setup
let audioContext;
let microphone;
let analyser;
let dataArray;

async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    microphone.connect(analyser);
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Get the sound intensity from the microphone input
function getSoundIntensity() {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average;
}

// Check if sound is detected based on the threshold
function isSoundDetected(threshold = 0.1) {  // Lower the threshold value
    return getSoundIntensity() > threshold;
}

// Start AudioContext on user interaction
function handleUserInteraction() {
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed.');
            // Continue with game setup after resuming AudioContext
            resetGame();
            gameLoop();
        }).catch(err => {
            console.error('Error resuming AudioContext:', err);
        });
    } else {
        // Continue with game setup if AudioContext is already running
        resetGame();
        gameLoop();
    }
}

// Reset game
function resetGame() {
    ball = { x: WIDTH / 2, y: HEIGHT / 2, speedX: 0, speedY: 0 };
    cameraX = 0;
    isJumping = false;
    steppedOnPlatforms = new Set();
    score = 0;
    platformLandingState = {};

    platforms = [];
    for (let x = 0; x < WIDTH + platformWidth * 2; x += platformWidth * 3) {
        const y = HEIGHT - groundHeight - Math.random() * 130 + 20;
        if (Math.random() < 0.6) {
            platforms.push(createMovingPlatform(x, y));
        } else {
            platforms.push(createPlatform(x, y));
        }
    }
}

// Create platform functions
function createPlatform(x, y) {
    return { x, y, width: platformWidth, height: platformHeight };
}

function createMovingPlatform(x, y) {
    return { x, y, width: platformWidth, height: platformHeight, direction: Math.random() < 0.5 ? -1 : 1, initialX: x };
}

// Draw functions
function drawGrid() {
    ctx.strokeStyle = 'rgb(50, 50, 50)';
    for (let x = 0; x < WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawGrid();

    // Draw ground
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(-cameraX, HEIGHT - groundHeight, WIDTH, groundHeight);

    // Draw platforms
    ctx.fillStyle = 'rgb(255, 255, 255)';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x - cameraX, platform.y, platform.width, platform.height);
    });

    // Draw ball
    ctx.fillStyle = 'rgb(255, 255, 0)';
    ctx.beginPath();
    ctx.arc(ball.x - cameraX, ball.y, ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.font = '36px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);
}

// Game update function
function update() {
    // Ball movement
    ball.speedY += gravity;
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Check collision with ground
    if (ball.y + ballSize / 2 >= HEIGHT - groundHeight) {
        ball.y = HEIGHT - groundHeight - ballSize / 2;
        ball.speedY = 0;
        isJumping = false;
    }

    // Platform collisions
    platforms.forEach(platform => {
        if (ball.x + ballSize / 2 > platform.x && ball.x - ballSize / 2 < platform.x + platform.width &&
            ball.y + ballSize / 2 > platform.y && ball.y - ballSize / 2 < platform.y + platform.height) {
            if (ball.speedY > 0) { // Falling down
                ball.y = platform.y - ballSize / 2;
                ball.speedY = 0;
                isJumping = false;
                const platformId = `${platform.x},${platform.y}`;
                if (!steppedOnPlatforms.has(platformId)) {
                    steppedOnPlatforms.add(platformId);
                    updateScore();
                    platformLandingState[platformId] = true;
                }
            } else if (ball.speedY < 0) { // Jumping up
                ball.y = platform.y + platform.height + ballSize / 2;
                ball.speedY = 0;
            }

            // Prevent falling off the sides
            if (ball.speedX > 0 && ball.x + ballSize / 2 > platform.x + platform.width) {
                ball.x = platform.x + platform.width - ballSize / 2;
            } else if (ball.speedX < 0 && ball.x - ballSize / 2 < platform.x) {
                ball.x = platform.x - ballSize / 2;
            }
        }
    });

    // Remove platform landing state after one frame
    Object.keys(platformLandingState).forEach(key => {
        platformLandingState[key] = false;
    });

    // Add new platforms if needed
    const lastPlatform = platforms[platforms.length - 1];
    if (lastPlatform.x + platformWidth < cameraX + WIDTH) {
        addPlatform();
    }

    // Update score
    updateScore();

    // Check for audio input
    if (isSoundDetected()) {
        ball.speedY = baseJumpStrength;
        ball.speedX = moveSpeed;
        isJumping = true;
    }
}

// Update score function
function updateScore() {
    const distanceMoved = Math.max((ball.x - startX) / 10, 0);
    score = Math.floor(distanceMoved);
}

// Add platform function
function addPlatform() {
    if (platforms.length > 0) {
        const lastPlatform = platforms[platforms.length - 1];
        const newX = lastPlatform.x + platformWidth * 3 + Math.random() * 150 + 150;
        const newY = HEIGHT - groundHeight - Math.random() * 130 + 20;
        if (Math.random() < 0.3) {
            platforms.push(createMovingPlatform(newX, newY));
        } else {
            platforms.push(createPlatform(newX, newY));
        }
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game on user interaction
document.addEventListener('click', () => {
    setupAudio().then(handleUserInteraction);
});
