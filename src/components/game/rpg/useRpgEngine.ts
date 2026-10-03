import { useRef, useEffect, useState, useCallback } from "react";
import type { QuizQuestion } from "../../../types";

export interface RpgNpcData {
  name: string;
  avatar: string;
  topicName: string;
  qIndex: number;
}

export interface RpgGameState {
  playerX: number;
  playerY: number;
  playerDir: string;
  playerXP: number;
  playerLevel: number;
  speedBoost: boolean;
  sageStatus: Record<string, "idle" | "satisfied">;
}

export function useRpgEngine(activeQuizzes: QuizQuestion[]) {
  // Game state that React NEEDS to re-render (UI Overlays)
  const [playerXP, setPlayerXP] = useState<number>(0);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [speedBoost, setSpeedBoost] = useState<boolean>(false);
  const [sageStatus, setSageStatus] = useState<Record<string, "idle" | "satisfied">>({
    "Thầy Đồ Phương Bắc": "idle",
    "Đạo Sĩ Phương Trung": "idle",
    "Hiền Nhân Phương Nam": "idle"
  });

  const [activeNpc, setActiveNpc] = useState<RpgNpcData | null>(null);

  // Mutable Game State for physics & rendering (Does NOT trigger React render)
  const gameState = useRef({
    x: 180,
    y: 110,
    dir: "down",
    speed: 12, // pixels per key press (we should probably move to velocity-based for smooth movement, but keeping original logic for now)
    keys: {} as Record<string, boolean>,
  });

  // Handle Input (Keydown/Keyup)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeNpc) return; // freeze movement inside quiz
      const key = e.key.toLowerCase();
      gameState.current.keys[key] = true;
      
      const stepSize = gameState.current.speed;
      if (key === "a" || key === "arrowleft") {
        gameState.current.dir = "left";
        gameState.current.x = Math.max(16, gameState.current.x - stepSize);
      }
      if (key === "d" || key === "arrowright") {
        gameState.current.dir = "right";
        gameState.current.x = Math.min(364, gameState.current.x + stepSize);
      }
      if (key === "w" || key === "arrowup") {
        gameState.current.dir = "up";
        gameState.current.y = Math.max(16, gameState.current.y - stepSize);
      }
      if (key === "s" || key === "arrowdown") {
        gameState.current.dir = "down";
        gameState.current.y = Math.min(224, gameState.current.y + stepSize);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameState.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeNpc]);

  // Collide detector (runs in a loop or effect, but since we rely on state updates for UI, we check on interval)
  useEffect(() => {
    if (activeNpc) return;

    const checkCollisions = setInterval(() => {
      const { x, y } = gameState.current;

      const distNorth = Math.hypot(x - 60, y - 60);
      if (distNorth < 35 && sageStatus["Thầy Đồ Phương Bắc"] === "idle") {
        setActiveNpc({
          name: "Thầy Đồ Phương Bắc",
          avatar: "🧙‍♂️",
          topicName: "Kiến trúc Biên dịch & Mobile-only",
          qIndex: 0 % activeQuizzes.length
        });
        return;
      }

      const distCentral = Math.hypot(x - 190, y - 180);
      if (distCentral < 35 && sageStatus["Đạo Sĩ Phương Trung"] === "idle") {
        setActiveNpc({
          name: "Đạo Sĩ Phương Trung",
          avatar: "👨‍🏫",
          topicName: "Expo Tunnels & Thừa Mạng Local",
          qIndex: 1 % activeQuizzes.length
        });
        return;
      }

      const distSouth = Math.hypot(x - 310, y - 60);
      if (distSouth < 35 && sageStatus["Hiền Nhân Phương Nam"] === "idle") {
        setActiveNpc({
          name: "Hiền Nhân Phương Nam",
          avatar: "🦉",
          topicName: "Bảo mật chống Virus tập tin & Deep Link",
          qIndex: 2 % activeQuizzes.length
        });
        return;
      }
    }, 100);

    return () => clearInterval(checkCollisions);
  }, [activeNpc, sageStatus, activeQuizzes.length]);

  const grantXpAndBoost = (xpAmount: number) => {
    setPlayerXP((prev) => {
      const next = prev + xpAmount;
      if (next >= playerLevel * 100) {
        setPlayerLevel((lvl) => lvl + 1);
      }
      return next;
    });
    setSpeedBoost(true);
    setTimeout(() => setSpeedBoost(false), 5000);
  };

  const markSageSatisfied = (sageName: string) => {
    setSageStatus((prev) => ({
      ...prev,
      [sageName]: "satisfied"
    }));
  };

  const closeNpcPanel = () => {
    setActiveNpc(null);
  };

  return {
    gameState,
    playerXP,
    playerLevel,
    speedBoost,
    sageStatus,
    activeNpc,
    grantXpAndBoost,
    markSageSatisfied,
    closeNpcPanel,
  };
}
