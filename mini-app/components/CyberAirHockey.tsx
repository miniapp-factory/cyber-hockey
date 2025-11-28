"use client";

import React from "react";

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
  difficulty: keyof typeof DIFFICULTIES;
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
  return null;
}
