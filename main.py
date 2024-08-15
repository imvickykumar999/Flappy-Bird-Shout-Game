import pygame
import sys
import random

# Initialize Pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Endless Platform Game")

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)

# Game properties
ball_size = 30
gravity = 0.5
jump_strength = -15
move_speed = 5
platform_width = 100
platform_height = 20
ground_height = 50

# Initialize game state
def reset_game():
    global ball_x, ball_y, ball_speed_x, ball_speed_y, ball_rect
    global ground_rect, platforms, camera_x
    global is_jumping, stepped_on_platforms, score

    # Ball properties
    ball_x = WIDTH // 2
    ball_y = HEIGHT // 2
    ball_speed_x = 0
    ball_speed_y = 0
    ball_rect = pygame.Rect(ball_x, ball_y, ball_size, ball_size)

    # Ground properties
    ground_rect = pygame.Rect(0, HEIGHT - ground_height, WIDTH, ground_height)

    # Platform properties
    platforms.clear()
    for x in range(0, WIDTH + platform_width, platform_width):
        y = HEIGHT - ground_height - random.randint(20, 150)
        platforms.append(create_platform(x, y))

    camera_x = 0
    is_jumping = False
    stepped_on_platforms = set()  # Set to keep track of platform identifiers
    score = 0

def create_platform(x, y):
    return pygame.Rect(x, y, platform_width, platform_height)

def add_platform():
    if len(platforms) > 0:
        last_platform = platforms[-1]
        new_x = last_platform.right + random.randint(50, 200)
        new_y = HEIGHT - ground_height - random.randint(20, 150)
        platforms.append(create_platform(new_x, new_y))

def scroll_platforms(camera_x):
    global platforms
    new_platforms = []
    for platform in platforms:
        if platform.right > camera_x - WIDTH:
            new_platforms.append(platform)
    platforms = new_platforms

def update_score():
    global score
    score = len(stepped_on_platforms)

# Initialize game state
platforms = []
stepped_on_platforms = set()
score = 0
reset_game()

# Font for rendering score
font = pygame.font.Font(None, 36)

# Game loop
clock = pygame.time.Clock()

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    keys = pygame.key.get_pressed()
    if (keys[pygame.K_w] or keys[pygame.K_SPACE]) and not is_jumping:
        ball_speed_y = jump_strength
        is_jumping = True
    if keys[pygame.K_a]:
        ball_speed_x = -move_speed
    elif keys[pygame.K_d]:
        ball_speed_x = move_speed
    else:
        ball_speed_x = 0

    # Update ball position
    ball_speed_y += gravity
    ball_rect.x += ball_speed_x
    ball_rect.y += ball_speed_y

    # Move camera with ball
    camera_x += ball_speed_x
    scroll_platforms(camera_x)

    # Check collision with ground
    if ball_rect.colliderect(ground_rect):
        ball_rect.bottom = ground_rect.top
        ball_speed_y = 0
        is_jumping = False

    # Check collision with platforms
    for platform in platforms:
        if ball_rect.colliderect(platform):
            if ball_speed_y > 0:  # falling down
                ball_rect.bottom = platform.top
                ball_speed_y = 0
                is_jumping = False
                platform_id = (platform.left, platform.top)
                if platform_id not in stepped_on_platforms:
                    stepped_on_platforms.add(platform_id)
                    update_score()
            elif ball_speed_y < 0:  # jumping up
                ball_rect.top = platform.bottom
                ball_speed_y = 0

            # Prevent falling off the sides of the platform
            if ball_speed_x > 0 and ball_rect.right > platform.right:
                ball_rect.right = platform.right
            elif ball_speed_x < 0 and ball_rect.left < platform.left:
                ball_rect.left = platform.left

    # Add new platforms if needed
    if platforms[-1].right < camera_x + WIDTH:
        add_platform()

    # Handle game restart
    if keys[pygame.K_ESCAPE]:
        reset_game()

    # Clear the screen
    screen.fill(BLACK)

    # Draw platforms, ground, and ball
    for platform in platforms:
        pygame.draw.rect(screen, WHITE, platform.move(-camera_x, 0))
    pygame.draw.ellipse(screen, RED, ball_rect.move(-camera_x, 0))

    # Draw score
    score_text = font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    # Update display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(60)
