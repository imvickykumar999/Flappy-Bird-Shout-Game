import pygame
import sys
import random
import pyaudio
import numpy as np
import cv2  # Import OpenCV for camera feed

# Initialize Pygame
pygame.init()

# Initialize PyAudio
audio = pyaudio.PyAudio()
stream = audio.open(format=pyaudio.paInt16, channels=1, rate=44100, input=True, frames_per_buffer=1024)

# Initialize OpenCV camera
ip_webcam_url = 'http://192.168.0.104:8080/video'  # Replace with your actual URL

camera = cv2.VideoCapture(ip_webcam_url)
# camera = cv2.VideoCapture(0)

# Screen dimensions (Fullscreen)
screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
WIDTH, HEIGHT = screen.get_size()

# Colors
WHITE = (255, 255, 255)
YELLOW = (255, 255, 0)
PIPE_COLOR = (0, 255, 0)

# Game properties
bird_size = 30
bird_x = 200
bird_y = HEIGHT // 2
gravity = 0.2
jump_strength = -5
move_speed = 5

pipe_width = 80
pipe_gap = 200
pipe_distance = 600
pipe_speed = 5

# Initialize game state
def reset_game():
    global bird_y, bird_speed_y, pipes, score, bird_rect

    bird_y = HEIGHT // 2
    bird_speed_y = 0
    bird_rect = pygame.Rect(bird_x, bird_y, bird_size, bird_size)

    pipes = []
    for i in range(3):
        pipe_x = WIDTH + i * pipe_distance
        pipe_height = random.randint(100, HEIGHT - pipe_gap - 100)
        pipes.append((pipe_x, pipe_height))

    score = 0

def create_pipe(pipe_x):
    pipe_height = random.randint(100, HEIGHT - pipe_gap - 100)
    return (pipe_x, pipe_height)

def get_sound_intensity():
    data = np.frombuffer(stream.read(1024), dtype=np.int16)
    return np.max(np.abs(data))

def is_sound_detected(threshold=1000):
    return get_sound_intensity() > threshold

# Function to convert OpenCV frame to Pygame surface
def get_camera_frame():
    ret, frame = camera.read()
    if not ret:
        return None

    # Flip the frame so it's not mirrored
    frame = cv2.flip(frame, 1)

    # Resize the frame to fit the screen
    frame = cv2.resize(frame, (WIDTH, HEIGHT))

    # Convert the frame to RGB (OpenCV uses BGR by default)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Convert the frame to a Pygame surface
    frame_surface = pygame.surfarray.make_surface(frame_rgb.transpose(1, 0, 2))
    return frame_surface

# Initialize game state
pipes = []
reset_game()

# Font for rendering score
font = pygame.font.Font(None, 48)

# Game loop
clock = pygame.time.Clock()

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    keys = pygame.key.get_pressed()
    if keys[pygame.K_ESCAPE]:
        pygame.quit()
        sys.exit()
    if keys[pygame.K_RETURN]:
        reset_game()

    # Check for sound detection for jumping
    if is_sound_detected():
        bird_speed_y = jump_strength

    # Update bird position
    bird_speed_y += gravity
    bird_y += bird_speed_y
    bird_rect.y = bird_y

    # Move pipes
    for i in range(len(pipes)):
        pipes[i] = (pipes[i][0] - pipe_speed, pipes[i][1])

    # Add new pipes
    if pipes[0][0] < -pipe_width:
        pipes.pop(0)
        new_pipe = create_pipe(pipes[-1][0] + pipe_distance)
        pipes.append(new_pipe)

    # Check for collision with pipes or screen boundaries
    for pipe in pipes:
        pipe_rect_top = pygame.Rect(pipe[0], 0, pipe_width, pipe[1])
        pipe_rect_bottom = pygame.Rect(pipe[0], pipe[1] + pipe_gap, pipe_width, HEIGHT - pipe[1] - pipe_gap)
        if bird_rect.colliderect(pipe_rect_top) or bird_rect.colliderect(pipe_rect_bottom):
            reset_game()

    if bird_y <= 0 or bird_y >= HEIGHT:
        reset_game()

    # Increase score when the bird passes through pipes
    for pipe in pipes:
        if pipe[0] + pipe_width < bird_x and not pipe[0] + pipe_width < bird_x - pipe_speed:
            score += 1

    # Get camera frame and use it as the background
    camera_frame = get_camera_frame()
    if camera_frame is not None:
        screen.blit(camera_frame, (0, 0))

    # Draw pipes
    for pipe in pipes:
        pipe_rect_top = pygame.Rect(pipe[0], 0, pipe_width, pipe[1])
        pipe_rect_bottom = pygame.Rect(pipe[0], pipe[1] + pipe_gap, pipe_width, HEIGHT - pipe[1] - pipe_gap)
        pygame.draw.rect(screen, PIPE_COLOR, pipe_rect_top)
        pygame.draw.rect(screen, PIPE_COLOR, pipe_rect_bottom)

    # Draw the bird
    pygame.draw.ellipse(screen, YELLOW, bird_rect)

    # Draw score
    score_text = font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    # Update display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(60)

# Release the camera on exit
camera.release()
