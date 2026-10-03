import React, { useEffect, useRef } from "react";

interface RpgCanvasRendererProps {
  gameState: React.MutableRefObject<{
    x: number;
    y: number;
    dir: string;
  }>;
  sageStatus: Record<string, "idle" | "satisfied">;
  speedBoost: boolean;
  playerXP: number;
}

export function RpgCanvasRenderer({ gameState, sageStatus, speedBoost, playerXP }: RpgCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const drawGame = () => {
      // 1. Clear Screen / Draw Grass Background
      ctx.fillStyle = "#ecfdf5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw beautiful retro checkers grid for grassland tiles
      ctx.fillStyle = "#f0fdf4";
      for (let i = 0; i < canvas.width; i += 32) {
        for (let j = 0; j < canvas.height; j += 32) {
          if ((i + j) % 64 === 0) {
            ctx.fillRect(i, j, 32, 32);
          }
        }
      }

      // 2. Draw Obstacles (Decorative ruins, books, library desks)
      drawStoneRuins(ctx, 40, 140);
      drawStoneRuins(ctx, 280, 150);
      drawDecorativeBook(ctx, 120, 30);
      drawDecorativeBook(ctx, 200, 40);

      // 3. Draw The 3 Sages (NPC Targets)
      drawSage(ctx, 60, 60, "Thầy Đồ Phương Bắc", sageStatus["Thầy Đồ Phương Bắc"] === "satisfied");
      drawSage(ctx, 190, 180, "Đạo Sĩ Phương Trung", sageStatus["Đạo Sĩ Phương Trung"] === "satisfied");
      drawSage(ctx, 310, 60, "Hiền Nhân Phương Nam", sageStatus["Hiền Nhân Phương Nam"] === "satisfied");

      const { x, y, dir } = gameState.current;

      // 4. Draw User Player Avatar (Stylized Wizard Cadet)
      drawPlayer(ctx, x, y, dir, speedBoost);

      // 5. Draw Target Guides
      if (playerXP < 150) {
        ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (sageStatus["Thầy Đồ Phương Bắc"] === "idle") {
          ctx.lineTo(60, 60);
        } else if (sageStatus["Đạo Sĩ Phương Trung"] === "idle") {
          ctx.lineTo(190, 180);
        } else {
          ctx.lineTo(310, 60);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationId = requestAnimationFrame(drawGame);
    };

    drawGame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [sageStatus, speedBoost, playerXP, gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={240}
      className="w-full h-full object-cover"
    />
  );
}

// Graphic Helpers
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: string, boost: boolean) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = boost ? "#a855f7" : "#58CC03";
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 5);
  ctx.lineTo(x + 8, y + 5);
  ctx.lineTo(x + 10, y + 15);
  ctx.lineTo(x - 10, y + 15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fed7aa";
  ctx.beginPath();
  ctx.arc(x, y - 1, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eab308";
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 5);
  ctx.lineTo(x + 8, y - 5);
  ctx.lineTo(x, y - 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y - 17, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  if (dir === "down") {
    ctx.fillRect(x - 3, y - 3, 2, 2);
    ctx.fillRect(x + 1, y - 3, 2, 2);
  } else if (dir === "left") {
    ctx.fillRect(x - 5, y - 3, 2, 2);
  } else if (dir === "right") {
    ctx.fillRect(x + 3, y - 3, 2, 2);
  }
}

function drawSage(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, satisfied: boolean) {
  ctx.strokeStyle = satisfied ? "rgba(34, 197, 94, 0.6)" : "rgba(129, 140, 248, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y + 10, satisfied ? 14 : 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = satisfied ? "#22c55e" : "#0284c7";
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 10);
  ctx.lineTo(x + 9, y + 10);
  ctx.lineTo(x + 7, y - 2);
  ctx.lineTo(x - 7, y - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 2);
  ctx.lineTo(x + 3, y + 2);
  ctx.lineTo(x, y + 13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.fillRect(x - 5, y - 11, 10, 3);

  ctx.fillStyle = satisfied ? "#dcfce7" : "#f1f5f9";
  ctx.fillRect(x - 35, y - 24, 70, 10);
  ctx.strokeStyle = satisfied ? "#86efac" : "#cbd5e1";
  ctx.strokeRect(x - 35, y - 24, 70, 10);

  ctx.fillStyle = satisfied ? "#15803d" : "#334155";
  ctx.font = "bold 6.5px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(satisfied ? "✓ Hoàn thành" : name.split(" ")[1], x, y - 17);
}

function drawStoneRuins(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x, y, 20, 16);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x + 2, y + 2, 6, 5);
  ctx.fillRect(x + 10, y + 8, 8, 6);
}

function drawDecorativeBook(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#f43f5e";
  ctx.fillRect(x, y, 12, 16);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 2, y + 1, 8, 1);
  ctx.fillRect(x + 2, y + 14, 8, 1);
}
