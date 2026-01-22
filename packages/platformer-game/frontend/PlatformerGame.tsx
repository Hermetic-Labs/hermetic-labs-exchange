import { useEffect, useRef, useState, useCallback } from 'react';

// Mobile touch input state (shared between React and game loop)
const touchInput = { left: false, right: false, jump: false };

// Game Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const ENEMY_SPEED = 1.5;
const TILE_SIZE = 32;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 32;

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'brick' | 'question';
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  alive: boolean;
  startX: number;
  range: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 });

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const aspectRatio = 800 / 480; // Original aspect ratio
      const maxWidth = container.clientWidth - 32; // Account for padding
      const maxHeight = window.innerHeight - 200; // Leave room for header/controls

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CANVAS_WIDTH = canvasSize.width;
    const CANVAS_HEIGHT = canvasSize.height;
    const SCALE = canvasSize.width / 800; // Scale factor for game elements
    const LEVEL_WIDTH = 3200 * SCALE;

    // Player state
    const player = {
      x: 100,
      y: 300,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
    };

    let cameraX = 0;
    let currentScore = 0;
    let isGrounded = false;

    // Input state
    const keys: { [key: string]: boolean } = {};

    // Level design - platforms
    const platforms: Platform[] = [
      // Ground sections with gaps
      { x: 0, y: 416, width: 640, height: 64, type: 'ground' },
      { x: 720, y: 416, width: 480, height: 64, type: 'ground' },
      { x: 1280, y: 416, width: 320, height: 64, type: 'ground' },
      { x: 1680, y: 416, width: 640, height: 64, type: 'ground' },
      { x: 2400, y: 416, width: 800, height: 64, type: 'ground' },

      // Floating platforms - bricks and question blocks
      { x: 256, y: 288, width: 32, height: 32, type: 'question' },
      { x: 320, y: 288, width: 96, height: 32, type: 'brick' },
      { x: 448, y: 288, width: 32, height: 32, type: 'question' },

      { x: 560, y: 192, width: 128, height: 32, type: 'brick' },

      { x: 800, y: 320, width: 128, height: 32, type: 'brick' },
      { x: 960, y: 256, width: 32, height: 32, type: 'question' },

      { x: 1120, y: 320, width: 96, height: 32, type: 'brick' },

      { x: 1360, y: 288, width: 160, height: 32, type: 'brick' },
      { x: 1440, y: 192, width: 32, height: 32, type: 'question' },

      { x: 1760, y: 320, width: 128, height: 32, type: 'brick' },
      { x: 1920, y: 256, width: 96, height: 32, type: 'brick' },
      { x: 2048, y: 192, width: 64, height: 32, type: 'brick' },

      { x: 2240, y: 320, width: 96, height: 32, type: 'brick' },

      // Stair blocks near flag
      { x: 2720, y: 384, width: 32, height: 32, type: 'brick' },
      { x: 2752, y: 352, width: 32, height: 64, type: 'brick' },
      { x: 2784, y: 320, width: 32, height: 96, type: 'brick' },
      { x: 2816, y: 288, width: 32, height: 128, type: 'brick' },
    ];

    // Coins
    const coins: Coin[] = [
      { x: 272, y: 256, collected: false },
      { x: 352, y: 256, collected: false },
      { x: 400, y: 256, collected: false },
      { x: 464, y: 256, collected: false },
      { x: 608, y: 160, collected: false },
      { x: 832, y: 288, collected: false },
      { x: 880, y: 288, collected: false },
      { x: 976, y: 224, collected: false },
      { x: 1152, y: 288, collected: false },
      { x: 1392, y: 256, collected: false },
      { x: 1440, y: 160, collected: false },
      { x: 1488, y: 256, collected: false },
      { x: 1792, y: 288, collected: false },
      { x: 1952, y: 224, collected: false },
      { x: 2080, y: 160, collected: false },
      { x: 2272, y: 288, collected: false },
      { x: 2320, y: 288, collected: false },
    ];

    // Enemies
    const enemies: Enemy[] = [
      { x: 400, y: 384, width: 28, height: 28, vx: ENEMY_SPEED, alive: true, startX: 320, range: 200 },
      { x: 800, y: 384, width: 28, height: 28, vx: -ENEMY_SPEED, alive: true, startX: 720, range: 200 },
      { x: 1000, y: 384, width: 28, height: 28, vx: ENEMY_SPEED, alive: true, startX: 900, range: 180 },
      { x: 1400, y: 256, width: 28, height: 28, vx: ENEMY_SPEED, alive: true, startX: 1360, range: 140 },
      { x: 1800, y: 384, width: 28, height: 28, vx: -ENEMY_SPEED, alive: true, startX: 1680, range: 280 },
      { x: 2100, y: 384, width: 28, height: 28, vx: ENEMY_SPEED, alive: true, startX: 2050, range: 200 },
      { x: 2500, y: 384, width: 28, height: 28, vx: -ENEMY_SPEED, alive: true, startX: 2400, range: 250 },
    ];

    // Flag position
    const flagX = 2960;
    const flagY = 192;

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let gameOver = false;
    let won = false;

    // Collision detection
    const rectCollision = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    };

    // Draw pixel art character
    const drawPlayer = (x: number, y: number) => {
      const px = x - cameraX;
      // Body (red)
      ctx.fillStyle = '#E52521';
      ctx.fillRect(px + 4, y + 12, 20, 12);
      // Overalls (blue)
      ctx.fillStyle = '#0D47A1';
      ctx.fillRect(px + 4, y + 24, 20, 8);
      // Head (skin)
      ctx.fillStyle = '#FFB74D';
      ctx.fillRect(px + 6, y + 2, 16, 10);
      // Hat (red)
      ctx.fillStyle = '#E52521';
      ctx.fillRect(px + 4, y, 20, 6);
      ctx.fillRect(px + 2, y + 4, 6, 4);
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 10, y + 6, 3, 3);
      ctx.fillRect(px + 17, y + 6, 3, 3);
      // Mustache
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(px + 8, y + 10, 12, 2);
    };

    // Draw enemy (goomba-style)
    const drawEnemy = (enemy: Enemy) => {
      if (!enemy.alive) return;
      const px = enemy.x - cameraX;
      // Body (brown)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(px, enemy.y + 4, enemy.width, enemy.height - 4);
      // Head
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(px + 2, enemy.y, enemy.width - 4, 12);
      // Eyes (angry)
      ctx.fillStyle = '#FFF';
      ctx.fillRect(px + 4, enemy.y + 4, 6, 6);
      ctx.fillRect(px + 18, enemy.y + 4, 6, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 6, enemy.y + 6, 3, 3);
      ctx.fillRect(px + 20, enemy.y + 6, 3, 3);
      // Feet
      ctx.fillStyle = '#000';
      ctx.fillRect(px + 2, enemy.y + enemy.height - 4, 8, 4);
      ctx.fillRect(px + 18, enemy.y + enemy.height - 4, 8, 4);
    };

    // Draw coin
    const drawCoin = (coin: Coin) => {
      if (coin.collected) return;
      const px = coin.x - cameraX;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(px + 12, coin.y + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(px + 12, coin.y + 12, 6, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw platform
    const drawPlatform = (platform: Platform) => {
      const px = platform.x - cameraX;
      if (px > CANVAS_WIDTH || px + platform.width < 0) return;

      if (platform.type === 'ground') {
        // Ground - brown with grass on top
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(px, platform.y, platform.width, platform.height);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(px, platform.y, platform.width, 8);
        // Grid lines
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        for (let i = 0; i < platform.width; i += TILE_SIZE) {
          ctx.strokeRect(px + i, platform.y + 8, TILE_SIZE, TILE_SIZE - 8);
        }
      } else if (platform.type === 'brick') {
        // Brick block
        ctx.fillStyle = '#C84C0C';
        ctx.fillRect(px, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#8B2500';
        ctx.lineWidth = 2;
        for (let i = 0; i < platform.width; i += TILE_SIZE) {
          ctx.strokeRect(px + i + 2, platform.y + 2, TILE_SIZE - 4, platform.height - 4);
          // Brick pattern
          ctx.strokeRect(px + i + 2, platform.y + 2, (TILE_SIZE - 4) / 2, (platform.height - 4) / 2);
        }
      } else if (platform.type === 'question') {
        // Question block
        ctx.fillStyle = '#FFB300';
        ctx.fillRect(px, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, platform.y + 2, platform.width - 4, platform.height - 4);
        // Question mark
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('?', px + 8, platform.y + 24);
      }
    };

    // Draw flag
    const drawFlag = () => {
      const px = flagX - cameraX;
      // Pole
      ctx.fillStyle = '#228B22';
      ctx.fillRect(px, flagY, 8, 224);
      // Flag
      ctx.fillStyle = '#E52521';
      ctx.beginPath();
      ctx.moveTo(px + 8, flagY);
      ctx.lineTo(px + 56, flagY + 24);
      ctx.lineTo(px + 8, flagY + 48);
      ctx.closePath();
      ctx.fill();
      // Ball on top
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(px + 4, flagY - 8, 8, 0, Math.PI * 2);
      ctx.fill();
    };

    // Game loop
    const gameLoop = () => {
      if (gameOver || won) return;

      // Clear canvas
      ctx.fillStyle = '#5C94FC';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw clouds
      ctx.fillStyle = '#FFF';
      for (let i = 0; i < LEVEL_WIDTH; i += 400) {
        const cx = i - (cameraX * 0.3) % 400;
        ctx.beginPath();
        ctx.arc(cx + 30, 60, 25, 0, Math.PI * 2);
        ctx.arc(cx + 60, 50, 30, 0, Math.PI * 2);
        ctx.arc(cx + 90, 60, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw hills in background
      ctx.fillStyle = '#3CB371';
      for (let i = 0; i < LEVEL_WIDTH; i += 600) {
        const hx = i - (cameraX * 0.5);
        ctx.beginPath();
        ctx.arc(hx + 100, 416, 80, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx + 300, 416, 50, Math.PI, 0);
        ctx.fill();
      }

      // Player movement
      player.vx = 0;
      if (keys['ArrowLeft'] || keys['KeyA'] || touchInput.left) player.vx = -MOVE_SPEED;
      if (keys['ArrowRight'] || keys['KeyD'] || touchInput.right) player.vx = MOVE_SPEED;
      if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchInput.jump) && isGrounded) {
        player.vy = JUMP_FORCE;
        isGrounded = false;
      }

      // Apply gravity
      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      // Platform collision
      isGrounded = false;
      for (const platform of platforms) {
        if (rectCollision(player, platform)) {
          // Coming from above
          if (player.vy > 0 && player.y + player.height - player.vy <= platform.y + 5) {
            player.y = platform.y - player.height;
            player.vy = 0;
            isGrounded = true;
          }
          // Coming from below
          else if (player.vy < 0 && player.y - player.vy >= platform.y + platform.height - 5) {
            player.y = platform.y + platform.height;
            player.vy = 0;
          }
          // Coming from left
          else if (player.vx > 0 && player.x + player.width - player.vx <= platform.x + 5) {
            player.x = platform.x - player.width;
          }
          // Coming from right
          else if (player.vx < 0 && player.x - player.vx >= platform.x + platform.width - 5) {
            player.x = platform.x + platform.width;
          }
        }
      }

      // Boundary check
      if (player.x < 0) player.x = 0;
      if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;

      // Fall into pit
      if (player.y > CANVAS_HEIGHT) {
        gameOver = true;
        setGameState('lost');
        return;
      }

      // Update camera
      cameraX = Math.max(0, Math.min(player.x - CANVAS_WIDTH / 3, LEVEL_WIDTH - CANVAS_WIDTH));

      // Coin collection
      for (const coin of coins) {
        if (!coin.collected && rectCollision(player, { x: coin.x, y: coin.y, width: 24, height: 24 })) {
          coin.collected = true;
          currentScore += 100;
          setScore(currentScore);
        }
      }

      // Enemy update and collision
      for (const enemy of enemies) {
        if (!enemy.alive) continue;

        enemy.x += enemy.vx;
        if (enemy.x < enemy.startX || enemy.x > enemy.startX + enemy.range) {
          enemy.vx = -enemy.vx;
        }

        if (rectCollision(player, enemy)) {
          // Jumped on enemy
          if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2 + 10) {
            enemy.alive = false;
            player.vy = JUMP_FORCE / 2;
            currentScore += 200;
            setScore(currentScore);
          } else {
            // Hit from side
            gameOver = true;
            setGameState('lost');
            return;
          }
        }
      }

      // Check win condition (reach flag)
      if (player.x + player.width >= flagX) {
        won = true;
        setGameState('won');
        return;
      }

      // Draw platforms
      for (const platform of platforms) {
        drawPlatform(platform);
      }

      // Draw coins
      for (const coin of coins) {
        drawCoin(coin);
      }

      // Draw enemies
      for (const enemy of enemies) {
        drawEnemy(enemy);
      }

      // Draw flag
      drawFlag();

      // Draw player
      drawPlayer(player.x, player.y);

      // Draw score
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`SCORE: ${currentScore}`, 20, 40);

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, canvasSize]);

  const restartGame = () => {
    setScore(0);
    setGameState('playing');
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 w-full">
      <h1 className="text-2xl sm:text-4xl font-bold text-yellow-400 mb-4 tracking-wider" style={{ fontFamily: 'Arial Black, sans-serif' }}>
        SUPER PLATFORMER
      </h1>
      <div className="relative w-full flex justify-center">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="border-4 border-yellow-500 rounded-lg shadow-2xl"
          style={{ touchAction: 'none' }}
        />
        {/* Mobile Touch Controls */}
        <div className="absolute bottom-4 left-4 flex gap-2 md:hidden">
          <button
            className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-white/50 select-none"
            onTouchStart={(e) => { e.preventDefault(); touchInput.left = true; }}
            onTouchEnd={() => { touchInput.left = false; }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-white/50 select-none"
            onTouchStart={(e) => { e.preventDefault(); touchInput.right = true; }}
            onTouchEnd={() => { touchInput.right = false; }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-4 right-4 md:hidden">
          <button
            className="w-20 h-20 bg-yellow-500/50 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-yellow-500/70 select-none"
            onTouchStart={(e) => { e.preventDefault(); touchInput.jump = true; }}
            onTouchEnd={() => { touchInput.jump = false; }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
            <h2 className={`text-5xl font-bold mb-4 ${gameState === 'won' ? 'text-green-400' : 'text-red-500'}`}>
              {gameState === 'won' ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            <p className="text-white text-2xl mb-6">Final Score: {score}</p>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-lg transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 text-gray-400 text-center">
        <p className="text-lg mb-2">Controls:</p>
        <p>Arrow Keys / WASD - Move | Space / Up - Jump</p>
        <p className="mt-2 text-yellow-500">Collect coins, defeat enemies by jumping on them, reach the flag!</p>
      </div>
    </div>
  );
}

export default App;
