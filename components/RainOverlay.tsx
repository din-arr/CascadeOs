"use client";

import { useEffect, useRef } from "react";

type RainOverlayProps = {
  intensity?: "soft" | "medium";
  className?: string;
};

export default function RainOverlay({ intensity = "soft", className }: RainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
    if (reducedMotion || lowPower) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const drops = Array.from({ length: intensity === "medium" ? 72 : 46 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      length: 10 + Math.random() * 22,
      speed: 0.003 + Math.random() * 0.004,
      drift: 0.001 + Math.random() * 0.0015,
      opacity: 0.08 + Math.random() * 0.1,
      seed: index,
    }));
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      drops.forEach((drop) => {
        drop.y += drop.speed;
        drop.x += drop.drift;
        if (drop.y > 1.05) {
          drop.y = -0.08;
          drop.x = (drop.seed * 0.17 + Math.random()) % 1;
        }
        if (drop.x > 1.05) drop.x = -0.05;
        const x = drop.x * width;
        const y = drop.y * height;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 5, y + drop.length);
        context.strokeStyle = `rgba(131, 198, 227, ${drop.opacity})`;
        context.lineWidth = 0.7;
        context.stroke();
      });
      frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [intensity]);

  return <canvas className={`rain-overlay${className ? ` ${className}` : ""}`} aria-hidden="true" ref={canvasRef} />;
}
