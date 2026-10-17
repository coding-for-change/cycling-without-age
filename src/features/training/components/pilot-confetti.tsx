"use client";

import { useEffect, useRef } from "react";

const TOKENS = ["--mint", "--mint-deep", "--chart-2", "--chart-3"];
const PIECES = 90;
const LIFETIME_MS = 2_400;
const GRAVITY = 0.00055;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  width: number;
  height: number;
  color: string;
};

export function MintConfetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const style = getComputedStyle(document.documentElement);
    const colors = TOKENS.map((token) =>
      style.getPropertyValue(token).trim(),
    ).filter(Boolean);
    if (colors.length === 0) return;

    const pieces: Piece[] = Array.from({ length: PIECES }, () => {
      const direction = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 0.55 + Math.random() * 0.6;
      return {
        x: width / 2,
        y: height * 0.55,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        spin: (Math.random() - 0.5) * 0.02,
        angle: Math.random() * Math.PI,
        width: 5 + Math.random() * 5,
        height: 8 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    let frame = 0;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const age = now - start;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, 1 - age / LIFETIME_MS);
      for (const piece of pieces) {
        piece.vy += GRAVITY * dt;
        piece.vx *= 0.995;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.fillStyle = piece.color;
        context.fillRect(
          -piece.width / 2,
          -piece.height / 2,
          piece.width,
          piece.height * Math.abs(Math.cos(piece.angle * 2)),
        );
        context.restore();
      }
      if (age < LIFETIME_MS) frame = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 size-full"
    />
  );
}
