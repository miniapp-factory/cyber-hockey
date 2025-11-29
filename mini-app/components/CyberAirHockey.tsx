"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";


export interface PuckType {
  id: string;
  type: "std" | "bonus" | "curse";
  speed: number;
  radius: number;
}

export interface PowerUpDef {
  id: string;
  type: "enlarge" | "shrink" | "spike" | "freeze" | "multiball";
  duration: number;
  effect: EffectState;
}

export interface Point {
  x: number;
  y: number;
}

export interface EffectState {
  active: boolean;
  remaining: number;
}

export interface Entity {
  id: string;
  position: Point;
  velocity: Point;
  radius: number;
}

export interface Puck extends Entity {
  puckType: PuckType;
}

export interface ActivePowerUp extends PowerUpDef {
  appliedAt: number;
}

export interface Particle extends Entity {
  life: number;
  color: string;
}

export interface SpriteCacheItem {
  key: string;
  image: HTMLImageElement;
}

export interface GameState {
  puck: Puck;
  paddles: Entity[];
  powerUps: ActivePowerUp[];
  particles: Particle[];
  score: { left: number; right: number };
  difficulty: keyof typeof CONSTANTS.DIFFICULTIES;
}

export interface WinnerState {
  winner: "left" | "right" | "draw";
  score: number;
}

export const CONSTANTS = {
  physics: {
    friction: 0.98,
    maxSpeed: 15,
    dimensions: { width: 800, height: 400 },
  },
  DIFFICULTIES: {
    easy: { puckSpeed: 8, paddleSpeed: 5 },
    medium: { puckSpeed: 12, paddleSpeed: 7 },
    hard: { puckSpeed: 16, paddleSpeed: 9 },
  },
  PUCK_TYPES: {
    std: { radius: 15, speed: 10 },
    bonus: { radius: 12, speed: 12 },
    curse: { radius: 18, speed: 8 },
  },
  POWERUP_TYPES: {
    enlarge: { duration: 5000 },
    shrink: { duration: 5000 },
    spike: { duration: 3000 },
    freeze: { duration: 4000 },
    multiball: { duration: 0 },
  },
  COLORS: {
    primary: "#00f",
    secondary: "#f0f",
    background: "#111",
    text: "#eee",
  },
};

export default function CyberAirHockey() {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>({} as any);

  // State
  const [uiState, setUiState] = useState<'mechanics' | 'menu' | 'playing' | 'gameover'>('menu');
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [notification, setNotification] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<keyof typeof CONSTANTS.DIFFICULTIES>('medium');
  const [matchMinutes, setMatchMinutes] = useState(5);
  const [winner, setWinner] = useState<WinnerState | null>(null);

  // Helper: getCachedSprite
  const getCachedSprite = useCallback((type: 'puck' | 'paddle', radius: number, color: string) => {
    const key = `${type}-${radius}-${color}`;
    const cache = (gameStateRef.current as any);
    if (!cache.spriteCache) cache.spriteCache = new Map<string, HTMLCanvasElement>();
    if (cache.spriteCache.has(key)) return cache.spriteCache.get(key)!;
    const canvas = document.createElement('canvas');
    canvas.width = radius * 2;
    canvas.height = radius * 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
    cache.spriteCache.set(key, canvas);
    return canvas;
  }, []);

  // Pre-render board
  const preRenderBoard = useCallback(() => {
    const staticCanvas = staticCanvasRef.current;
    if (!staticCanvas) return;
    const ctx = staticCanvas.getContext('2d')!;
    const { width, height } = CONSTANTS.physics.dimensions;
    staticCanvas.width = width;
    staticCanvas.height = height;
    ctx.fillStyle = CONSTANTS.COLORS.background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = CONSTANTS.COLORS.text;
    ctx.lineWidth = 2;
    // center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    // goals
    const goalWidth = 100;
    ctx.fillStyle = CONSTANTS.COLORS.primary;
    ctx.fillRect(0, (height - goalWidth) / 2, 10, goalWidth);
    ctx.fillRect(width - 10, (height - goalWidth) / 2, 10, goalWidth);
  }, []);

  // Draw active effect
  const drawActiveEffect = (ctx: CanvasRenderingContext2D, entity: Entity, angle: number) => {
    ctx.save();
    ctx.translate(entity.position.x, entity.position.y);
    ctx.rotate(angle);
    ctx.strokeStyle = CONSTANTS.COLORS.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  // Main draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height } = CONSTANTS.physics.dimensions;
    canvas.width = width;
    canvas.height = height;
    // clear
    ctx.clearRect(0, 0, width, height);
    // draw static board
    const staticCanvas = staticCanvasRef.current;
    if (staticCanvas) ctx.drawImage(staticCanvas, 0, 0);
    const state = gameStateRef.current;
    // draw active power-ups
    state.powerUps.forEach((pu) => {
      ctx.fillStyle = 'rgba(255,255,0,0.5)';
      ctx.beginPath();
      ctx.arc(pu.position.x, pu.position.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.font = '12px sans-serif';
      ctx.fillText(pu.type, pu.position.x - 10, pu.position.y + 4);
    });
    // draw particles
    state.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.position.x, p.position.y, 4, 4);
    });
    // draw paddles
    state.paddles.forEach((paddle) => {
      const sprite = getCachedSprite('paddle', paddle.radius, CONSTANTS.COLORS.primary);
      ctx.drawImage(sprite, paddle.position.x - paddle.radius, paddle.position.y - paddle.radius);
      if ((paddle as any).activeEffect) drawActiveEffect(ctx, paddle, (paddle as any).activeEffect.angle);
    });
    // draw puck
    const puck = state.puck;
    const puckSprite = getCachedSprite('puck', puck.radius, CONSTANTS.COLORS.secondary);
    ctx.drawImage(puckSprite, puck.position.x - puck.radius, puck.position.y - puck.radius);
    if ((puck as any).activeEffect) drawActiveEffect(ctx, puck, (puck as any).activeEffect.angle);
  }, [getCachedSprite]);

  // Update placeholder
  const update = useCallback(() => {
    // TODO: implement game logic
  }, []);

  // Game loop
  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  // Start game
  const startGame = () => {
    setUiState('playing');
    preRenderBoard();
    // TODO: initialize game state
  };

  // Effect to run loop
  useEffect(() => {
    if (uiState === 'playing') {
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [uiState, loop]);

  return (
    <div>
      <canvas ref={canvasRef} />
      <canvas ref={staticCanvasRef} style={{ display: 'none' }} />
      <button onClick={startGame}>Start</button>
    </div>
  );
}
