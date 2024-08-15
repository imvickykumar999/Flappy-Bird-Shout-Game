// Get the canvas and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to the window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Call the function to set the initial size
resizeCanvas();

// Update game properties based on dynamic size
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
const ballSize = 30;
const gravity = 0.05;
const baseJumpStrength = -2;
const moveSpeed = 3;
const platformWidth = 100;
const platformHeight = 20;
const groundHeight = 50;
const platformMoveSpeed = 2;
const platformMoveRange = 100;
const gridSize = 40;
const threshold = 90; // Threshold for sound detection

let ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    speedX: moveSpeed,
    speedY: 0,
};

let platforms = [];
let steppedOnPlatforms = new Set();
let score = 0;
let isJumping = false;
let cameraX = 0;
let startX = ball.x;

// Initialize Web Audio API
let audioContext;
let analyser;
let dataArray;

// Set up audio
async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// Get the sound intensity from the microphone input
function getSoundIntensity() {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    return average;
}

// Check if sound is detected based on the threshold
function isSoundDetected() {
    return getSoundIntensity() > threshold;
}

// Initialize game state
function resetGame() {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speedX = moveSpeed;
    ball.speedY = 0;
    cameraX = 0;
    isJumping = false;
    steppedOnPlatforms.clear();
    score = 0;
    startX = ball.x;

    platforms = [];
    for (let x = 0; x < WIDTH + platformWidth * 2; x += platformWidth * 3) {
        const y = HEIGHT - groundHeight - Math.random() * 150;
        platforms.push(createPlatform(x, y));
    }
}

// Create a platform
function createPlatform(x, y) {
    return { x, y, width: platformWidth, height: platformHeight };
}

// Create a moving platform
function createMovingPlatform(x, y) {
    return {
        rect: { x, y, width: platformWidth, height: platformHeight },
        direction: Math.random() < 0.5 ? -1 : 1,
        moveRange: platformMoveRange,
        initialX: x,
    };
}

// Add a new platform
function addPlatform() {
    const lastPlatform = platforms[platforms.length - 1];
    const newX = lastPlatform.rect ? lastPlatform.rect.x + Math.random() * 150 + 300 : lastPlatform.x + Math.random() * 150 + 300;
    const newY = HEIGHT - groundHeight - Math.random() * 150;
    platforms.push(createPlatform(newX, newY));
}

// Scroll platforms based on the camera position
function scrollPlatforms() {
    platforms = platforms.filter(platform => {
        if (platform.rect) {
            platform.rect.x += platform.direction * platformMoveSpeed;
            if (platform.rect.x < platform.initialX - platform.moveRange || platform.rect.x > platform.initialX + platform.moveRange) {
                platform.direction *= -1;
            }
        }
        return platform.x + platform.width > cameraX - WIDTH;
    });
}

// Update the score based on distance traveled
function updateScore() {
    const distanceMoved = Math.max(0, Math.floor((ball.x - startX) / 10));
    score = distanceMoved;
}

// Draw the grid on the canvas
function drawGrid() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
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

// Draw the game objects on the canvas
function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawGrid();

    ctx.fillStyle = 'green';
    ctx.fillRect(0 - cameraX, HEIGHT - groundHeight, WIDTH, groundHeight);

    platforms.forEach(platform => {
        ctx.fillStyle = 'white';
        ctx.fillRect(platform.x - cameraX, platform.y, platform.width, platform.height);
    });

    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(ball.x - cameraX, ball.y, ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.fillText(`Score: ${score}`, 10, 40);
}

// Handle game over
function handleGameOver() {
    ctx.fillStyle = 'red';
    ctx.font = '48px Arial';
    ctx.fillText('Game Over', WIDTH / 2 - 120, HEIGHT / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, WIDTH / 2 - 60, HEIGHT / 2 + 30);
    return true;
}

// Game update logic
function update() {
    // Check if sound is detected to make the ball jump
    if (isSoundDetected()) {
        if (!isJumping) {
            ball.speedY = baseJumpStrength;
            ball.speedX = moveSpeed; // Continue moving forward with jump
            isJumping = true;
        }
    }

    ball.speedY += gravity;
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Update camera position to follow the ball
    cameraX = ball.x - WIDTH / 2;

    // Check if the ball is touching the ground or platforms
    if (ball.y + ballSize / 2 >= HEIGHT - groundHeight) {
        ball.y = HEIGHT - groundHeight - ballSize / 2;
        ball.speedY = 0;
        isJumping = false;
    }

    // Check if the ball has fallen below the bottom of the screen
    if (ball.y > HEIGHT) {
        if (!handleGameOver()) return;
    }

    let onPlatform = false;

    platforms.forEach(platform => {
        if (ball.x + ballSize / 2 > platform.x && ball.x - ballSize / 2 < platform.x + platform.width &&
            ball.y + ballSize / 2 > platform.y && ball.y - ballSize / 2 < platform.y + platform.height) {
            onPlatform = true;
            if (ball.speedY > 0) {
                ball.y = platform.y - ballSize / 2;
                ball.speedY = 0;
                isJumping = false;
                const platformId = `${platform.x},${platform.y}`;
                if (!steppedOnPlatforms.has(platformId)) {
                    steppedOnPlatforms.add(platformId);
                    updateScore();
                }
            } else if (ball.speedY < 0) {
                ball.y = platform.y + platform.height + ballSize / 2;
                ball.speedY = 0;
            }

            if (ball.speedX > 0 && ball.x + ballSize / 2 > platform.x + platform.width) {
                ball.x = platform.x + platform.width - ballSize / 2;
            } else if (ball.speedX < 0 && ball.x - ballSize / 2 < platform.x) {
                ball.x = platform.x - ballSize / 2;
            }
        }
    });

    // If the ball is not on any platform and has fallen below the screen, trigger game over
    if (!onPlatform && ball.y > HEIGHT) {
        if (!handleGameOver()) return;
    }

    if (platforms[platforms.length - 1].x + platformWidth < cameraX + WIDTH) {
        addPlatform();
    }

    scrollPlatforms();
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    resetGame(); // Reset the game when the window size changes to adjust platforms, etc.
});

// Start the game on user interaction
document.addEventListener('click', async () => {
    await setupAudio();
    resetGame();
    gameLoop();
});
