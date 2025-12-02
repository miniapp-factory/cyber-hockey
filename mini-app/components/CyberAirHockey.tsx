"use client";

import { useEffect, useRef, useState } from "react";

const BOARD_SIZE = 480; // px, will scale with container
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 20;
const PUCK_SIZE = 30;
const PADDLE_RADIUS = 40;
const FPS = 60;
const AI_SPEED = 4;

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
  const [winner, setWinner] = useState<string | null>(null);

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
      ctx.fillRect(size / 2 - 75, 0, 150, 10); // enemy goal
      ctx.fillRect(size / 2 - 75, size - 10, 150, 10); // player goal

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
      const newPos = {
        x: puckPos.x + puckVel.x,
        y: puckPos.y + puckVel.y,
      };

      // Collision with walls
      let newVel = { ...puckVel };
      if (newPos.x <= PUCK_SIZE / 2 || newPos.x >= canvas.width - PUCK_SIZE / 2) {
        newVel.x = -newVel.x * 0.8;
        newPos.x = newPos.x <= PUCK_SIZE / 2 ? PUCK_SIZE / 2 : canvas.width - PUCK_SIZE / 2;
      }
      if (newPos.y <= PUCK_SIZE / 2 || newPos.y >= canvas.height - PUCK_SIZE / 2) {
        newVel.y = -newVel.y * 0.8;
        newPos.y = newPos.y <= PUCK_SIZE / 2 ? PUCK_SIZE / 2 : canvas.height - PUCK_SIZE / 2;
      }

      // Collision with paddles
      const paddleCollision = (paddle: Position) => {
        const dx = newPos.x - (paddle.x + PADDLE_RADIUS);
        const dy = newPos.y - (paddle.y + PADDLE_RADIUS);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < PUCK_SIZE / 2 + PADDLE_RADIUS;
      };

      if (paddleCollision(paddlePos) || paddleCollision(opponentPaddlePos)) {
        const paddle = paddleCollision(paddlePos) ? paddlePos : opponentPaddlePos;
        const prevPaddle = paddleCollision(paddlePos) ? prevPaddlePos.current : prevOpponentPaddlePos.current;
        const paddleSpeed = Math.hypot(paddle.x - prevPaddle.x, paddle.y - prevPaddle.y);
        const angle = Math.atan2(newPos.y - (paddle.y + PADDLE_RADIUS), newPos.x - (paddle.x + PADDLE_RADIUS));
        const speed = Math.hypot(newVel.x, newVel.y) + paddleSpeed * 0.5;
        newVel = {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        };
      }

      // Corner collision
      const corners = [
        { x: 0, y: 0 },
        { x: canvas.width, y: 0 },
        { x: 0, y: canvas.height },
        { x: canvas.width, y: canvas.height },
      ];
      for (const corner of corners) {
        const dx = newPos.x - corner.x;
        const dy = newPos.y - corner.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < PUCK_SIZE / 2 + 10) {
          const nx = dx / distance;
          const ny = dy / distance;
          const dot = newVel.x * nx + newVel.y * ny;
          newVel = {
            x: newVel.x - 2 * dot * nx,
            y: newVel.y - 2 * dot * ny,
          };
          newPos.x = corner.x + (PUCK_SIZE / 2 + 10) * nx;
          newPos.y = corner.y + (PUCK_SIZE / 2 + 10) * ny;
          break;
        }
      }

      // Goal detection
      const goalWidth = 150;
      const goalHeight = 10;
      const goalX = canvas.width / 2 - goalWidth / 2;

      if (newPos.y <= goalHeight && newPos.x >= goalX && newPos.x <= goalX + goalWidth) {
        const newPlayerScore = score.player + 1;
        setScore((s) => ({ ...s, player: newPlayerScore }));
        if (newPlayerScore >= 5) setWinner('Player');
        resetPuck();
        return;
      } else if (newPos.y >= canvas.height - goalHeight && newPos.x >= goalX && newPos.x <= goalX + goalWidth) {
        const newEnemyScore = score.enemy + 1;
        setScore((s) => ({ ...s, enemy: newEnemyScore }));
        if (newEnemyScore >= 5) setWinner('Enemy');
        resetPuck();
        return;
      }

      setPuckPos(newPos);
      setPuckVel(newVel);
    };

    const resetPuck = () => {
      setPuckPos({ x: canvas.width / 2, y: canvas.height / 2 });
      setPuckVel({ x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 });
    };

    const loop = () => {
      update();
      draw();
    };

    const interval = setInterval(loop, 1000 / FPS);
    return () => clearInterval(interval);
  }, [puckPos, puckVel, score, winner]);

/* ---------- AI movement ---------- */
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const w = canvas.width;
  const h = canvas.height;
  const targetX = Math.max(
    PADDLE_RADIUS,
    Math.min(puckPos.x, w - PADDLE_RADIUS)
  );
  const isPuckInPlayerArea = puckPos.y > h / 2;
  const targetY = isPuckInPlayerArea
    ? PADDLE_RADIUS + 10 // move backward near the yellow goal line when defending
    : puckPos.y; // follow puck vertically
  setOpponentPaddlePos((prev) => {
    const dx = targetX - prev.x;
    const dy = targetY - prev.y;
    const maxSpeed = AI_SPEED;
    const clampedDx = Math.max(-maxSpeed, Math.min(dx, maxSpeed));
    const clampedDy = isPuckInPlayerArea
      ? 0 // no vertical movement when defending
      : Math.max(-maxSpeed, Math.min(dy, maxSpeed));
    const newX = prev.x + clampedDx;
    const newY = Math.max(
      0,
      Math.min(prev.y + clampedDy, h / 2 - PADDLE_RADIUS * 2)
    );
    return { x: newX, y: newY };
  });
}, [puckPos, canvasRef]);

 // Update previous paddle positions after each render
useEffect(() => {
  prevPaddlePos.current = paddlePos;
  prevOpponentPaddlePos.current = opponentPaddlePos;
}, [paddlePos, opponentPaddlePos, canvasRef]);

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
      y: Math.max(canvas.height / 2, Math.min(y, canvas.height - PADDLE_HEIGHT)),
    });
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        className="border-2 border-white rounded-lg"
        onPointerDown={handlePointerMove}
        onPointerMove={handlePointerMove}
      />
      {winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="text-4xl text-white font-bold">{winner} Wins!</div>
        </div>
      )}
    </div>
  );
}
