import pygame
import sys
import random

# Initialize Pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.FULLSCREEN)
pygame.display.set_caption("Endless Platform Game")

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GRID_COLOR = (50, 50, 50)
GROUND_COLOR = (0, 255, 0)  # Color for the ground platform

# Game properties
ball_size = 30
gravity = 0.5
jump_strength = -20
move_speed = 5
platform_width = 100
platform_height = 20
ground_height = 50
platform_move_speed = 2  # Speed at which moving platforms move
platform_move_range = 100  # Range for moving platforms
grid_size = 40  # Size of the grid cells

# Initialize game state
def reset_game():
    global ball_x, ball_y, ball_speed_x, ball_speed_y, ball_rect
    global ground_rect, platforms, camera_x, start_x
    global is_jumping, stepped_on_platforms, score, platform_landing_state

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
    for x in range(0, WIDTH + platform_width * 2, platform_width * 3):
        y = HEIGHT - ground_height - random.randint(20, 150)
        if random.random() < 0.7:
            platforms.append(create_moving_platform(x, y))
        else:
            platforms.append(create_platform(x, y))

    camera_x = 0
    is_jumping = False
    stepped_on_platforms = set()  # Set to keep track of platform identifiers
    score = 0
    platform_landing_state = {}  # Dictionary to track landing status of each platform

    # Track the starting X position of the ball
    start_x = ball_rect.x

def create_platform(x, y):
    return pygame.Rect(x, y, platform_width, platform_height)

def create_moving_platform(x, y):
    return {'rect': pygame.Rect(x, y, platform_width, platform_height),
            'direction': random.choice([-1, 1]),  # -1 or 1 for horizontal movement
            'move_range': platform_move_range,
            'initial_x': x}  # Store initial x for movement range calculations

def add_platform():
    if len(platforms) > 0:
        last_platform = platforms[-1]
        new_x = last_platform['rect'].right + random.randint(150, 300) if isinstance(last_platform, dict) else last_platform.right + random.randint(150, 300)
        new_y = HEIGHT - ground_height - random.randint(20, 150)
        if random.random() < 0.3:  # 30% chance to create a moving platform
            platforms.append(create_moving_platform(new_x, new_y))
        else:
            platforms.append(create_platform(new_x, new_y))

def scroll_platforms(camera_x):
    global platforms
    new_platforms = []
    for platform in platforms:
        if isinstance(platform, dict):  # Moving platform
            # Move platform horizontally
            platform['rect'].x += platform['direction'] * platform_move_speed
            # Reverse direction if platform is out of bounds
            if platform['rect'].x < platform['initial_x'] - platform['move_range'] or platform['rect'].x > platform['initial_x'] + platform['move_range']:
                platform['direction'] *= -1
        if isinstance(platform, pygame.Rect):
            if platform.right > camera_x - WIDTH:
                new_platforms.append(platform)
        elif isinstance(platform, dict):
            if platform['rect'].right > camera_x - WIDTH:
                new_platforms.append(platform)
    platforms = new_platforms

def update_score():
    global score
    # Calculate distance traveled from the starting position
    distance_moved = (ball_rect.x - start_x) // 10  # Dividing by 10 to scale the distance
    score = max(distance_moved, 0)

def draw_grid():
    for x in range(0, WIDTH, grid_size):
        pygame.draw.line(screen, GRID_COLOR, (x, 0), (x, HEIGHT))
    for y in range(0, HEIGHT, grid_size):
        pygame.draw.line(screen, GRID_COLOR, (0, y), (WIDTH, y))

# Initialize game state
platforms = []
stepped_on_platforms = set()
score = 0
platform_landing_state = {}
start_x = 0
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
    if keys[pygame.K_ESCAPE]:
        pygame.quit()
        sys.exit()
    if keys[pygame.K_RETURN]:
        reset_game()

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
        if isinstance(platform, pygame.Rect):
            # Static platform
            if ball_rect.colliderect(platform):
                if ball_speed_y > 0:  # falling down
                    ball_rect.bottom = platform.top
                    ball_speed_y = 0
                    is_jumping = False
                    platform_id = (platform.left, platform.top)
                    if platform_id not in stepped_on_platforms:
                        stepped_on_platforms.add(platform_id)
                        update_score()
                        platform_landing_state[platform_id] = True
                elif ball_speed_y < 0:  # jumping up
                    ball_rect.top = platform.bottom
                    ball_speed_y = 0

                # Prevent falling off the sides of the platform
                if ball_speed_x > 0 and ball_rect.right > platform.right:
                    ball_rect.right = platform.right
                elif ball_speed_x < 0 and ball_rect.left < platform.left:
                    ball_rect.left = platform.left

        elif isinstance(platform, dict):
            # Moving platform
            platform_rect = platform['rect']
            if ball_rect.colliderect(platform_rect):
                if ball_speed_y > 0:  # falling down
                    ball_rect.bottom = platform_rect.top
                    ball_speed_y = 0
                    is_jumping = False
                    platform_id = (platform_rect.left, platform_rect.top)
                    if platform_id not in stepped_on_platforms:
                        stepped_on_platforms.add(platform_id)
                        update_score()
                        platform_landing_state[platform_id] = True
                elif ball_speed_y < 0:  # jumping up
                    ball_rect.top = platform_rect.bottom
                    ball_speed_y = 0

                # Prevent falling off the sides of the platform
                if ball_speed_x > 0 and ball_rect.right > platform_rect.right:
                    ball_rect.right = platform_rect.right
                elif ball_speed_x < 0 and ball_rect.left < platform_rect.left:
                    ball_rect.left = platform_rect.left

    # Remove the platform landing state after one frame to prevent rapid score increase
    for platform_id in list(platform_landing_state.keys()):
        platform_landing_state[platform_id] = False

    # Add new platforms if needed
    last_platform = platforms[-1]
    if isinstance(last_platform, dict):
        if last_platform['rect'].right < camera_x + WIDTH:
            add_platform()
    else:
        if last_platform.right < camera_x + WIDTH:
            add_platform()

    # Clear the screen
    screen.fill(BLACK)

    # Draw the grid
    draw_grid()

    # Draw the ground platform
    pygame.draw.rect(screen, GROUND_COLOR, ground_rect.move(-camera_x, 0))

    # Draw platforms, ground, and ball
    for platform in platforms:
        if isinstance(platform, pygame.Rect):
            pygame.draw.rect(screen, WHITE, platform.move(-camera_x, 0))
        elif isinstance(platform, dict):
            pygame.draw.rect(screen, WHITE, platform['rect'].move(-camera_x, 0))
    
    pygame.draw.ellipse(screen, RED, ball_rect.move(-camera_x, 0))

    # Draw score
    score_text = font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    # Update display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(60)
