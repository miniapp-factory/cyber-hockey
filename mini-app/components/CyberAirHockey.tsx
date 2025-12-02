"use client";

import { useEffect, useRef, useState } from "react";

const BOARD_SIZE = 480; // px, will scale with container
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 20;
const PUCK_SIZE = 20;
const PADDLE_RADIUS = 40;
const FPS = 60;

type Position = { x: number; y: number };

export default function CyberAirHockey() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paddlePos, setPaddlePos] = useState<Position>({ x: BOARD_SIZE / 2 - PADDLE_WIDTH / 2, y: BOARD_SIZE - PADDLE_HEIGHT - 10 });
  const [opponentPaddlePos, setOpponentPaddlePos] = useState<Position>({ x: BOARD_SIZE / 2 - PADDLE_WIDTH / 2, y: 10 });
  const prevPaddlePos = useRef<Position>(paddlePos);
  const prevOpponentPaddlePos = useRef<Position>(opponentPaddlePos);
  const [puckPos, setPuckPos] = useState<Position>({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
  const [puckVel, setPuckVel] = useState<Position>({ x: 2, y: 2 });
  const [score, setScore] = useState({ player: 0, enemy: 0 });

  // Resize canvas to fit container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth, parent.clientHeight);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const size = canvas.width;
      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, size, size);

      // Draw center line
      ctx.strokeStyle = "#00f";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw angled corner lines
      ctx.fillStyle = "#0f0";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.1, 0);
      ctx.lineTo(0, size * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(size * 0.9, 0);
      ctx.lineTo(size, size * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, size * 0.9);
      ctx.lineTo(size * 0.1, size);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size, size);
      ctx.lineTo(size, size * 0.9);
      ctx.lineTo(size * 0.9, size);
      ctx.closePath();
      ctx.fill();

      // Draw goals
      ctx.fillStyle = "#ff0";
      ctx.fillRect(size / 2 - 75, 0, 150, 5); // enemy goal
      ctx.fillRect(size / 2 - 75, size - 5, 150, 5); // player goal

      // Draw opponent paddle
      ctx.fillStyle = "#f0f";
      ctx.shadowColor = "#f0f";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(opponentPaddlePos.x + PADDLE_RADIUS, opponentPaddlePos.y + PADDLE_RADIUS, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw player paddle
      ctx.fillStyle = "#00f";
      ctx.shadowColor = "#00f";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(paddlePos.x + PADDLE_RADIUS, paddlePos.y + PADDLE_RADIUS, PADDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw puck
      ctx.fillStyle = "#f0f";
      ctx.shadowColor = "#f0f";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(puckPos.x, puckPos.y, PUCK_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Score HUD
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Enemy: ${score.enemy}`, size / 4, 30);
      ctx.fillText(`Player: ${score.player}`, (size * 3) / 4, size - 10);
    };

    const update = () => {
      // Move puck
      setPuckPos((prev) => ({
        x: prev.x + puckVel.x,
        y: prev.y + puckVel.y,
      }));

      // Collision with walls
      setPuckVel((prev) => {
        let nx = prev.x;
        let ny = prev.y;
        if (puckPos.x <= PUCK_SIZE / 2 || puckPos.x >= BOARD_SIZE - PUCK_SIZE / 2) nx = -prev.x;
        if (puckPos.y <= PUCK_SIZE / 2 || puckPos.y >= BOARD_SIZE - PUCK_SIZE / 2) ny = -prev.y;
        return { x: nx, y: ny };
      });

      // Collision with paddles
      const paddleCollision = (paddle: Position) => {
        const dx = puckPos.x - (paddle.x + PADDLE_RADIUS);
        const dy = puckPos.y - (paddle.y + PADDLE_RADIUS);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < PUCK_SIZE / 2 + PADDLE_RADIUS;
      };

      if (paddleCollision(paddlePos) || paddleCollision(opponentPaddlePos)) {
        const paddle = paddleCollision(paddlePos) ? paddlePos : opponentPaddlePos;
        const prevPaddle = paddleCollision(paddlePos) ? prevPaddlePos.current : prevOpponentPaddlePos.current;
        const paddleSpeed = Math.hypot(paddle.x - prevPaddle.x, paddle.y - prevPaddle.y);
        const angle = Math.atan2(puckPos.y - (paddle.y + PADDLE_RADIUS), puckPos.x - (paddle.x + PADDLE_RADIUS));
        const speed = Math.hypot(puckVel.x, puckVel.y) + paddleSpeed * 0.5;
        setPuckVel({
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        });
      }
      const cornerCollision = () => {
        const corners = [
          { x: 0, y: 0 },
          { x: BOARD_SIZE, y: 0 },
          { x: 0, y: BOARD_SIZE },
          { x: BOARD_SIZE, y: BOARD_SIZE },
        ];
        for (const corner of corners) {
          const dx = puckPos.x - corner.x;
          const dy = puckPos.y - corner.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < PUCK_SIZE / 2 + 10) {
            setPuckVel((prev) => ({ x: -prev.x, y: -prev.y }));
            break;
          }
        }
      };
      cornerCollision();

      // Goal detection
      if (puckPos.y <= PUCK_SIZE / 2) {
        setScore((s) => ({ ...s, enemy: s.enemy + 1 }));
        resetPuck();
      } else if (puckPos.y >= BOARD_SIZE - PUCK_SIZE / 2) {
        setScore((s) => ({ ...s, player: s.player + 1 }));
        resetPuck();
      }
    };

    const resetPuck = () => {
      setPuckPos({ x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
      setPuckVel({ x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 });
    };

    const loop = () => {
      update();
      draw();
    };

    const interval = setInterval(loop, 1000 / FPS);
    return () => clearInterval(interval);
  }, [puckPos, puckVel, score]);

// AI: move opponent paddle towards puck within its half
useEffect(() => {
  const targetX = Math.max(0, Math.min(puckPos.x - PADDLE_RADIUS, BOARD_SIZE - PADDLE_WIDTH));
  setOpponentPaddlePos((prev) => {
    const newPos = { ...prev, x: targetX };
    prevOpponentPaddlePos.current = prev;
    return newPos;
  });
}, [puckPos]);

// Update previous paddle positions after each render
useEffect(() => {
  prevPaddlePos.current = paddlePos;
  prevOpponentPaddlePos.current = opponentPaddlePos;
}, [paddlePos, opponentPaddlePos]);

  // Drag handling
  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - PADDLE_WIDTH / 2;
    const y = e.clientY - rect.top - PADDLE_HEIGHT / 2;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPaddlePos({
      x: Math.max(0, Math.min(x, canvas.width - PADDLE_WIDTH)),
      y: Math.max(canvas.width / 2, Math.min(y, canvas.width - PADDLE_HEIGHT)),
    });
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="border-2 border-white rounded-lg"
        onPointerDown={handlePointerMove}
        onPointerMove={handlePointerMove}
      />
    </div>
  );
}
