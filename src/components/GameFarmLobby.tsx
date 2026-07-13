import React, { useEffect, useMemo, useRef, useState } from "react";
import { QuizQuestion } from "../types";
import {
  Sword,
  Sparkles,
  Crosshair,
  Wand2,
  Shield,
  Dice5,
  Play,
  X as XIcon,
  Users,
  Heart,
  Trophy,
  Key,
  Gift,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Map as MapIcon,
  ArrowRight,
  Compass,
  Skull,
  MessageSquare,
  Send,
  User,
  MapPin,
  Navigation,
  Radio,
  PanelLeftClose,
  UserPlus,
  Copy,
  QrCode,
} from "lucide-react";
import { Button } from "./ui/Button";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ClassId = "warrior" | "mage" | "archer" | "ranger" | "guardian";

interface CharacterClass {
  id: ClassId;
  name: string;
  bodyColor: string;
  hatColor: string;
  blurb: string;
  icon: React.ReactNode;
}

const CLASSES: CharacterClass[] = [
  { id: "warrior", name: "Chiến binh", bodyColor: "#dc2626", hatColor: "#7f1d1d", blurb: "Cận chiến, máu trâu, chậm.", icon: <Sword size={16} /> },
  { id: "mage", name: "Pháp sư", bodyColor: "#2563eb", hatColor: "#1e3a8a", blurb: "Sát thương phép, tầm xa.", icon: <Sparkles size={16} /> },
  { id: "archer", name: "Cung thủ", bodyColor: "#16a34a", hatColor: "#14532d", blurb: "Bắn tỉa nhanh, né tốt.", icon: <Crosshair size={16} /> },
  { id: "ranger", name: "Du hành", bodyColor: "#f59e0b", hatColor: "#78350f", blurb: "Tốc độ cao, linh hoạt.", icon: <Wand2 size={16} /> },
  { id: "guardian", name: "Hộ vệ", bodyColor: "#7c3aed", hatColor: "#4c1d95", blurb: "Hỗ trợ đội, đỡ đòn.", icon: <Shield size={16} /> },
];

// Display-only stats (1-5) for the lobby roster — mirror the in-game speed feel.
const CLASS_STATS: Record<ClassId, { hp: number; spd: number; pow: number }> = {
  warrior: { hp: 5, spd: 2, pow: 4 },
  mage: { hp: 3, spd: 3, pow: 5 },
  archer: { hp: 3, spd: 4, pow: 4 },
  ranger: { hp: 2, spd: 5, pow: 3 },
  guardian: { hp: 5, spd: 2, pow: 2 },
};

// ─── Sprite assets (Legend of Lua, MIT © 2020 Challacade LLC) ───
// Each class is mapped to one of the 5 player outfits in the sheet.
const OUTFIT: Record<ClassId, string> = {
  warrior: "1",
  mage: "2",
  archer: "3",
  ranger: "4",
  guardian: "comfy",
};
// Player spritesheet grid (from legend-of-lua src/player.lua: newGrid(19,21))
const PF_W = 19; // player frame width
const PF_H = 21; // player frame height
// Rows used (0-indexed): 0 = walk down, 1 = walk up, 7 = idle down
const PLAYER_SCALE = 1.7;

const ASSET_BASE = "/game-assets";
const playerSheetSrc = (cls: ClassId) => `${ASSET_BASE}/player/playerSheet${OUTFIT[cls]}.png`;

// Static environment + tileset sources
const ASSET_SRCS: Record<string, string> = {
  shadow: `${ASSET_BASE}/player/playerShadow.png`,
  tree: `${ASSET_BASE}/environment/tree.png`,
  tree2: `${ASSET_BASE}/environment/tree2.png`,
  chestClosed: `${ASSET_BASE}/environment/chestClosed.png`,
  chestOpen: `${ASSET_BASE}/environment/chestOpen.png`,
  rock: `${ASSET_BASE}/environment/breakableRock.png`,
  door: `${ASSET_BASE}/environment/lockedDoor.png`,
  bat: `${ASSET_BASE}/enemies/bat.png`,
  overworld: `${ASSET_BASE}/tilesets/overworld.png`,
  // gameplay items
  bombSheet: `${ASSET_BASE}/items/bombSheet.png`,   // 24x12 = 2 frames 12x12
  container: `${ASSET_BASE}/items/container.png`,    // 12x11 pushable crate
  coin: `${ASSET_BASE}/items/coin.png`,              // 8x8
  heart: `${ASSET_BASE}/items/heart.png`,            // 11x10
  explosion: `${ASSET_BASE}/effects/explosion.png`,  // 192x32 = 6 frames 32x32
  scorch: `${ASSET_BASE}/effects/scorch.png`,        // 32x32
};

// Grass tile location inside overworld.png (16px tiles) — plain grass patch
const GRASS = { sx: 16, sy: 64, size: 16 };
// Water tile inside overworld.png (for rivers)
const WATER_TILE = { sx: 272, sy: 32, size: 16 };
// Flower-grass tile (decorative)
const FLOWER_TILE = { sx: 0, sy: 96, size: 16 };

// Decoration crops from the overworld tileset (sx, sy, sw, sh in tileset px).
// Buildings are placed on the maze border so they read as a village skyline.
interface DecoCrop { sx: number; sy: number; sw: number; sh: number; }
const DECOS: Record<string, DecoCrop> = {
  houseRed: { sx: 88, sy: 6, sw: 80, sh: 66 },
  houseBrown: { sx: 168, sy: 6, sw: 80, sh: 66 },
  castle: { sx: 384, sy: 2, sw: 94, sh: 74 },
  fountain: { sx: 352, sy: 134, sw: 52, sh: 58 },
  market: { sx: 296, sy: 358, sw: 66, sh: 56 },
  well: { sx: 2, sy: 354, sw: 54, sh: 82 },
};

// bomb/explosion frame metrics
const BOMB_FW = 12;
const EXPLO_FW = 32;
const EXPLO_FRAMES = 6;
const BOMB_FUSE = 110;     // frames before explosion
const BOMB_RANGE = 2;      // flame reach in tiles (each direction)
const BOMB_COOLDOWN = 70;  // frames between bombs
const ZOOM = 1.7;          // camera zoom — world scrolls to follow the player
const MAX_LIVES = 7;       // starting + max hearts

// ─── Tile legend ───
// '#' wall  '.' floor  'S' spawn  'D' door  'Q' quiz gate  'T' treasure  'N' npc
// '~' water  'B' rock (block)  'C' crate (pushable)  'b' bridge (walkable over water)
type Tile = "#" | "." | "S" | "D" | "Q" | "T" | "N" | "~" | "B" | "C" | "b";

interface LevelPalette {
  ground: string;       // floor base
  ground2: string;      // floor alt (checker)
  wall: string;         // wall top
  wallDark: string;     // wall side / shadow
  accent: string;       // door / accents
  detail: string;       // small detail color
}

interface LevelDef {
  id: number;
  name: string;
  theme: "grass" | "stone" | "lake" | "library" | "lab";
  hint: string;
  palette: LevelPalette;
}

const TILE = 32; // pixel size of one tile
// World grid — bigger labyrinth (odd dims carve cleanly with the maze generator).
const ROWS = 19;
const COLS = 29;
const W = COLS * TILE; // world width  (928)
const H = ROWS * TILE; // world height (608)
// Camera viewport — the visible window onto the world (canvas resolution).
// The world is larger than this and scrolls to follow the player.
const VIEW_W = 672;
const VIEW_H = 432;

// ─── 5 themed biomes — layouts are generated as fresh random mazes each play ───
const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Sảnh Nông Trại",
    theme: "grass",
    hint: "Mê cung làng nông trại. Tìm Cổng Câu Hỏi 💡, trả lời đúng để mở Cửa 🚪 qua màn. Space = đặt BOM phá đá 'B' (rơi xu) & diệt dơi; đẩy thùng 'C' chắn lối.",
    palette: { ground: "#86efac", ground2: "#bbf7d0", wall: "#15803d", wallDark: "#14532d", accent: "#fbbf24", detail: "#f59e0b" },
  },
  {
    id: 2,
    name: "Núi Đá Vọng Cổ",
    theme: "stone",
    hint: "Mê cung đá cổ rộng lớn. Né (hoặc cho nổ) dơi, đẩy thùng, đặt bom phá đá nhặt xu, len qua hành lang tới Cổng Câu Hỏi.",
    palette: { ground: "#9ca3af", ground2: "#d1d5db", wall: "#475569", wallDark: "#1e293b", accent: "#facc15", detail: "#64748b" },
  },
  {
    id: 3,
    name: "Hồ Thác Trong Vắt",
    theme: "lake",
    hint: "Mê cung ven hồ xanh mát. Nhặt xu, mở rương kho báu 🎁, đặt bom dọn đá trên đường tới cổng. Càng nhiều ngã rẽ — càng nhiều lối tắt.",
    palette: { ground: "#a3e635", ground2: "#bef264", wall: "#3b82f6", wallDark: "#1e40af", accent: "#fbbf24", detail: "#60a5fa" },
  },
  {
    id: 4,
    name: "Thư Viện Cổ",
    theme: "library",
    hint: "Đại mê cung thư viện. Kệ sách chia làn chằng chịt — đẩy thùng 'C' để thông đường, đặt bom dọn đá & dơi rồi tới Cổng Câu Hỏi.",
    palette: { ground: "#fbbf24", ground2: "#fcd34d", wall: "#7c2d12", wallDark: "#431407", accent: "#dc2626", detail: "#92400e" },
  },
  {
    id: 5,
    name: "Phòng Thí Nghiệm",
    theme: "lab",
    hint: "Màn cuối! Mê cung phòng lab công nghệ cao, lắt léo nhất. Cho nổ bom dọn đường, vượt qua mọi dơi tới Cổng cuối cùng.",
    palette: { ground: "#1e293b", ground2: "#334155", wall: "#06b6d4", wallDark: "#0e7490", accent: "#a855f7", detail: "#22d3ee" },
  },
];

// ─── Run checkpoint (so finishing a level lets you continue, not restart) ───
interface SavedProgress {
  level: number;   // index of the NEXT level to play (1..LEVELS.length-1)
  lives: number;
  exp: number;
  keys: number;
  cls: ClassId;
  name: string;
}
const PROGRESS_KEY = "vietlearn_maze_progress_v1";
function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedProgress;
    if (typeof p?.level === "number" && p.level > 0 && p.level < LEVELS.length) return p;
    return null;
  } catch {
    return null;
  }
}
function persistProgress(p: SavedProgress | null) {
  try {
    if (p) localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore storage failures (private mode, quota) */
  }
}

// ─── Deterministic confetti pieces for the level-complete celebration ───
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 47 + 5) % 100,
  delay: (i % 7) * 0.26,
  dur: 2.2 + (i % 5) * 0.4,
  color: ["#f43f5e", "#fbbf24", "#34d399", "#60a5fa", "#a855f7", "#fb923c"][i % 6],
  size: 6 + (i % 3) * 3,
}));

// ─── Procedural maze generator ──────────────────────────────────────────────
// Recursive-backtracker carve (always fully connected) + a few extra openings
// so there are loops/short-cuts (more fun, multiple routes). Then S/Q/D and the
// pickups are scattered so the gate & door are always reachable.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLayout(rand: () => number): string[] {
  const R = ROWS;
  const C = COLS;
  const wall: boolean[][] = Array.from({ length: R }, () => new Array(C).fill(true));
  const inb = (r: number, c: number) => r > 0 && r < R - 1 && c > 0 && c < C - 1;

  // Carve passages between odd cells.
  const stack: [number, number][] = [[1, 1]];
  wall[1][1] = false;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let carved = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (inb(nr, nc) && wall[nr][nc]) {
        wall[r + dr / 2][c + dc / 2] = false;
        wall[nr][nc] = false;
        stack.push([nr, nc]);
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Knock out some interior walls → loops & short-cuts (no dead-end-only maze).
  for (let r = 1; r < R - 1; r++) {
    for (let c = 1; c < C - 1; c++) {
      if (!wall[r][c] || rand() >= 0.09) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => !wall[r + dr]?.[c + dc]).length;
      if (open >= 2) wall[r][c] = false;
    }
  }

  // BFS distances from spawn (1,1) over walkable cells.
  const dist: number[][] = Array.from({ length: R }, () => new Array(C).fill(-1));
  const queue: [number, number][] = [[1, 1]];
  dist[1][1] = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const [r, c] = queue[qi];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && !wall[nr][nc] && dist[nr][nc] < 0) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }

  const g: string[][] = wall.map((row) => row.map((w) => (w ? "#" : ".")));
  const key = (r: number, c: number) => `${r},${c}`;
  const degree = (r: number, c: number) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => !wall[r + dr]?.[c + dc]).length;

  const floors: [number, number][] = [];
  for (let r = 1; r < R - 1; r++)
    for (let c = 1; c < C - 1; c++) if (!wall[r][c] && dist[r][c] >= 0) floors.push([r, c]);

  // Quiz gate = the cell farthest from spawn.
  let gate: [number, number] = [1, 1];
  let maxd = -1;
  for (const [r, c] of floors)
    if (dist[r][c] > maxd) {
      maxd = dist[r][c];
      gate = [r, c];
    }
  // Door = farthest cell in the right portion of the map, distinct from the gate.
  let door: [number, number] = gate;
  let dd = -1;
  for (const [r, c] of floors)
    if ((r !== gate[0] || c !== gate[1]) && c > C * 0.55 && dist[r][c] > dd) {
      dd = dist[r][c];
      door = [r, c];
    }
  if (door === gate)
    for (const [r, c] of floors)
      if ((r !== gate[0] || c !== gate[1]) && dist[r][c] > dd) {
        dd = dist[r][c];
        door = [r, c];
      }

  const occupied = new Set<string>();
  g[1][1] = "S";
  occupied.add(key(1, 1));
  g[gate[0]][gate[1]] = "Q";
  occupied.add(key(gate[0], gate[1]));
  g[door[0]][door[1]] = "D";
  occupied.add(key(door[0], door[1]));

  // Candidate cells for pickups: not occupied, not hugging the spawn.
  const candidates = floors.filter(
    ([r, c]) => !occupied.has(key(r, c)) && Math.abs(r - 1) + Math.abs(c - 1) >= 5
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  let pi = 0;
  const place = (ch: string, count: number, cond?: (r: number, c: number) => boolean) => {
    let n = 0;
    while (pi < candidates.length && n < count) {
      const [r, c] = candidates[pi++];
      if (occupied.has(key(r, c))) continue;
      if (cond && !cond(r, c)) continue;
      g[r][c] = ch;
      occupied.add(key(r, c));
      n++;
    }
  };
  place("T", 2);                                   // treasure chests (far)
  place("N", 4, (r, c) => degree(r, c) >= 2);      // other "players" at junctions
  place("C", 5, (r, c) => degree(r, c) >= 3);      // crates only in open rooms (never trap)
  place("B", 9);                                   // breakable rocks (drop coins) anywhere

  return g.map((row) => row.join(""));
}

interface GameFarmLobbyProps {
  quizList?: QuizQuestion[];
}

// ─── Fallback quizzes ───
const FALLBACK_QUIZZES: QuizQuestion[] = [
  {
    id: "fq1",
    question: "Trong React, hook nào dùng cho side effect khi component mount?",
    options: ["useState", "useEffect", "useMemo", "useRef"],
    correctAnswer: "useEffect",
    explanation: "useEffect chạy sau khi render — phù hợp xử lý side effect.",
  },
  {
    id: "fq2",
    question: "Tilemap 2D thường dùng vì lý do gì?",
    options: [
      "Dễ vẽ và xử lý va chạm theo ô",
      "Có hiệu năng kém hơn vector",
      "Bắt buộc cho game 3D",
      "Chỉ dùng được trên mobile",
    ],
    correctAnswer: "Dễ vẽ và xử lý va chạm theo ô",
    explanation: "Tilemap chia map thành lưới, đơn giản hóa cả render lẫn collision detection.",
  },
  {
    id: "fq3",
    question: "Skeletal animation (Spine, DragonBones) khác frame-by-frame thế nào?",
    options: [
      "Dùng xương + biến dạng vùng ảnh, dung lượng nhỏ hơn",
      "Vẽ lại toàn bộ ảnh mỗi frame",
      "Chỉ hoạt động với 3D",
      "Không thể tween mượt",
    ],
    correctAnswer: "Dùng xương + biến dạng vùng ảnh, dung lượng nhỏ hơn",
    explanation: "Skeletal animation rig nhân vật theo xương, tween mượt, file nhỏ hơn nhiều so với spritesheet.",
  },
  {
    id: "fq4",
    question: "Trong game multiplayer real-time, giao thức nào thường được ưa dùng?",
    options: ["WebSocket / UDP", "FTP", "SMTP", "POP3"],
    correctAnswer: "WebSocket / UDP",
    explanation: "WebSocket cho TCP duy trì kết nối; UDP cho low-latency các trò chơi action.",
  },
  {
    id: "fq5",
    question: "Pixel art Hi-Bit (~16-bit era) đặc trưng bởi điều gì?",
    options: [
      "Pallete giới hạn, dithering, cạnh rõ pixel",
      "Anti-aliased mềm như vector",
      "Render dùng ray-tracing",
      "Bắt buộc 1 pixel = 1 đơn vị thế giới",
    ],
    correctAnswer: "Pallete giới hạn, dithering, cạnh rõ pixel",
    explanation: "Hi-Bit là phong cách hiện đại lấy cảm hứng 16-bit: palette ấm, dither tạo gradient, cạnh sắc nét.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function GameFarmLobby({ quizList }: GameFarmLobbyProps) {
  const quizzes = quizList && quizList.length > 0 ? quizList : FALLBACK_QUIZZES;

  // ── Stage ──
  const [stage, setStage] = useState<"select" | "playing" | "transition" | "gameover" | "victory">("select");
  // Restore any saved checkpoint (highest level reached) on first mount.
  const initialProgress = useMemo(() => loadProgress(), []);
  const [selectedClass, setSelectedClass] = useState<ClassId>(initialProgress?.cls ?? "mage");
  const [playerName, setPlayerName] = useState<string>(initialProgress?.name ?? "Scholar");
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(initialProgress);

  // ── Run state ──
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [exp, setExp] = useState<number>(0);
  const [keysCollected, setKeysCollected] = useState<number>(0);

  // ── Chest reward + maze map reveal ──
  const [chestReward, setChestReward] = useState<{ icon: string; title: string; desc: string; tone: "gold" | "life" | "map" } | null>(null);
  const [mapRevealed, setMapRevealed] = useState<boolean>(false);
  const mapRevealedRef = useRef<boolean>(false);
  const rewardTimerRef = useRef<number | null>(null);

  // ── Modal quiz ──
  const [activeGateQIndex, setActiveGateQIndex] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  // ── Refs for game ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const animFrameRef = useRef<number | null>(null);
  const pausedRef = useRef<boolean>(false);
  const movingRef = useRef<boolean>(false);

  // ── Sprite assets ──
  const assetsRef = useRef<Record<string, HTMLImageElement>>({});
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const entries: [string, string][] = [
      ...Object.entries(ASSET_SRCS),
      ...CLASSES.map((c) => [`player_${c.id}`, playerSheetSrc(c.id)] as [string, string]),
    ];
    let loaded = 0;
    entries.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        assetsRef.current[key] = img;
        loaded++;
        if (!cancelled && loaded === entries.length) setAssetsReady(true);
      };
      img.onerror = () => {
        loaded++;
        if (!cancelled && loaded === entries.length) setAssetsReady(true);
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Player state (pixel coords)
  const playerRef = useRef<{ x: number; y: number; dir: "up" | "down" | "left" | "right"; frame: number }>({
    x: TILE * 1.5,
    y: TILE * 1.5,
    dir: "down",
    frame: 0,
  });

  // Per-level mutable state (parsed from layout each level load)
  const levelStateRef = useRef<{
    walls: boolean[][];                        // [row][col]
    waters: boolean[][];
    barrels: boolean[][];
    bridges: boolean[][];                      // walkable over water
    crates: { r: number; c: number }[];        // pushable
    doorTile: { r: number; c: number } | null;
    gateTile: { r: number; c: number } | null;
    chestTiles: { r: number; c: number; opened: boolean }[];
    npcs: { r: number; c: number; cls: ClassId; name: string }[];
    bats: { x: number; y: number; vx: number; vy: number; dead: boolean }[];
    coins: { x: number; y: number; taken: boolean }[];
    hearts: { x: number; y: number; taken: boolean }[];
    decos: { type: keyof typeof DECOS; r: number; c: number }[];
    gateOpened: boolean;
    mazeLayout: string[];                      // raw layout rows (for the revealed minimap)
  }>({
    walls: [], waters: [], barrels: [], bridges: [], crates: [], doorTile: null, gateTile: null,
    chestTiles: [], npcs: [], bats: [], coins: [], hearts: [], decos: [], gateOpened: false,
    mazeLayout: [],
  });

  // Bombs + explosion effects (reset per level)
  const bombsRef = useRef<{ x: number; y: number; fuse: number; boom: number; cells: { r: number; c: number }[] }[]>([]);
  const scorchRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const bombCooldownRef = useRef<number>(0);
  const hurtCooldownRef = useRef<number>(0);
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // ── "Bị tấn công" feedback: red vignette flash, camera shake, floating -1 ──
  const hitFlashRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const dmgPopupsRef = useRef<{ x: number; y: number; t: number; text: string; color: string }[]>([]);

  // ── Sync pause with modal ──
  useEffect(() => {
    pausedRef.current = activeGateQIndex !== null || stage !== "playing";
  }, [activeGateQIndex, stage]);

  // ── Load level on enter / change ──
  useEffect(() => {
    if (stage !== "playing") return;
    loadLevel(currentLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentLevel]);

  function loadLevel(idx: number) {
    const lvl = LEVELS[idx];
    if (!lvl) return;
    const walls: boolean[][] = [];
    const waters: boolean[][] = [];
    const barrels: boolean[][] = [];
    const bridges: boolean[][] = [];
    const crates: { r: number; c: number }[] = [];
    let doorTile: { r: number; c: number } | null = null;
    let gateTile: { r: number; c: number } | null = null;
    const chestTiles: { r: number; c: number; opened: boolean }[] = [];
    const npcs: { r: number; c: number; cls: ClassId; name: string }[] = [];
    let spawn = { r: 1, c: 1 };

    const npcNames = ["Linh.vn", "Khanh", "Mai", "Bot_AI", "Tuấn", "Quân", "Hà", "Ngọc"];
    let npcIdx = 0;

    // Fresh random maze every time the level loads (replayable, never the same).
    const layout = generateLayout(Math.random.bind(Math));

    for (let r = 0; r < ROWS; r++) {
      walls.push(new Array(COLS).fill(false));
      waters.push(new Array(COLS).fill(false));
      barrels.push(new Array(COLS).fill(false));
      bridges.push(new Array(COLS).fill(false));
      const row = layout[r] || "";
      for (let c = 0; c < COLS; c++) {
        const ch = (row[c] || "#") as Tile;
        if (ch === "#") walls[r][c] = true;
        else if (ch === "~") waters[r][c] = true;
        else if (ch === "B") barrels[r][c] = true;
        else if (ch === "b") bridges[r][c] = true;
        else if (ch === "C") crates.push({ r, c });
        else if (ch === "S") spawn = { r, c };
        else if (ch === "D") doorTile = { r, c };
        else if (ch === "Q") gateTile = { r, c };
        else if (ch === "T") chestTiles.push({ r, c, opened: false });
        else if (ch === "N") {
          const ncls = (["warrior", "archer", "guardian", "ranger"] as ClassId[])[npcIdx % 4];
          npcs.push({ r, c, cls: ncls, name: npcNames[npcIdx % npcNames.length] });
          npcIdx++;
        }
      }
    }

    const isFree = (rr: number, cc: number) =>
      rr > 0 && rr < ROWS - 1 && cc > 0 && cc < COLS - 1 &&
      !walls[rr][cc] && !waters[rr][cc] && !barrels[rr][cc] &&
      !crates.some((cr) => cr.r === rr && cr.c === cc) &&
      !(spawn.r === rr && spawn.c === cc);

    // Spawn roaming bats — count scales with the bigger maze & level depth.
    const bats: { x: number; y: number; vx: number; vy: number; dead: boolean }[] = [];
    const batTarget = 4 + idx; // 4 on level 1 → 8 on level 5
    let attempts = 0;
    while (bats.length < batTarget && attempts < 300) {
      attempts++;
      const rr = 1 + Math.floor(Math.random() * (ROWS - 2));
      const cc = 1 + Math.floor(Math.random() * (COLS - 2));
      const far = Math.abs(rr - spawn.r) + Math.abs(cc - spawn.c) >= 6;
      if (isFree(rr, cc) && far) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.5 + Math.random() * 0.25;
        bats.push({ x: cc * TILE + TILE / 2, y: rr * TILE + TILE / 2, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dead: false });
      }
    }

    // Scatter coins + heart pickups
    const coins: { x: number; y: number; taken: boolean }[] = [];
    attempts = 0;
    while (coins.length < 8 && attempts < 250) {
      attempts++;
      const rr = 1 + Math.floor(Math.random() * (ROWS - 2));
      const cc = 1 + Math.floor(Math.random() * (COLS - 2));
      if (isFree(rr, cc)) coins.push({ x: cc * TILE + TILE / 2, y: rr * TILE + TILE / 2, taken: false });
    }
    const hearts: { x: number; y: number; taken: boolean }[] = [];
    attempts = 0;
    while (hearts.length < 2 && attempts < 80) {
      attempts++;
      const rr = 1 + Math.floor(Math.random() * (ROWS - 2));
      const cc = 1 + Math.floor(Math.random() * (COLS - 2));
      if (isFree(rr, cc)) hearts.push({ x: cc * TILE + TILE / 2, y: rr * TILE + TILE / 2, taken: false });
    }

    levelStateRef.current = {
      walls, waters, barrels, bridges, crates, doorTile, gateTile, chestTiles,
      npcs, bats, coins, hearts, decos: [], gateOpened: false, mazeLayout: layout,
    };
    bombsRef.current = [];
    scorchRef.current = [];
    bombCooldownRef.current = 0;
    hurtCooldownRef.current = 0;
    hitFlashRef.current = 0;
    shakeRef.current = 0;
    dmgPopupsRef.current = [];
    // Each level is a fresh maze, so its revealed map resets too.
    mapRevealedRef.current = false;
    setMapRevealed(false);
    setChestReward(null);
    playerRef.current = {
      x: spawn.c * TILE + TILE / 2,
      y: spawn.r * TILE + TILE / 2,
      dir: "down",
      frame: 0,
    };
    // center camera on spawn immediately
    cameraRef.current = {
      x: clamp(playerRef.current.x * ZOOM - VIEW_W / 2, 0, W * ZOOM - VIEW_W),
      y: clamp(playerRef.current.y * ZOOM - VIEW_H / 2, 0, H * ZOOM - VIEW_H),
    };
  }

  // ── Keyboard ──
  useEffect(() => {
    if (stage !== "playing") return;
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [stage]);

  // ── Player takes damage (bat contact or own bomb) ──
  // On-screen control helpers (touch + mouse) — set/clear a key in keysRef
  const holdKey = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[key] = true; },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[key] = false; },
    onPointerLeave: () => { keysRef.current[key] = false; },
    onPointerCancel: () => { keysRef.current[key] = false; },
  });
  const tapBomb = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keysRef.current[" "] = true;
      setTimeout(() => { keysRef.current[" "] = false; }, 90);
    },
  };

  // Knockback that NEVER pushes the player into a solid tile (prevents the
  // "stuck / can't move" bug after a blast goes off next to a wall).
  const safeKnockback = (amount: number) => {
    const p = playerRef.current;
    const ls = levelStateRef.current;
    let kx = 0;
    let ky = 0;
    if (p.dir === "up") ky = amount;
    else if (p.dir === "down") ky = -amount;
    else if (p.dir === "left") kx = amount;
    else kx = -amount;
    const sx = Math.sign(kx);
    for (let i = 0; i < Math.abs(kx); i++) {
      if (solidAt(ls, p.x + sx, p.y)) break;
      p.x += sx;
    }
    const sy = Math.sign(ky);
    for (let i = 0; i < Math.abs(ky); i++) {
      if (solidAt(ls, p.x, p.y + sy)) break;
      p.y += sy;
    }
  };

  const damagePlayer = () => {
    if (hurtCooldownRef.current > 0) return; // still invulnerable from the last hit
    hurtCooldownRef.current = 95; // brief invulnerability (sprite blinks)
    // "Bị tấn công" feedback: red screen flash, camera shake, floating damage.
    hitFlashRef.current = 30;
    shakeRef.current = 16;
    dmgPopupsRef.current.push({
      x: playerRef.current.x,
      y: playerRef.current.y - 16,
      t: 52,
      text: "-1 ♥",
      color: "#f43f5e",
    });
    safeKnockback(24);
    setLives((lv) => {
      const n = Math.max(0, lv - 1);
      if (n === 0) setTimeout(() => setStage("gameover"), 0);
      return n;
    });
  };

  // ── Treasure chest: random reward (gold / extra life / maze map) ──
  const showChestReward = (icon: string, title: string, desc: string, tone: "gold" | "life" | "map") => {
    setChestReward({ icon, title, desc, tone });
    if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
    rewardTimerRef.current = window.setTimeout(() => setChestReward(null), 2800);
  };
  const openChestReward = () => {
    // Weighted pool. The maze map only appears while it is still hidden.
    const pool: ("gold" | "life" | "map")[] = ["gold", "gold", "gold", "life", "life"];
    if (!mapRevealedRef.current) pool.push("map", "map");
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick === "gold") {
      const gold = 40 + Math.floor(Math.random() * 5) * 10; // 40..80
      setExp((e) => e + gold);
      showChestReward("💰", `+${gold} Vàng`, "Kho báu lấp lánh bên trong rương!", "gold");
    } else if (pick === "life") {
      setLives((lv) => Math.min(MAX_LIVES, lv + 1));
      showChestReward("❤️", "+1 Mạng", "Một trái tim hồi sinh xuất hiện!", "life");
    } else {
      mapRevealedRef.current = true;
      setMapRevealed(true);
      showChestReward("🗺️", "Bản đồ mê cung", "Toàn cảnh mê cung đã hiện ở bảng bên phải!", "map");
    }
  };

  // ── Render & update loop ──
  useEffect(() => {
    if (stage !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let tick = 0;
    let lastTriggerCooldown = 0;

    const update = () => {
      const lvl = LEVELS[currentLevel];
      const ls = levelStateRef.current;
      const player = playerRef.current;
      const cls = CLASSES.find((c) => c.id === selectedClass)!;
      const baseSpeed = cls.id === "ranger" ? 2.5 : cls.id === "warrior" ? 1.6 : 2.1;

      if (bombCooldownRef.current > 0) bombCooldownRef.current--;
      if (hurtCooldownRef.current > 0) hurtCooldownRef.current--;

      if (!pausedRef.current) {
        let dx = 0;
        let dy = 0;
        const k = keysRef.current;
        if (k["w"] || k["arrowup"]) { dy -= baseSpeed; player.dir = "up"; }
        if (k["s"] || k["arrowdown"]) { dy += baseSpeed; player.dir = "down"; }
        if (k["a"] || k["arrowleft"]) { dx -= baseSpeed; player.dir = "left"; }
        if (k["d"] || k["arrowright"]) { dx += baseSpeed; player.dir = "right"; }

        // X axis — move, else auto-push the crate/rock directly ahead
        if (dx !== 0) {
          const nextX = clamp(player.x + dx, 6, W - 6);
          if (!solidAt(ls, nextX, player.y)) player.x = nextX;
          else if (tryPush(ls, player.x, player.y, Math.sign(dx), 0)) {
            // crate/rock slid; nudge player into the freed space
            if (!solidAt(ls, player.x + Math.sign(dx) * 2, player.y)) player.x += Math.sign(dx) * 2;
          }
        }
        // Y axis
        if (dy !== 0) {
          const nextY = clamp(player.y + dy, 6, H - 6);
          if (!solidAt(ls, player.x, nextY)) player.y = nextY;
          else if (tryPush(ls, player.x, player.y, 0, Math.sign(dy))) {
            if (!solidAt(ls, player.x, player.y + Math.sign(dy) * 2)) player.y += Math.sign(dy) * 2;
          }
        }

        movingRef.current = dx !== 0 || dy !== 0;
        if (dx !== 0 || dy !== 0) player.frame = (player.frame + 1) % 60;

        // Safety net: if the player ever ends up embedded in a solid (edge cases
        // around blasts / pushes), ease them back out so they can never freeze.
        if (solidAt(ls, player.x, player.y)) {
          const nudges = [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3], [3, -3], [-3, 3]];
          for (const [ox, oy] of nudges) {
            if (!solidAt(ls, player.x + ox, player.y + oy)) {
              player.x = clamp(player.x + ox, 6, W - 6);
              player.y = clamp(player.y + oy, 6, H - 6);
              break;
            }
          }
        }

        // Place a bomb (Space) — snap to tile center for clean cross-blast
        if (k[" "] && bombCooldownRef.current === 0) {
          const bc = Math.floor(player.x / TILE);
          const br = Math.floor(player.y / TILE);
          bombsRef.current.push({
            x: bc * TILE + TILE / 2,
            y: br * TILE + TILE / 2,
            fuse: BOMB_FUSE,
            boom: 0,
            cells: [],
          });
          bombCooldownRef.current = BOMB_COOLDOWN;
        }

        // ── Bombs: tick fuse + Bomberman cross-blast ──
        for (const bomb of bombsRef.current) {
          if (bomb.boom > 0) { bomb.boom--; continue; }
          bomb.fuse--;
          if (bomb.fuse <= 0) {
            bomb.boom = 54; // explosion visible ~0.9s
            const bc = Math.floor(bomb.x / TILE);
            const br = Math.floor(bomb.y / TILE);
            // compute flame cells: center + 4 directions up to BOMB_RANGE, stopped by walls
            const cells: { r: number; c: number }[] = [{ r: br, c: bc }];
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            for (const [ddc, ddr] of dirs) {
              for (let step = 1; step <= BOMB_RANGE; step++) {
                const cc = bc + ddc * step;
                const cr = br + ddr * step;
                if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) break;
                if (ls.walls[cr][cc]) break; // hard wall stops fire
                cells.push({ r: cr, c: cc });
                // destroy crate / rock caught in the blast, then fire stops
                const crateIdx = ls.crates.findIndex((cr2) => cr2.r === cr && cr2.c === cc);
                if (crateIdx >= 0) {
                  ls.crates.splice(crateIdx, 1);
                  ls.coins.push({ x: cc * TILE + TILE / 2, y: cr * TILE + TILE / 2, taken: false });
                  break;
                }
                if (ls.barrels[cr][cc]) {
                  ls.barrels[cr][cc] = false;
                  // rocks shatter into a coin too (so blasting them is rewarding)
                  ls.coins.push({ x: cc * TILE + TILE / 2, y: cr * TILE + TILE / 2, taken: false });
                  break;
                }
              }
            }
            bomb.cells = cells;
            for (const cell of cells) scorchRef.current.push({ x: cell.c * TILE + TILE / 2, y: cell.r * TILE + TILE / 2, t: 200 });
            // kill bats standing on flame cells
            for (const bat of ls.bats) {
              if (bat.dead) continue;
              const btr = Math.floor(bat.y / TILE);
              const btc = Math.floor(bat.x / TILE);
              if (cells.some((c2) => c2.r === btr && c2.c === btc)) {
                bat.dead = true;
                setExp((e) => e + 30);
              }
            }
            // hurt player only if standing in the blast
            const ptr = Math.floor(player.y / TILE);
            const ptc = Math.floor(player.x / TILE);
            if (hurtCooldownRef.current === 0 && cells.some((c2) => c2.r === ptr && c2.c === ptc)) {
              damagePlayer();
            }
          }
        }
        bombsRef.current = bombsRef.current.filter((b) => !(b.fuse <= 0 && b.boom <= 0));
        scorchRef.current = scorchRef.current.filter((s) => --s.t > 0);

        // ── Bats: roam, gently home in when the player is near, damage on contact ──
        for (const bat of ls.bats) {
          if (bat.dead) continue;
          const distToPlayer = Math.hypot(bat.x - player.x, bat.y - player.y);
          // within ~5 tiles, nudge velocity toward the player (line-of-sight not required)
          if (distToPlayer < 160) {
            bat.vx += Math.sign(player.x - bat.x) * 0.03;
            bat.vy += Math.sign(player.y - bat.y) * 0.03;
            // clamp speed so they stay catchable
            const sp = Math.hypot(bat.vx, bat.vy) || 1;
            const max = 0.95;
            if (sp > max) { bat.vx = (bat.vx / sp) * max; bat.vy = (bat.vy / sp) * max; }
          }
          const nx = bat.x + bat.vx;
          const ny = bat.y + bat.vy;
          if (nx < 12 || nx > W - 12 || solidAt(ls, nx, bat.y)) bat.vx *= -1;
          else bat.x = nx;
          if (ny < 12 || ny > H - 12 || solidAt(ls, bat.x, ny)) bat.vy *= -1;
          else bat.y = ny;
          if (hurtCooldownRef.current === 0 && distToPlayer < 16) {
            damagePlayer();
          }
        }

        // Coin pickup
        for (const coin of ls.coins) {
          if (coin.taken) continue;
          if (Math.hypot(coin.x - player.x, coin.y - player.y) < 16) {
            coin.taken = true;
            setExp((e) => e + 10);
          }
        }
        // Heart pickup (restore a life, max 3)
        for (const h of ls.hearts) {
          if (h.taken) continue;
          if (Math.hypot(h.x - player.x, h.y - player.y) < 16) {
            h.taken = true;
            setLives((lv) => Math.min(MAX_LIVES, lv + 1));
          }
        }

        // Treasure pickup
        for (const chest of ls.chestTiles) {
          if (chest.opened) continue;
          const cx = chest.c * TILE + TILE / 2;
          const cy = chest.r * TILE + TILE / 2;
          if (Math.hypot(cx - player.x, cy - player.y) < 18) {
            chest.opened = true;
            setKeysCollected((k2) => k2 + 1);
            openChestReward(); // 💰 vàng | ❤️ mạng | 🗺️ bản đồ
          }
        }

        // Quiz gate trigger
        if (lastTriggerCooldown > 0) lastTriggerCooldown--;
        if (ls.gateTile && !ls.gateOpened && lastTriggerCooldown === 0) {
          const gx = ls.gateTile.c * TILE + TILE / 2;
          const gy = ls.gateTile.r * TILE + TILE / 2;
          if (Math.hypot(gx - player.x, gy - player.y) < 22) {
            const qIdx = currentLevel % quizzes.length;
            setActiveGateQIndex(qIdx);
            setSelectedAnswer(null);
            setFeedback(null);
            lastTriggerCooldown = 60;
          }
        }

        // Door entry (only after gate opened)
        if (ls.doorTile && ls.gateOpened) {
          const dx2 = ls.doorTile.c * TILE + TILE / 2;
          const dy2 = ls.doorTile.r * TILE + TILE / 2;
          if (Math.hypot(dx2 - player.x, dy2 - player.y) < 18) {
            // Trigger transition
            if (currentLevel + 1 >= LEVELS.length) {
              setStage("victory");
            } else {
              setStage("transition");
            }
          }
        }
      }

      // ─── Render ───
      const A = assetsRef.current;

      // Camera follows the player (world is zoomed + larger than the viewport)
      const cam = cameraRef.current;
      const targetX = clamp(player.x * ZOOM - VIEW_W / 2, 0, W * ZOOM - VIEW_W);
      const targetY = clamp(player.y * ZOOM - VIEW_H / 2, 0, H * ZOOM - VIEW_H);
      cam.x += (targetX - cam.x) * 0.12; // smooth follow
      cam.y += (targetY - cam.y) * 0.12;

      // Camera shake when hit (decays each frame).
      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current > 0) {
        shakeRef.current--;
        const mag = shakeRef.current * 0.45;
        shakeX = (Math.random() - 0.5) * mag * 2;
        shakeY = (Math.random() - 0.5) * mag * 2;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.setTransform(ZOOM, 0, 0, ZOOM, -cam.x + shakeX, -cam.y + shakeY);
      ctx.imageSmoothingEnabled = false;

      drawLevel(ctx, lvl, ls, tick, A);

      // Scorch marks (ground decals) under everything else
      for (const s of scorchRef.current) {
        if (A.scorch && A.scorch.width) {
          ctx.save();
          ctx.globalAlpha = Math.min(0.7, s.t / 120);
          ctx.drawImage(A.scorch, s.x - 16, s.y - 16, 32, 32);
          ctx.restore();
        }
      }

      // Coins + hearts pickups
      for (const coin of ls.coins) {
        if (coin.taken) continue;
        drawSpriteCentered(ctx, A.coin, coin.x, coin.y + Math.sin(tick * 0.15) * 1.5, 1.5);
      }
      for (const h of ls.hearts) {
        if (h.taken) continue;
        drawSpriteCentered(ctx, A.heart, h.x, h.y + Math.sin(tick * 0.15) * 1.5, 1.6);
      }

      // Bats (monsters) — skip dead
      for (const bat of ls.bats) {
        if (bat.dead) continue;
        drawBat(ctx, bat.x, bat.y, tick, A);
      }

      // Bombs (fuse) + Bomberman cross-blast flames
      for (const bomb of bombsRef.current) {
        if (bomb.boom > 0) {
          const elapsed = 54 - bomb.boom;
          const frame = Math.floor(elapsed / 4) % EXPLO_FRAMES; // loop flames for the whole blast
          for (const cell of bomb.cells) {
            const cx = cell.c * TILE + TILE / 2;
            const cy = cell.r * TILE + TILE / 2;
            drawFlameCell(ctx, A, cx, cy, frame, tick);
          }
        } else {
          // fuse animation (bombSheet 2 frames) — drawn bigger + glow
          const f = Math.floor(tick / 8) % 2;
          const dw = BOMB_FW * 2.4;
          // pulsing danger glow
          const near = bomb.fuse < 36;
          const glowR = 16 + (near ? Math.abs(Math.sin(tick * 0.4)) * 6 : Math.abs(Math.sin(tick * 0.15)) * 3);
          const grd = ctx.createRadialGradient(bomb.x, bomb.y, 2, bomb.x, bomb.y, glowR);
          grd.addColorStop(0, near ? "rgba(239,68,68,0.5)" : "rgba(251,191,36,0.35)");
          grd.addColorStop(1, "rgba(251,191,36,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(bomb.x, bomb.y, glowR, 0, Math.PI * 2);
          ctx.fill();
          if (A.bombSheet && A.bombSheet.width) {
            ctx.drawImage(A.bombSheet, f * BOMB_FW, 0, BOMB_FW, 12, bomb.x - dw / 2, bomb.y - dw / 2 - 2, dw, dw);
          } else {
            ctx.fillStyle = "#1f2937";
            ctx.beginPath();
            ctx.arc(bomb.x, bomb.y, 9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // NPCs (other players) — sorted with player by Y for depth
      const drawables: { y: number; fn: () => void }[] = [];
      for (const npc of ls.npcs) {
        const ncls = CLASSES.find((c) => c.id === npc.cls)!;
        const nx = npc.c * TILE + TILE / 2;
        const ny = npc.r * TILE + TILE / 2;
        drawables.push({
          y: ny,
          fn: () => drawPlayerSprite(ctx, A[`player_${ncls.id}`], nx, ny, "down", false, tick, npc.name, false, A.shadow),
        });
      }
      const hurt = hurtCooldownRef.current > 0;
      drawables.push({
        y: player.y,
        fn: () =>
          drawPlayerSprite(ctx, A[`player_${cls.id}`], player.x, player.y, player.dir, movingRef.current, tick, playerName + " (Bạn)", true, A.shadow, hurt),
      });
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

      // Floating damage numbers (rise + fade) — drawn in world space.
      dmgPopupsRef.current = dmgPopupsRef.current.filter((p) => p.t > 0);
      for (const p of dmgPopupsRef.current) {
        p.t--;
        p.y -= 0.4;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.t / 26);
        ctx.fillStyle = p.color;
        ctx.font = "bold 11px 'DM Sans', system-ui";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }

      // "Bị tấn công" red vignette flash — drawn in screen space, on top.
      if (hitFlashRef.current > 0) {
        hitFlashRef.current--;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const a = (hitFlashRef.current / 30) * 0.55;
        const grd = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.28, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78);
        grd.addColorStop(0, "rgba(220,38,38,0)");
        grd.addColorStop(1, `rgba(220,38,38,${a})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      tick++;
      animFrameRef.current = requestAnimationFrame(update);
    };

    update();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentLevel, selectedClass, assetsReady]);

  // ── Quiz submit ──
  const submitAnswer = () => {
    if (activeGateQIndex === null || !selectedAnswer) return;
    const q = quizzes[activeGateQIndex % quizzes.length];
    const correct = selectedAnswer === q.correctAnswer;
    if (correct) {
      levelStateRef.current.gateOpened = true;
      setExp((e) => e + 50);
      setFeedback({ correct: true, text: `🎉 Chính xác! +50 XP. Cánh cửa cuối hành lang đã mở. ${q.explanation}` });
    } else {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      // Knock back (collision-safe — never embeds the player in a wall)
      safeKnockback(26);
      setFeedback({
        correct: false,
        text: `❌ Sai! Đáp án đúng: "${q.correctAnswer}". Mất 1 mạng. ${q.explanation}`,
      });
      if (newLives === 0) {
        setTimeout(() => {
          setActiveGateQIndex(null);
          setStage("gameover");
        }, 1500);
      }
    }
  };

  const closeGateModal = () => {
    setActiveGateQIndex(null);
    setSelectedAnswer(null);
    setFeedback(null);
  };

  // Save a checkpoint at the start of the NEXT level each time a level is cleared.
  useEffect(() => {
    if (stage !== "transition") return;
    const next = currentLevel + 1;
    if (next >= LEVELS.length) return; // last level → victory handles it
    const p: SavedProgress = { level: next, lives, exp, keys: keysCollected, cls: selectedClass, name: playerName };
    setSavedProgress(p);
    persistProgress(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Beating the whole maze clears the checkpoint.
  useEffect(() => {
    if (stage === "victory") {
      setSavedProgress(null);
      persistProgress(null);
    }
  }, [stage]);

  const enterNextLevel = () => {
    setCurrentLevel((c) => c + 1);
    setStage("playing");
  };

  // Leave to the lobby WITHOUT wiping the run — the checkpoint stays so the
  // player can pick "Chơi tiếp" instead of starting from level 1.
  const goToLobby = () => setStage("select");

  const startNewGame = () => {
    setCurrentLevel(0);
    setLives(MAX_LIVES);
    setExp(0);
    setKeysCollected(0);
    setChestReward(null);
    setMapRevealed(false);
    mapRevealedRef.current = false;
    setSavedProgress(null);
    persistProgress(null);
    setStage("playing");
  };

  const continueGame = () => {
    const p = savedProgress;
    if (!p) {
      startNewGame();
      return;
    }
    setCurrentLevel(p.level);
    setLives(p.lives);
    setExp(p.exp);
    setKeysCollected(p.keys);
    setChestReward(null);
    setMapRevealed(false);
    mapRevealedRef.current = false;
    setStage("playing");
  };

  // ── RENDER: Interactive waiting room (Sảnh chờ) ──
  if (stage === "select") {
    return (
      <GameLobbyRoom
        assets={assetsRef.current}
        assetsReady={assetsReady}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        playerName={playerName}
        setPlayerName={setPlayerName}
        savedProgress={savedProgress}
        onReady={startNewGame}
        onContinue={continueGame}
      />
    );
  }

  // ── RENDER: Level transition (celebration) ──
  if (stage === "transition") {
    const nextLvl = LEVELS[currentLevel + 1];
    const justCompleted = LEVELS[currentLevel];
    return (
      <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] animate-fade-in">
        {/* ── Celebration hero ── */}
        <div className="relative overflow-hidden text-white text-center">
          <div aria-hidden className="absolute inset-0">
            <div className="absolute inset-0" style={{ background: "radial-gradient(120% 130% at 50% -10%, #047857 0%, #0f172a 52%, #020617 100%)" }} />
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-40 animate-glow-pulse" style={{ background: "#10b981" }} />
          </div>
          {/* confetti rain */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            {CONFETTI.map((p, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size + 3,
                  background: p.color,
                  ["--dur" as any]: `${p.dur}s`,
                  ["--delay" as any]: `${p.delay}s`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 px-6 py-8 md:py-9">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-400/15 border border-amber-300/30 mb-3 animate-pop-in">
              <span className="text-5xl animate-trophy-bob drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]">🏆</span>
            </div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 mb-2">
              <Sparkles size={13} className="text-emerald-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-200">
                Hoàn thành Màn {currentLevel + 1} / {LEVELS.length}
              </span>
            </div>
            <h2 style={{ color: "#fff" }} className="text-[26px] md:text-[34px] font-bold font-display leading-[1.08] tracking-tight text-white">
              Xuất sắc! Vượt qua <span className="text-emerald-300">{justCompleted?.name}</span> 🎉
            </h2>
            <p className="text-[13px] md:text-[14px] text-slate-300 mt-2">
              Cánh cửa kế tiếp dẫn tới <strong className="text-white">{nextLvl?.name ?? "—"}</strong>
            </p>

            {/* earned stat chips */}
            <div className="flex flex-wrap justify-center gap-2.5 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[13px] font-semibold">
                <Heart size={14} className="text-rose-400" fill="currentColor" /> {lives}/{MAX_LIVES} mạng
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[13px] font-semibold">
                <Trophy size={14} className="text-amber-400" /> {exp} XP
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[13px] font-semibold">
                <Key size={14} className="text-emerald-300" /> {keysCollected} rương
              </span>
            </div>
          </div>
        </div>

        {/* ── Next-level preview + actions ── */}
        <div className="p-5 md:p-6 grid md:grid-cols-2 gap-5 items-center">
          <div className="flex justify-center">
            {nextLvl && <LevelThumbnail lvl={nextLvl} large />}
          </div>
          <div className="space-y-3">
            <div className="rounded-[12px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)] p-4">
              <h4 className="text-[12px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
                <HelpCircle size={12} /> Gợi ý màn kế: {nextLvl?.name}
              </h4>
              <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{nextLvl?.hint}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={enterNextLevel} icon={<Play size={16} />}>
                Vào màn tiếp
              </Button>
              <Button variant="secondary" onClick={goToLobby}>
                Thoát về sảnh
              </Button>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <span>💾</span> Tiến trình đã lưu — thoát ra vẫn có thể <strong>Chơi tiếp</strong> từ màn này.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Game over ──
  if (stage === "gameover") {
    return (
      <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
          <Skull size={32} />
        </div>
        <h2 className="text-[24px] font-bold text-[var(--color-text-primary)] font-display mb-1">Game Over</h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
          Bạn đã hết mạng tại Màn {currentLevel + 1}: {LEVELS[currentLevel]?.name}
        </p>
        <div className="inline-flex items-center gap-4 mb-5 text-[13px] text-[var(--color-text-primary)]">
          <span className="flex items-center gap-1"><Trophy size={14} className="text-amber-500" /> {exp} XP</span>
          <span className="flex items-center gap-1"><Key size={14} className="text-emerald-600" /> {keysCollected} keys</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {savedProgress && (
            <Button onClick={continueGame} icon={<Play size={16} />}>
              Chơi tiếp · Màn {savedProgress.level + 1}
            </Button>
          )}
          <Button variant={savedProgress ? "secondary" : "primary"} onClick={startNewGame} icon={<Play size={16} />}>
            Chơi lại từ đầu
          </Button>
        </div>
      </div>
    );
  }

  // ── RENDER: Victory ──
  if (stage === "victory") {
    return (
      <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <Trophy size={32} />
        </div>
        <h2 className="text-[24px] font-bold text-[var(--color-text-primary)] font-display mb-1">Victory!</h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
          Chúc mừng! Bạn đã hoàn thành cả {LEVELS.length} màn của mê cung.
        </p>
        <div className="inline-flex items-center gap-4 mb-5 text-[13px] text-[var(--color-text-primary)]">
          <span className="flex items-center gap-1"><Heart size={14} className="text-rose-500" fill="currentColor" /> {lives} mạng còn</span>
          <span className="flex items-center gap-1"><Trophy size={14} className="text-amber-500" /> {exp} XP</span>
          <span className="flex items-center gap-1"><Key size={14} className="text-emerald-600" /> {keysCollected} keys</span>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={startNewGame} icon={<Play size={16} />}>Chơi lại từ đầu</Button>
        </div>
      </div>
    );
  }

  // ── RENDER: Playing ──
  const lvl = LEVELS[currentLevel];
  return (
    <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)]">
      {/* HUD */}
      <div className="bg-[var(--color-surface-container-low)] border-b border-[var(--color-border-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                className={`transition-colors ${i < lives ? "text-rose-500" : "text-slate-300"}`}
                fill={i < lives ? "currentColor" : "none"}
              />
            ))}
            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] ml-1.5">{lives}/{MAX_LIVES}</span>
          </div>
          <div className="h-5 w-px bg-[var(--color-border-default)]" />
          <div className="flex items-center gap-1.5 text-[12px]">
            <Trophy size={14} className="text-amber-500" />
            <span className="font-bold text-[var(--color-text-primary)]">{exp} XP</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px]">
            <Key size={14} className="text-[var(--color-secondary)]" />
            <span className="font-bold text-[var(--color-text-primary)]">{keysCollected}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
          <MapIcon size={14} className="text-[var(--color-primary)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">
            Màn {currentLevel + 1}/{LEVELS.length}: {lvl.name}
          </span>
          <button
            onClick={goToLobby}
            className="ml-2 px-2.5 py-1 rounded-md border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[11px] font-medium"
          >
            Về sảnh
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        <div className="lg:col-span-9 relative rounded-[12px] overflow-hidden border-2 border-slate-800/40 shadow-inner bg-slate-900">
          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            style={{ imageRendering: "pixelated" }}
            className="block w-full h-auto"
            tabIndex={0}
          />
          <div className="absolute top-2 left-2 bg-black/55 text-white text-[10px] font-mono px-2 py-1 rounded-md flex items-center gap-1 flex-wrap max-w-[70%]">
            <kbd className="bg-white/20 px-1 rounded">WASD</kbd>
            <span className="opacity-80">đi/đẩy 📦</span>
            <kbd className="bg-white/20 px-1 rounded">Space</kbd>
            <span className="opacity-80">💣</span>
          </div>

          {/* On-screen D-pad (touch + mouse) */}
          <div className="absolute bottom-3 left-3 grid grid-cols-3 grid-rows-3 gap-1 w-[126px] h-[126px] select-none touch-none opacity-90">
            <span />
            <button {...holdKey("w")} className="bg-white/80 hover:bg-white active:bg-[var(--color-primary)] active:text-white rounded-lg shadow flex items-center justify-center text-[var(--color-text-primary)] font-bold text-lg" aria-label="up">▲</button>
            <span />
            <button {...holdKey("a")} className="bg-white/80 hover:bg-white active:bg-[var(--color-primary)] active:text-white rounded-lg shadow flex items-center justify-center text-[var(--color-text-primary)] font-bold text-lg" aria-label="left">◀</button>
            <span className="bg-white/30 rounded-lg" />
            <button {...holdKey("d")} className="bg-white/80 hover:bg-white active:bg-[var(--color-primary)] active:text-white rounded-lg shadow flex items-center justify-center text-[var(--color-text-primary)] font-bold text-lg" aria-label="right">▶</button>
            <span />
            <button {...holdKey("s")} className="bg-white/80 hover:bg-white active:bg-[var(--color-primary)] active:text-white rounded-lg shadow flex items-center justify-center text-[var(--color-text-primary)] font-bold text-lg" aria-label="down">▼</button>
            <span />
          </div>

          {/* On-screen bomb button */}
          <button
            {...tapBomb}
            className="absolute bottom-5 right-5 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-white shadow-xl flex items-center justify-center text-3xl active:scale-95 transition-transform select-none touch-none"
            aria-label="Đặt bom"
            title="Đặt bom"
          >
            💣
          </button>

          {/* Treasure reward popup */}
          {chestReward && (
            <div
              key={chestReward.title + exp + lives}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 animate-reward-pop pointer-events-none"
            >
              <div
                className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border-2 shadow-xl backdrop-blur-md ${chestReward.tone === "life"
                    ? "bg-rose-50/95 border-rose-300"
                    : chestReward.tone === "map"
                      ? "bg-sky-50/95 border-sky-300"
                      : "bg-amber-50/95 border-amber-300"
                  }`}
              >
                <span className="text-3xl drop-shadow animate-bounce-soft">{chestReward.icon}</span>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Gift size={11} /> Mở rương
                  </div>
                  <div className="text-[15px] font-bold text-[var(--color-text-primary)] leading-tight font-display">
                    {chestReward.title}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-secondary)] leading-snug">{chestReward.desc}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="lg:col-span-3 flex flex-col gap-3">
          {/* Revealed maze map (treasure reward) */}
          {mapRevealed && (
            <div className="rounded-[12px] border-2 border-sky-300 bg-sky-50/60 p-3 animate-fade-in">
              <h4 className="text-[11px] uppercase font-semibold text-sky-700 tracking-wider mb-2 flex items-center gap-1.5">
                <MapIcon size={12} /> Bản đồ mê cung 🗺️
              </h4>
              <RevealedMazeMap layout={levelStateRef.current.mazeLayout} palette={lvl.palette} />
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#fbbf24" }} /> Cổng câu hỏi</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: lvl.palette.accent }} /> Cửa thoát</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#b45309" }} /> Rương báu</span>
                <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#ffffff", outline: "1px solid #cbd5e1" }} /> Điểm xuất phát</span>
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-[var(--color-border-subtle)] bg-white p-3">
            <h4 className="text-[11px] uppercase font-semibold text-[var(--color-text-secondary)] tracking-wider mb-2 flex items-center gap-1.5">
              <Compass size={12} /> Mục tiêu màn
            </h4>
            <p className="text-[12px] text-[var(--color-text-primary)] leading-relaxed mb-3">{lvl.hint}</p>
            <ul className="text-[12px] space-y-1.5">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">💡</span>
                <span className="text-[var(--color-text-primary)]">Chạm Cổng Câu Hỏi để trả lời</span>
                <span className="ml-auto text-[10px] font-mono text-[var(--color-text-secondary)]">
                  {levelStateRef.current.gateOpened ? "✓" : "0/1"}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">🚪</span>
                <span className="text-[var(--color-text-primary)]">Vào cửa sau khi mở cổng</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Gift size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="text-[var(--color-text-primary)]">Hòm vàng (tùy chọn)</span>
                <span className="ml-auto text-[10px] font-mono text-[var(--color-text-secondary)]">
                  {levelStateRef.current.chestTiles.filter((c) => c.opened).length}/
                  {levelStateRef.current.chestTiles.length}
                </span>
              </li>
            </ul>
          </div>

          {/* Mini map of all levels */}
          <div className="rounded-[12px] border border-[var(--color-border-subtle)] bg-white p-3">
            <h4 className="text-[11px] uppercase font-semibold text-[var(--color-text-secondary)] tracking-wider mb-2 flex items-center gap-1.5">
              <MapIcon size={12} /> Hành trình
            </h4>
            <ol className="space-y-1.5">
              {LEVELS.map((l, i) => {
                const done = i < currentLevel;
                const cur = i === currentLevel;
                return (
                  <li key={l.id} className="flex items-center gap-2 text-[12px]">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${cur ? "bg-[var(--color-primary)] text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-[var(--color-surface-container)] text-[var(--color-text-secondary)]"
                        }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={cur ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}>
                      {l.name}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      {/* Quiz Gate Modal */}
      {activeGateQIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[16px] shadow-2xl max-w-[560px] w-full border border-[var(--color-border-subtle)] overflow-hidden">
            <div className="bg-[var(--color-primary)] px-5 py-3.5 flex justify-between items-center">
              <h3 className="text-[15px] font-semibold text-white flex items-center gap-2 font-display">
                <HelpCircle size={18} /> Cổng Câu Hỏi · {lvl.name}
              </h3>
              <button onClick={closeGateModal} className="text-white/80 hover:text-white" title="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">
                    Cổng ánh sáng yêu cầu bạn trả lời để mở cánh cửa cuối hành lang.
                  </p>
                  <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">
                    {quizzes[activeGateQIndex % quizzes.length].question}
                  </p>
                </div>
              </div>

              {feedback ? (
                <div
                  className={`p-3.5 rounded-lg border text-[13px] leading-relaxed ${feedback.correct
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                >
                  {feedback.correct ? (
                    <CheckCircle2 size={16} className="inline mr-1.5 -mt-0.5" />
                  ) : (
                    <XCircle size={16} className="inline mr-1.5 -mt-0.5" />
                  )}
                  {feedback.text}
                </div>
              ) : (
                <div className="space-y-2">
                  {quizzes[activeGateQIndex % quizzes.length].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAnswer(opt)}
                      className={`w-full text-left p-3 rounded-lg border-2 text-[13px] transition-all flex items-start gap-2 ${selectedAnswer === opt
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text-primary)] font-semibold"
                          : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40"
                        }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--color-surface-container-low)] px-5 py-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5 text-[12px] text-[var(--color-text-secondary)]">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <Heart
                    key={i}
                    size={13}
                    className={i < lives ? "text-rose-500" : "text-slate-300"}
                    fill={i < lives ? "currentColor" : "none"}
                  />
                ))}
                <span className="ml-1">mạng</span>
              </div>
              <div className="flex gap-2">
                {feedback ? (
                  <Button onClick={closeGateModal}>Tiếp tục hành trình</Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={closeGateModal}>Rút lui</Button>
                    <Button onClick={submitAnswer} disabled={!selectedAnswer}>Xác nhận</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive waiting room (Sảnh chờ) — walkable map + chat + roster + swap
// ─────────────────────────────────────────────────────────────────────────────
const LOBBY_W = 760;
const LOBBY_H = 460;

interface LobbyNpc {
  id: string;
  cls: ClassId;
  name: string;
  role: string;
  x: number;
  y: number;
  color: string;
}
const LOBBY_NPCS: LobbyNpc[] = [
  { id: "Minh_AI", cls: "warrior", name: "Minh_AI", role: "Kiếm Sĩ · Cố vấn AI", x: 612, y: 150, color: "#34d399" },
  { id: "Linh_Code", cls: "guardian", name: "Linh_Code", role: "Shadow Assassin · AI", x: 470, y: 326, color: "#a855f7" },
];

type ChatChannel = "all" | "team" | "subject";
// sender: "system" | "you" | a bot name | a real remote player's name
interface ChatMsg { id: number; sender: string; text: string; channel: ChatChannel; }

// Scripted, instant "smart" replies — no Gemini quota burned.
function lobbyAiReply(userText: string, channel: ChatChannel, playerName: string): { sender: "Minh_AI" | "Linh_Code"; text: string } {
  const t = userText.toLowerCase();
  const who: "Minh_AI" | "Linh_Code" = Math.random() < 0.5 ? "Minh_AI" : "Linh_Code";
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)].replace(/\{name\}/g, playerName || "bạn");
  if (/(chào|hello|\bhi\b|hế lô|alo|hey)/.test(t))
    return { sender: who, text: pick(["Chào {name}! Ngồi chờ tí rồi vào mê cung nha 😎", "Hế lô {name}, vui được gặp bạn!", "Hi {name}! Sẵn sàng phá đảo chưa?"]) };
  if (/(sẵn sàng|bắt đầu|start|chơi|vào game|vào màn)/.test(t))
    return { sender: who, text: pick(["Bấm nút SẴN SÀNG góc trên phải là vào luôn!", "Tui sẵn sàng rồi, đợi {name} thôi 🔥", "Vào thôi! Nhớ né dơi và đặt bom phá đá nha."]) };
  if (channel === "subject" || /(học|câu hỏi|kiến thức|bài|đề|quiz|ôn)/.test(t))
    return { sender: who, text: pick(["Câu hỏi trong mê cung lấy từ tài liệu của bạn đó, ôn lại là qua màn ngon.", "Học qua game nhớ lâu hơn nhiều — trả lời đúng ở Cổng Câu Hỏi để mở cửa nha.", "Mỗi màn một chủ đề, trả lời sai mất 1 mạng nên cẩn thận!"]) };
  if (/(map|bản đồ|đẹp|xịn|cảnh)/.test(t))
    return { sender: who, text: pick(["Map sảnh chờ này tui thích ghê 🌳", "Mở rương trong mê cung có khi trúng nguyên cái bản đồ luôn đó!"]) };
  if (/(\?|sao|gì|thế nào|how|what|cách)/.test(t))
    return { sender: who, text: pick(["Cứ WASD đi loanh quanh, hoặc bấm 'Chạy lại gần' ở tab Người chơi nha.", "Đổi nhân vật ở tab thứ 3, mỗi lớp có chỉ số khác nhau đó {name}.", "Hỏi hay đó! Thử đi một vòng rồi bấm SẴN SÀNG xem."]) };
  return { sender: who, text: pick(["Chuẩn luôn {name}! 👍", "Haha đồng ý.", "Nghe vui đó!", "Tui hóng {name} phá đảo đây 😄", "Ừ đúng rồi đó."]) };
}

const AMBIENT_LINES: { sender: "Minh_AI" | "Linh_Code"; text: string }[] = [
  { sender: "Minh_AI", text: "Ai sẵn sàng thì bấm nút góc trên nha, tui chờ nãy giờ 😆" },
  { sender: "Linh_Code", text: "Mẹo nhỏ: đặt bom cạnh đá 'B' để nhặt xu nhé." },
  { sender: "Minh_AI", text: "Nhớ tìm Cổng Câu Hỏi 💡 để mở cửa qua màn nha mọi người." },
  { sender: "Linh_Code", text: "Học tập tương tác 2D đúng kiểu vừa học vừa chơi 🎮" },
];

function drawLobbyScene(ctx: CanvasRenderingContext2D, A: Assets, tick: number) {
  const grass = A.overworld;
  for (let y = 0; y < LOBBY_H; y += TILE) {
    for (let x = 0; x < LOBBY_W; x += TILE) {
      if (grass && grass.width) {
        ctx.drawImage(grass, GRASS.sx, GRASS.sy, GRASS.size, GRASS.size, x, y, TILE, TILE);
        if (((x + y) / TILE) % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.04)";
          ctx.fillRect(x, y, TILE, TILE);
        }
        if ((x * 5 + y * 3) % 224 === 0) {
          ctx.drawImage(grass, FLOWER_TILE.sx, FLOWER_TILE.sy, FLOWER_TILE.size, FLOWER_TILE.size, x, y, TILE, TILE);
        }
      } else {
        ctx.fillStyle = ((x + y) / TILE) % 2 === 0 ? "#86efac" : "#bbf7d0";
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // Dirt path (vertical band) echoing the reference art.
  const px = LOBBY_W * 0.5;
  ctx.fillStyle = "#cdab73";
  ctx.fillRect(px - 34, 0, 68, LOBBY_H);
  ctx.fillStyle = "#b8945c";
  ctx.fillRect(px - 34, 0, 4, LOBBY_H);
  ctx.fillRect(px + 30, 0, 4, LOBBY_H);
  ctx.fillStyle = "rgba(120,86,42,0.22)";
  for (let y = 6; y < LOBBY_H; y += 26) ctx.fillRect(px - 22, y, 44, 3);
  // Decorative trees (non-blocking).
  const trees: [number, number, number][] = [
    [58, 96, 0.82], [120, 268, 0.76], [70, 410, 0.82], [704, 96, 0.86], [726, 312, 0.8], [300, 58, 0.7], [250, 430, 0.74],
  ];
  for (const [tx, ty, s] of trees) {
    const img = (tx + ty) % 2 === 0 ? A.tree : A.tree2 || A.tree;
    if (img && img.width) {
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, tx - w / 2, ty - h, w, h);
    }
  }
  // A cozy cottage in the top-right corner.
  drawBuilding(ctx, "houseRed", 1, 19);
}

interface GameLobbyRoomProps {
  assets: Assets;
  assetsReady: boolean;
  selectedClass: ClassId;
  setSelectedClass: (c: ClassId) => void;
  playerName: string;
  setPlayerName: (n: string) => void;
  savedProgress: SavedProgress | null;
  onReady: () => void;
  onContinue: () => void;
}

function GameLobbyRoom({
  assets, assetsReady, selectedClass, setSelectedClass, playerName, setPlayerName, savedProgress, onReady, onContinue,
}: GameLobbyRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<{ x: number; y: number; dir: "up" | "down" | "left" | "right"; frame: number; moving: boolean }>({
    x: 560, y: 300, dir: "down", frame: 0, moving: false,
  });
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<"chat" | "people" | "character">("chat");
  const [collapsed, setCollapsed] = useState(false);
  const [channel, setChannel] = useState<ChatChannel>("all");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 1, sender: "system", text: "Chào mừng bạn đến sảnh chờ! Di chuyển bằng phím WASD hoặc chạm/click trực tiếp lên bản đồ để đi.", channel: "all" },
    { id: 2, sender: "Minh_AI", text: "Chào mọi người, game sắp bắt đầu chưa? Ai sẵn sàng thì bấm nút nha!", channel: "all" },
    { id: 3, sender: "you", text: "Vừa mới vào sảnh đây! Đang chọn nhân vật.", channel: "all" },
    { id: 4, sender: "Linh_Code", text: "Tui chọn Shadow Assassin nha! Ẩn nấp siêu phàm luôn haha.", channel: "all" },
    { id: 5, sender: "Minh_AI", text: "Học tập tương tác 2D rất thú vị.", channel: "subject" },
  ]);
  const [input, setInput] = useState("");
  const [typingBy, setTypingBy] = useState<"Minh_AI" | "Linh_Code" | null>(null);
  const [coords, setCoords] = useState({ x: 17, y: 9 });
  const msgIdRef = useRef(6);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Multiplayer (real-time WebSocket room) ──
  type RemotePlayer = { name: string; cls: ClassId; x: number; y: number; dir: "up" | "down" | "left" | "right"; moving: boolean };
  const [roomId] = useState<string>(() => {
    if (typeof window === "undefined") return "lobby";
    const fromUrl = new URLSearchParams(window.location.search).get("room");
    if (fromUrl) return fromUrl.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "lobby";
    const gen = Math.random().toString(36).slice(2, 7).toUpperCase();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("room", gen);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
    return gen;
  });
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>("");
  const remoteRef = useRef<Map<string, RemotePlayer>>(new Map());
  const [remoteCount, setRemoteCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  // Connect to the lobby room; relay position + chat with everyone else there.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    let closed = false;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      const ws = new WebSocket(`${proto}://${window.location.host}/api/ws/lobby`);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        const p = playerRef.current;
        ws.send(JSON.stringify({ type: "join", room: roomId, name: playerName || "Bạn", cls: selectedClass, x: Math.round(p.x), y: Math.round(p.y) }));
      };
      ws.onmessage = (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "welcome") {
          myIdRef.current = msg.id;
        } else if (msg.type === "players") {
          const next = new Map<string, RemotePlayer>();
          for (const pl of msg.players || []) {
            if (pl.id === myIdRef.current) continue;
            next.set(pl.id, { name: pl.name, cls: pl.cls, x: pl.x, y: pl.y, dir: pl.dir, moving: pl.moving });
          }
          remoteRef.current = next;
          setRemoteCount(next.size);
        } else if (msg.type === "move") {
          if (msg.id === myIdRef.current) return;
          const e = remoteRef.current.get(msg.id);
          if (e) {
            e.x = msg.x;
            e.y = msg.y;
            e.dir = msg.dir;
            e.moving = msg.moving;
          }
        } else if (msg.type === "leave") {
          if (remoteRef.current.delete(msg.id)) setRemoteCount(remoteRef.current.size);
        } else if (msg.type === "chat") {
          if (msg.id === myIdRef.current) return;
          setMessages((m) => [...m, { id: msgIdRef.current++, sender: msg.name || "Người chơi", text: msg.text, channel: "all" } as ChatMsg].slice(-60));
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) reconnect = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnect) clearTimeout(reconnect);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Broadcast my name/class changes to the room.
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "rename", name: playerName || "Bạn", cls: selectedClass }));
  }, [playerName, selectedClass]);

  // Send my position (only when it actually changed) ~10x/s.
  useEffect(() => {
    let last = { x: -1, y: -1, dir: "", moving: false };
    const t = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== 1) return;
      const p = playerRef.current;
      const cur = { x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, moving: p.moving };
      if (cur.x !== last.x || cur.y !== last.y || cur.dir !== last.dir || cur.moving !== last.moving) {
        last = cur;
        ws.send(JSON.stringify({ type: "move", ...cur }));
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  // Keyboard movement (ignored while typing in a field).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keysRef.current[k] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Render + move loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let tick = 0;
    const A = assets;
    const update = () => {
      const p = playerRef.current;
      const k = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (k["w"] || k["arrowup"]) dy -= 1;
      if (k["s"] || k["arrowdown"]) dy += 1;
      if (k["a"] || k["arrowleft"]) dx -= 1;
      if (k["d"] || k["arrowright"]) dx += 1;
      if (dx || dy) targetRef.current = null;
      else if (targetRef.current) {
        const tx = targetRef.current.x - p.x;
        const ty = targetRef.current.y - p.y;
        if (Math.hypot(tx, ty) < 3) targetRef.current = null;
        else { dx = tx; dy = ty; }
      }
      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        const sp = 2.3;
        p.x = clamp(p.x + (dx / len) * sp, 18, LOBBY_W - 18);
        p.y = clamp(p.y + (dy / len) * sp, 28, LOBBY_H - 14);
        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        p.frame = (p.frame + 1) % 60;
        p.moving = true;
      } else {
        p.moving = false;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, LOBBY_W, LOBBY_H);
      ctx.imageSmoothingEnabled = false;
      drawLobbyScene(ctx, A, tick);

      const drawables: { y: number; fn: () => void }[] = [];
      for (const npc of LOBBY_NPCS) {
        drawables.push({ y: npc.y, fn: () => drawPlayerSprite(ctx, A[`player_${npc.cls}`], npc.x, npc.y, "down", false, tick, npc.name, false, A.shadow) });
      }
      // Real remote players in the same room (live positions over WebSocket).
      for (const [, rp] of remoteRef.current) {
        const sheet = A[`player_${rp.cls}`] || A["player_mage"];
        drawables.push({ y: rp.y, fn: () => drawPlayerSprite(ctx, sheet, rp.x, rp.y, rp.dir, rp.moving, tick, rp.name, false, A.shadow) });
      }
      drawables.push({ y: p.y, fn: () => drawPlayerSprite(ctx, A[`player_${selectedClass}`], p.x, p.y, p.dir, p.moving, tick, (playerName || "Bạn") + " (Bạn)", true, A.shadow) });
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

      if (tick % 12 === 0) setCoords({ x: Math.round(p.x / TILE), y: Math.round(p.y / TILE) });
      tick++;
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsReady, selectedClass, playerName]);

  // Keep the chat pinned to the newest message.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typingBy, activeTab, channel]);

  // Ambient AI chatter so the lobby feels alive.
  useEffect(() => {
    const t = setInterval(() => {
      const line = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
      setMessages((m) => [...m, { id: msgIdRef.current++, sender: line.sender, text: line.text, channel: "all" } as ChatMsg].slice(-60));
    }, 17000);
    return () => clearInterval(t);
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: msgIdRef.current++, sender: "you", text, channel } as ChatMsg].slice(-60));
    setInput("");
    // Broadcast to everyone in the room.
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "chat", text }));
    // Only fall back to bot replies when you're alone (no real players online).
    if (remoteRef.current.size === 0) {
      const reply = lobbyAiReply(text, channel, playerName);
      setTypingBy(reply.sender);
      window.setTimeout(() => {
        setTypingBy(null);
        setMessages((m) => [...m, { id: msgIdRef.current++, sender: reply.sender, text: reply.text, channel } as ChatMsg].slice(-60));
      }, 900 + Math.random() * 700);
    }
  };

  const runToNpc = (npc: LobbyNpc) => {
    targetRef.current = { x: npc.x - 28, y: npc.y + 6 };
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (LOBBY_W / rect.width);
    const y = (e.clientY - rect.top) * (LOBBY_H / rect.height);
    targetRef.current = { x: clamp(x, 18, LOBBY_W - 18), y: clamp(y, 28, LOBBY_H - 14) };
  };

  const senderColor = (s: ChatMsg["sender"]) =>
    s === "Minh_AI" ? "#34d399" : s === "Linh_Code" ? "#c084fc" : "#a5b4fc";
  const visibleMsgs = messages.filter((m) => (channel === "all" ? true : m.channel === channel || m.channel === "all"));

  const railTabs: { id: "chat" | "people" | "character"; icon: React.ReactNode; label: string }[] = [
    { id: "chat", icon: <MessageSquare size={18} />, label: "Chat" },
    { id: "people", icon: <Users size={18} />, label: "Người chơi" },
    { id: "character", icon: <User size={18} />, label: "Đổi nhân vật" },
  ];

  return (
    <div className="relative rounded-[16px] overflow-hidden border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] bg-slate-900 select-none animate-fade-in">
      <canvas
        ref={canvasRef}
        width={LOBBY_W}
        height={LOBBY_H}
        onClick={onCanvasClick}
        style={{ imageRendering: "pixelated", aspectRatio: `${LOBBY_W} / ${LOBBY_H}` }}
        className="block w-full h-auto cursor-pointer"
      />

      {/* Ready / Continue (top-right) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={() => { setShowInvite((s) => !s); setCopied(false); }}
          className="h-11 px-4 rounded-full bg-slate-900/75 backdrop-blur border border-white/15 text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition active:scale-95"
          title="Mời bạn vào phòng"
        >
          <UserPlus size={15} /> <span className="hidden sm:inline">Mời bạn</span>
        </button>
        {savedProgress && (
          <button
            onClick={onContinue}
            className="h-11 px-4 rounded-full bg-slate-900/75 backdrop-blur border border-white/15 text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition active:scale-95"
          >
            <Play size={15} /> Chơi tiếp · Màn {savedProgress.level + 1}
          </button>
        )}
        <button
          onClick={onReady}
          className="relative overflow-hidden h-11 px-6 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-[15px] tracking-wide shadow-xl shadow-indigo-600/30 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition lobby-sheen"
        >
          <Play size={18} fill="currentColor" /> SẴN SÀNG
        </button>
      </div>

      {/* Invite popover */}
      {showInvite && (
        <div className="absolute top-16 right-3 z-40 w-[min(300px,calc(100%-1.5rem))] rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl p-4 text-white animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold flex items-center gap-1.5"><QrCode size={15} className="text-indigo-300" /> Mời bạn chơi chung</span>
            <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-white/10 text-slate-300"><XIcon size={16} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-slate-300">{connected ? "Đã kết nối" : "Đang kết nối…"}</span>
            <span className="ml-auto text-slate-400">Mã phòng: <strong className="text-indigo-200 tracking-wider">{roomId}</strong></span>
          </div>
          <div className="rounded-xl bg-white p-2 flex items-center justify-center mb-2">
            <img
              alt="QR phòng chơi"
              width={180}
              height={180}
              className="rounded-lg"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`}
            />
          </div>
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* ignore */
              }
            }}
            className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition active:scale-95"
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? "Đã sao chép link!" : "Sao chép link mời"}
          </button>
          <p className="text-[10px] text-slate-400 leading-relaxed mt-2">
            Quét QR hoặc gửi link để vào cùng phòng. Lưu ý: bạn bè ở máy khác chỉ vào được khi app chạy ở địa chỉ công khai (deploy hoặc ngrok/cloudflared) — link <strong>localhost</strong> chỉ mở trên máy bạn.
          </p>
        </div>
      )}

      {/* WASD hint (bottom-right) */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-900/70 backdrop-blur px-3 py-2 rounded-xl border border-white/10">
        {["W", "A", "S", "D"].map((k) => (
          <kbd key={k} className="text-[11px] font-bold text-white bg-white/15 rounded px-1.5 py-0.5">{k}</kbd>
        ))}
        <span className="text-[11px] text-slate-300 ml-1.5">hoặc Click chuột để di chuyển</span>
      </div>

      {/* Left dock — collapses to a single small floating button to save space */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          title="Mở phòng chat"
          className="absolute bottom-3 left-3 z-20 w-12 h-12 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 border border-white/15 flex items-center justify-center hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all"
        >
          <MessageSquare size={20} />
        </button>
      ) : (
        <div className="absolute top-3 left-3 bottom-3 z-20 flex max-w-[calc(100%-1.5rem)]">
          {/* icon rail */}
          <div className="w-14 shrink-0 rounded-l-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 flex flex-col items-center py-3 gap-2">
            {railTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                title={t.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${activeTab === t.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "text-slate-300 hover:bg-white/10"
                  }`}
              >
                {t.icon}
              </button>
            ))}
            <button
              onClick={() => setCollapsed(true)}
              title="Thu gọn"
              className="mt-auto w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/10 transition"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* panel */}
          <div className="w-[330px] max-w-[calc(100%-3.5rem)] rounded-r-2xl bg-slate-900/85 backdrop-blur-md border-y border-r border-white/10 flex flex-col text-white overflow-hidden">
            {activeTab === "chat" && (
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-indigo-300" />
                    <span className="text-[12px] font-semibold tracking-wide uppercase">Phòng Chat Sảnh Chờ</span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                    <Radio size={11} className="animate-glow-pulse" /> LIVE AI
                  </span>
                </div>
                <div className="px-3 pt-2.5 flex gap-1.5">
                  {([["all", "Tất cả"], ["team", "Đồng đội"], ["subject", "Môn học"]] as [ChatChannel, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setChannel(id)}
                      className={`text-[12px] font-semibold px-3 py-1 rounded-full transition ${channel === id ? "bg-indigo-500 text-white" : "bg-white/8 text-slate-300 hover:bg-white/15"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-hide">
                  {visibleMsgs.map((m) => {
                    if (m.sender === "system") {
                      return (
                        <div key={m.id} className="text-[11px] text-slate-300 italic leading-relaxed bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                          {m.text}
                        </div>
                      );
                    }
                    const mine = m.sender === "you";
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] font-semibold mb-0.5" style={{ color: mine ? "#a5b4fc" : senderColor(m.sender) }}>
                          {mine ? "Bạn" : m.sender}
                        </span>
                        <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-[12.5px] leading-snug ${mine ? "bg-indigo-500 text-white rounded-br-sm" : "bg-white/12 text-slate-100 rounded-bl-sm"
                          }`}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                  {typingBy && (
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-semibold mb-0.5" style={{ color: senderColor(typingBy) }}>{typingBy}</span>
                      <div className="bg-white/12 px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                        <span className="typing-dot" />
                        <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                        <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5 border-t border-white/10 flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 200))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                    placeholder="Ấn để nhập chữ..."
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder:text-slate-400 focus:outline-none focus:bg-white/15 focus:border-indigo-400/50"
                  />
                  <button
                    onClick={handleSend}
                    className="w-10 h-10 shrink-0 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition active:scale-95"
                    aria-label="Gửi"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}

            {activeTab === "people" && (
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <Users size={15} className="text-indigo-300" />
                  <span className="text-[12px] font-semibold tracking-wide uppercase">Người chơi tham gia</span>
                  <span className="ml-auto text-[11px] text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {LOBBY_NPCS.length + 1 + remoteCount} online
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                  {/* You */}
                  <div className="rounded-xl bg-white/8 border border-indigo-400/30 p-2.5 flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      <CharacterSprite cls={selectedClass} scale={1.7} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold flex items-center gap-1.5 truncate">
                        {playerName || "Bạn"}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 shrink-0">Bạn</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{CLASSES.find((c) => c.id === selectedClass)?.name} · Người chơi</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> Tọa độ ({coords.x}, {coords.y})
                      </div>
                    </div>
                  </div>
                  {/* Real remote players in the room */}
                  {[...remoteRef.current.entries()].map(([rid, rp]) => (
                    <div key={rid} className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-2.5 flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        <CharacterSprite cls={rp.cls} scale={1.7} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate flex items-center gap-1.5">
                          {rp.name}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 shrink-0">Người chơi thật</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{CLASSES.find((c) => c.id === rp.cls)?.name || rp.cls} · Online</div>
                      </div>
                    </div>
                  ))}
                  {/* AI participants */}
                  {LOBBY_NPCS.map((npc) => (
                    <div key={npc.id} className="rounded-xl bg-white/8 border border-white/10 p-2.5 flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        <CharacterSprite cls={npc.cls} scale={1.7} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate" style={{ color: npc.color }}>{npc.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{npc.role}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> Tọa độ ({Math.round(npc.x / TILE)}, {Math.round(npc.y / TILE)})
                        </div>
                      </div>
                      <button
                        onClick={() => runToNpc(npc)}
                        className="shrink-0 text-[11px] font-semibold px-2.5 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 flex items-center gap-1 transition active:scale-95"
                        title={`Chạy lại gần ${npc.name}`}
                      >
                        <Navigation size={12} /> Chạy lại gần
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "character" && (
              <>
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <User size={15} className="text-indigo-300" />
                  <span className="text-[12px] font-semibold tracking-wide uppercase">Đổi Nhân Vật</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Tên hiển thị</label>
                    <input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
                      placeholder="Nhập biệt danh…"
                      className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-slate-400 focus:outline-none focus:bg-white/15 focus:border-indigo-400/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CLASSES.map((c) => {
                      const active = c.id === selectedClass;
                      const cs = CLASS_STATS[c.id];
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedClass(c.id)}
                          className={`relative rounded-xl border p-2 text-left transition ${active ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:border-white/30"
                            }`}
                        >
                          <div className="h-14 rounded-lg bg-slate-800/60 flex items-center justify-center overflow-hidden">
                            <CharacterSprite cls={c.id} scale={2.1} />
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-[12px] font-semibold text-white">
                            <span className={active ? "text-emerald-300" : "text-slate-300"}>{c.icon}</span>
                            {c.name}
                          </div>
                          <div className="flex gap-2 mt-1 text-[9px] font-mono text-slate-400">
                            <span><span className="text-rose-400">♥</span>{cs.hp}</span>
                            <span><span className="text-emerald-400">⚡</span>{cs.spd}</span>
                            <span><span className="text-amber-400">✦</span>{cs.pow}</span>
                          </div>
                          {active && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <CheckCircle2 size={10} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Nhân vật đổi ngay trên bản đồ. Bấm <strong className="text-slate-300">SẴN SÀNG</strong> ở góc trên để vào mê cung.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface SolidLS {
  walls: boolean[][];
  waters: boolean[][];
  barrels: boolean[][];
  bridges: boolean[][];
  crates: { r: number; c: number }[];
}

// Solid for movement: walls, water (unless a bridge), rocks, and crates.
function solidAt(ls: SolidLS, px: number, py: number) {
  const offsets = [
    [-9, -9], [9, -9], [-9, 9], [9, 9],
  ];
  for (const [ox, oy] of offsets) {
    const r = Math.floor((py + oy) / TILE);
    const c = Math.floor((px + ox) / TILE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    if (ls.walls[r]?.[c]) return true;
    if (ls.waters[r]?.[c] && !ls.bridges[r]?.[c]) return true;
    if (ls.barrels[r]?.[c]) return true;
    if (ls.crates.some((cr) => cr.r === r && cr.c === c)) return true;
  }
  return false;
}

// Tile-only solidity (no AABB sampling) — used when validating push targets.
function tileSolid(ls: SolidLS, r: number, c: number) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  if (ls.walls[r]?.[c]) return true;
  if (ls.waters[r]?.[c] && !ls.bridges[r]?.[c]) return true;
  if (ls.barrels[r]?.[c]) return true;
  if (ls.crates.some((cr) => cr.r === r && cr.c === c)) return true;
  return false;
}

// Auto-push the crate OR rock in the tile directly ahead of the player.
// Looks at the tile ~18px in front of the player center (so it triggers reliably on contact).
function tryPush(ls: SolidLS, px: number, py: number, sdx: number, sdy: number) {
  const fx = px + sdx * 18;
  const fy = py + sdy * 18;
  const tr = Math.floor(fy / TILE);
  const tc = Math.floor(fx / TILE);
  if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return false;
  const nr = tr + sdy;
  const nc = tc + sdx;

  // Crate?
  const crate = ls.crates.find((cr) => cr.r === tr && cr.c === tc);
  if (crate) {
    if (!tileSolid(ls, nr, nc)) {
      crate.r = nr;
      crate.c = nc;
      return true;
    }
    return false;
  }
  // Rock?
  if (ls.barrels[tr]?.[tc]) {
    if (!tileSolid(ls, nr, nc)) {
      ls.barrels[tr][tc] = false;
      ls.barrels[nr][nc] = true;
      return true;
    }
    return false;
  }
  return false;
}

// ─── Raw idle sprite (col 0, row 0 = 19x21) cropped from a player sheet ───
function CharacterSprite({ cls, scale }: { cls: ClassId; scale: number }) {
  return (
    <div
      className="relative"
      style={{
        width: PF_W * scale,
        height: PF_H * scale,
        backgroundImage: `url(${playerSheetSrc(cls)})`,
        backgroundPosition: "0px 0px",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${95 * scale}px ${210 * scale}px`,
        imageRendering: "pixelated" as any,
      }}
    />
  );
}

// ─── Sprite preview for selection cards (shows real Legend-of-Lua outfit) ───
function ChibiPreview({ cls }: { cls: CharacterClass }) {
  return (
    <div className="w-full h-20 flex items-center justify-center bg-emerald-50 rounded-[10px] border border-emerald-100 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{ backgroundImage: "radial-gradient(circle at 50% 90%, #86efac 1px, transparent 1px)", backgroundSize: "12px 12px" }}
      />
      <CharacterSprite cls={cls.id} scale={3} />
    </div>
  );
}

// ─── Stat bar (5 pips) for the featured character on the dark hero ───
function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i < value ? color : "rgba(255,255,255,0.13)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Mini thumbnail of a level — a representative (seeded) maze preview ───
function LevelThumbnail({ lvl, large = false }: { lvl: LevelDef; large?: boolean }) {
  const size = large ? 240 : 80;
  // Deterministic per-level preview so the roadmap is stable between renders.
  const preview = React.useMemo(() => generateLayout(mulberry32(lvl.id * 9973 + 17)), [lvl.id]);
  return (
    <div
      className={`rounded-[8px] overflow-hidden border-2 ${large ? "border-[var(--color-primary)]/30 shadow-md" : "border-[var(--color-border-subtle)]"}`}
      style={{ background: lvl.palette.ground, imageRendering: "pixelated" as any }}
    >
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} width={size} height={(ROWS / COLS) * size} preserveAspectRatio="none">
        {/* checker ground */}
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const ch = (preview[r]?.[c] || "#") as Tile;
            const checker = (r + c) % 2 === 0;
            let fill = checker ? lvl.palette.ground : lvl.palette.ground2;
            if (ch === "#") fill = lvl.palette.wall;
            else if (ch === "~") fill = "#3b82f6";
            else if (ch === "B") fill = "#a16207";
            else if (ch === "D") fill = lvl.palette.accent;
            else if (ch === "Q") fill = "#fbbf24";
            else if (ch === "T") fill = "#b45309";
            else if (ch === "S") fill = "#ffffff";
            else if (ch === "N") fill = "#a3a3a3";
            return <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={fill} />;
          })
        )}
      </svg>
    </div>
  );
}

// ─── Revealed maze map (treasure reward) — draws the REAL current layout ───
function RevealedMazeMap({ layout, palette }: { layout: string[]; palette: LevelPalette }) {
  if (!layout || layout.length === 0) {
    return <div className="text-[11px] text-[var(--color-text-secondary)] italic">Đang dựng bản đồ…</div>;
  }
  return (
    <div className="rounded-[8px] overflow-hidden border border-sky-200 shadow-inner" style={{ background: palette.ground }}>
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} width="100%" preserveAspectRatio="none" style={{ display: "block", imageRendering: "pixelated" as any }}>
        {layout.map((row, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const ch = (row[c] || "#") as Tile;
            const checker = (r + c) % 2 === 0;
            let fill = checker ? palette.ground : palette.ground2;
            if (ch === "#") fill = palette.wall;
            else if (ch === "~") fill = "#3b82f6";
            else if (ch === "B") fill = "#a16207";
            else if (ch === "C") fill = "#92400e";
            else if (ch === "D") fill = palette.accent;
            else if (ch === "Q") fill = "#fbbf24";
            else if (ch === "T") fill = "#b45309";
            else if (ch === "S") fill = "#ffffff";
            else if (ch === "N") fill = "#a3a3a3";
            return <rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill={fill} />;
          })
        )}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS draw helpers (Hi-Bit pixel art)
// ─────────────────────────────────────────────────────────────────────────────
type Assets = Record<string, HTMLImageElement>;

function drawLevel(
  ctx: CanvasRenderingContext2D,
  lvl: LevelDef,
  ls: {
    walls: boolean[][]; waters: boolean[][]; barrels: boolean[][]; bridges: boolean[][];
    crates: { r: number; c: number }[];
    doorTile: { r: number; c: number } | null; gateTile: { r: number; c: number } | null;
    chestTiles: { r: number; c: number; opened: boolean }[];
    decos: { type: keyof typeof DECOS; r: number; c: number }[];
    gateOpened: boolean;
  },
  tick: number,
  A: Assets
) {
  const grass = A.overworld;
  const treeWall = lvl.theme === "grass" || lvl.theme === "lake";
  // Outdoor biomes use the real grass sprite; indoor biomes (stone/library/lab)
  // use their tinted palette checker so each level looks distinct.
  const useGrass = !!grass && treeWall;

  // Ground
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      if (useGrass) {
        ctx.drawImage(grass!, GRASS.sx, GRASS.sy, GRASS.size, GRASS.size, x, y, TILE, TILE);
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(x, y, TILE, TILE);
        }
        // sprinkle flower tiles on some floor cells
        if ((r * 5 + c * 3) % 17 === 0 && !ls.walls[r][c] && !ls.waters[r][c]) {
          ctx.drawImage(grass!, FLOWER_TILE.sx, FLOWER_TILE.sy, FLOWER_TILE.size, FLOWER_TILE.size, x, y, TILE, TILE);
        }
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? lvl.palette.ground : lvl.palette.ground2;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }

  // Water (with bridge planks where walkable)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!ls.waters[r][c]) continue;
      const x = c * TILE;
      const y = r * TILE;
      if (grass) {
        ctx.drawImage(grass, WATER_TILE.sx, WATER_TILE.sy, WATER_TILE.size, WATER_TILE.size, x, y, TILE, TILE);
      } else {
        drawWaterTile(ctx, x, y, tick);
      }
      if (ls.bridges[r][c]) drawBridge(ctx, x, y);
    }
  }

  // Walls — trees for outdoor themes, textured blocks otherwise
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!ls.walls[r][c]) continue;
      const x = c * TILE;
      const y = r * TILE;
      // skip tiles covered by a building deco (drawn later)
      if (isUnderDeco(ls.decos, r, c)) continue;
      if (treeWall && A.tree && A.tree.width) {
        const img = (r + c) % 2 === 0 ? A.tree : (A.tree2 || A.tree);
        const s = 0.62;
        const w = img.width * s;
        const h = img.height * s;
        ctx.drawImage(img, x + TILE / 2 - w / 2, y + TILE - h + 6, w, h);
      } else {
        drawWallTile(ctx, x, y, lvl);
      }
    }
  }

  // Bridges that sit on non-water gaps too
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (ls.bridges[r][c] && !ls.waters[r][c]) drawBridge(ctx, c * TILE, r * TILE);

  // Pushable crates (container sprite)
  for (const cr of ls.crates) {
    drawSpriteCentered(ctx, A.container, cr.c * TILE + TILE / 2, cr.r * TILE + TILE / 2 + 2, 1.6);
  }

  // Rocks (breakable) — drawn after walls so they sit on floor
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (ls.barrels[r][c]) drawSpriteCentered(ctx, A.rock, c * TILE + TILE / 2, r * TILE + TILE / 2 + 2, 1.0);

  // Treasure chests (sprite)
  for (const chest of ls.chestTiles) {
    const img = chest.opened ? A.chestOpen : A.chestClosed;
    drawSpriteCentered(ctx, img, chest.c * TILE + TILE / 2, chest.r * TILE + TILE / 2, 1.4);
  }

  // Quiz gate (custom lightbulb pedestal — no asset)
  if (ls.gateTile && !ls.gateOpened) {
    drawQuizGate(ctx, ls.gateTile.c * TILE + TILE / 2, ls.gateTile.r * TILE + TILE / 2, tick);
  }

  // Door (lockedDoor sprite; glows green once gate solved)
  if (ls.doorTile) {
    const dx = ls.doorTile.c * TILE;
    const dy = ls.doorTile.r * TILE;
    if (ls.gateOpened) {
      const glow = 0.3 + 0.2 * Math.sin(tick * 0.15);
      ctx.fillStyle = `rgba(110, 248, 187, ${glow})`;
      ctx.fillRect(dx, dy, TILE, TILE);
    }
    if (A.door) {
      drawSpriteCentered(ctx, A.door, dx + TILE / 2, dy + TILE / 2, 1.3);
    } else {
      drawDoor(ctx, dx, dy, lvl, ls.gateOpened, tick);
    }
    // arrow hint when open
    if (ls.gateOpened) {
      ctx.fillStyle = "#065f46";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("↪", dx + TILE / 2, dy + TILE - 3);
    }
  }
}

// Whether tile (r,c) is within a building deco's 2x2 footprint (so we skip its tree/wall).
function isUnderDeco(decos: { type: keyof typeof DECOS; r: number; c: number }[], r: number, c: number) {
  return decos.some((d) => r >= d.r && r <= d.r + 1 && c >= d.c && c <= d.c + 1);
}

// Wooden bridge planks over water (walkable).
function drawBridge(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#a16207";
  ctx.fillRect(x, y + 4, TILE, TILE - 8);
  ctx.fillStyle = "#7c4a1d";
  for (let i = 0; i < TILE; i += 6) ctx.fillRect(x + i, y + 4, 1, TILE - 8);
  // side rails
  ctx.fillStyle = "#5b2a06";
  ctx.fillRect(x, y + 3, TILE, 2);
  ctx.fillRect(x, y + TILE - 5, TILE, 2);
}

// One cell of the Bomberman cross-blast — layered fiery flame (orange/red core + sprite).
function drawFlameCell(ctx: CanvasRenderingContext2D, A: Assets, cx: number, cy: number, frame: number, tick: number) {
  const flick = 0.85 + Math.abs(Math.sin((tick + cx + cy) * 0.4)) * 0.25;
  // outer red glow
  let grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 0.75 * flick);
  grd.addColorStop(0, "rgba(254,240,138,0.95)"); // yellow-white core
  grd.addColorStop(0.45, "rgba(249,115,22,0.85)"); // orange
  grd.addColorStop(0.8, "rgba(220,38,38,0.5)");   // red
  grd.addColorStop(1, "rgba(220,38,38,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, TILE * 0.75 * flick, 0, Math.PI * 2);
  ctx.fill();
  // bright hot core
  ctx.fillStyle = "rgba(255,255,240,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, TILE * 0.28 * flick, 0, Math.PI * 2);
  ctx.fill();
  // sprite flame on top (adds texture)
  if (A.explosion && A.explosion.width) {
    const dw = TILE * 1.2;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(A.explosion, frame * EXPLO_FW, 0, EXPLO_FW, 32, cx - dw / 2, cy - dw / 2, dw, dw);
    ctx.restore();
  }
}

// Crystal / gem decoration (echoes the lava-cave reference).
function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, tick: number) {
  const cx = x + TILE / 2;
  const cy = y + TILE / 2 + 4;
  const tw = Math.abs(Math.sin((tick + x) * 0.05)) * 0.25 + 0.85; // twinkle
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(tw, 1);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // cluster of 3 crystals
  const drawShard = (ox: number, h: number, w: number) => {
    ctx.beginPath();
    ctx.moveTo(ox, -h);
    ctx.lineTo(ox + w, 6);
    ctx.lineTo(ox - w, 6);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(ox - 1, -h + 3, 1.5, h - 2);
  };
  drawShard(-5, 12, 4);
  drawShard(5, 10, 3.5);
  drawShard(0, 16, 4.5);
  ctx.restore();
}

// Procedural building props (cleaner than tileset crops). Anchored at a 2x2 footprint.
function drawBuilding(ctx: CanvasRenderingContext2D, type: keyof typeof DECOS, r: number, c: number) {
  const x = c * TILE;
  const y = r * TILE;
  const w = TILE * 2;
  const OUT = "#3a2418";
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT;

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + w - 4, w / 2.4, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === "castle") {
    // stone keep with battlements + two towers
    const bx = x + 6, by = y + 18, bw = w - 12, bh = w - 24;
    ctx.fillStyle = "#9aa3ad"; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = "#6b7280"; ctx.fillRect(bx, by + bh - 8, bw, 8);
    // battlements
    ctx.fillStyle = "#9aa3ad";
    for (let i = 0; i < 4; i++) { ctx.fillRect(bx + i * (bw / 4), by - 7, bw / 4 - 3, 7); ctx.strokeRect(bx + i * (bw / 4), by - 7, bw / 4 - 3, 7); }
    // towers
    for (const tx of [x, x + w - 14]) {
      ctx.fillStyle = "#b0b8c1"; ctx.fillRect(tx, y + 8, 14, w - 12); ctx.strokeRect(tx, y + 8, 14, w - 12);
      ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.moveTo(tx - 2, y + 8); ctx.lineTo(tx + 7, y - 4); ctx.lineTo(tx + 16, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // door
    ctx.fillStyle = "#5b3a1a"; ctx.fillRect(x + w / 2 - 6, y + w - 18, 12, 16); ctx.strokeRect(x + w / 2 - 6, y + w - 18, 12, 16);
    return;
  }

  if (type === "fountain") {
    ctx.fillStyle = "#9aa3ad"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + w - 12, w / 2.4, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + w - 13, w / 3.2, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9aa3ad"; ctx.fillRect(x + w / 2 - 3, y + 14, 6, w - 26);
    ctx.fillStyle = "#93c5fd"; ctx.beginPath(); ctx.arc(x + w / 2, y + 14, 5, 0, Math.PI * 2); ctx.fill();
    return;
  }

  if (type === "well") {
    ctx.fillStyle = "#9aa3ad"; ctx.fillRect(x + 8, y + w - 22, w - 16, 18); ctx.strokeRect(x + 8, y + w - 22, w - 16, 18);
    ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + w - 18, (w - 22) / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    // roof posts + roof
    ctx.strokeStyle = "#5b3a1a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 10, y + w - 22); ctx.lineTo(x + 10, y + 8); ctx.moveTo(x + w - 10, y + w - 22); ctx.lineTo(x + w - 10, y + 8); ctx.stroke();
    ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.moveTo(x + 2, y + 12); ctx.lineTo(x + w / 2, y - 2); ctx.lineTo(x + w - 2, y + 12); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    return;
  }

  if (type === "market") {
    // striped awning stall
    ctx.fillStyle = "#cbb49a"; ctx.fillRect(x + 6, y + 20, w - 12, w - 26); ctx.strokeRect(x + 6, y + 20, w - 12, w - 26);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 === 0 ? "#ef4444" : "#f8fafc"; ctx.fillRect(x + 2 + i * ((w - 4) / 6), y + 12, (w - 4) / 6, 10); }
    ctx.strokeRect(x + 2, y + 12, w - 4, 10);
    return;
  }

  // houseRed / houseBrown — cute cottage
  const roof = type === "houseBrown" ? "#8b5a2b" : "#dc2626";
  const wall = type === "houseBrown" ? "#e8d5b0" : "#f1e3c6";
  const bx = x + 5, by = y + 22, bw = w - 10, bh = w - 26;
  ctx.fillStyle = wall; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  // roof
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x + 1, y + 24); ctx.lineTo(x + w / 2, y + 2); ctx.lineTo(x + w - 1, y + 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  // door
  ctx.fillStyle = "#7c4a1d"; ctx.fillRect(x + w / 2 - 5, y + w - 16, 10, 14); ctx.strokeRect(x + w / 2 - 5, y + w - 16, 10, 14);
  ctx.fillStyle = "#fcd34d"; ctx.fillRect(x + w / 2 + 2, y + w - 9, 2, 2);
  // window
  ctx.fillStyle = "#7dd3fc"; ctx.fillRect(bx + 5, by + 6, 9, 9); ctx.strokeRect(bx + 5, by + 6, 9, 9);
  ctx.fillStyle = "#bae6fd"; ctx.fillRect(bx + bw - 14, by + 6, 9, 9); ctx.strokeRect(bx + bw - 14, by + 6, 9, 9);
}

// Draw an image centered at (cx,cy) so its bottom sits near cy; scale multiplies native size.
function drawSpriteCentered(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cx: number,
  cy: number,
  scale: number
) {
  if (!img || !img.width) return;
  const w = img.width * scale;
  const h = img.height * scale;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + h / 2 - 2, w / 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawWallTile(ctx: CanvasRenderingContext2D, x: number, y: number, lvl: LevelDef) {
  // Base block
  ctx.fillStyle = lvl.palette.wall;
  ctx.fillRect(x, y, TILE, TILE);
  // Shadow band bottom
  ctx.fillStyle = lvl.palette.wallDark;
  ctx.fillRect(x, y + TILE - 6, TILE, 6);
  // Highlight top
  ctx.fillStyle = withAlpha(lvl.palette.ground2, 0.35);
  ctx.fillRect(x, y, TILE, 3);
  // Brick / theme pattern
  ctx.fillStyle = lvl.palette.wallDark;
  switch (lvl.theme) {
    case "stone": {
      // brick lines
      ctx.fillRect(x, y + 12, TILE, 1);
      ctx.fillRect(x + (TILE / 2), y, 1, 12);
      ctx.fillRect(x, y + 22, TILE, 1);
      break;
    }
    case "library": {
      // wood plank lines
      ctx.fillRect(x, y + 10, TILE, 1);
      ctx.fillRect(x, y + 20, TILE, 1);
      // little book on shelf
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(x + 5, y + 4, 3, 6);
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(x + 10, y + 4, 3, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + 15, y + 4, 3, 6);
      break;
    }
    case "lab": {
      // tech panel
      ctx.fillRect(x + 6, y + 6, TILE - 12, 2);
      ctx.fillStyle = lvl.palette.detail;
      ctx.fillRect(x + 10, y + 14, 4, 4);
      ctx.fillRect(x + 18, y + 14, 4, 4);
      break;
    }
    case "lake": {
      // hedge texture
      ctx.fillRect(x + 4, y + 4, 4, 4);
      ctx.fillRect(x + 14, y + 8, 4, 4);
      ctx.fillRect(x + 22, y + 16, 4, 4);
      break;
    }
    default: {
      // grass hedge highlights
      ctx.fillStyle = lvl.palette.detail;
      ctx.fillRect(x + 6, y + 6, 3, 3);
      ctx.fillRect(x + 18, y + 14, 3, 3);
      ctx.fillRect(x + 12, y + 22, 3, 3);
      break;
    }
  }
}

function drawWaterTile(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(x, y, TILE, TILE);
  // ripple highlight
  ctx.fillStyle = "#93c5fd";
  const off = Math.floor((tick / 18) % 4) * 6;
  ctx.fillRect(x + 4 + off, y + 8, 8, 1);
  ctx.fillRect(x + 10 + off, y + 20, 6, 1);
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(x, y + TILE - 2, TILE, 2);
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, lvl: LevelDef, opened: boolean, tick: number) {
  // door frame
  ctx.fillStyle = lvl.palette.wallDark;
  ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 4);
  // door body
  ctx.fillStyle = opened ? lvl.palette.accent : "#7c2d12";
  ctx.fillRect(x + 6, y + 4, TILE - 12, TILE - 8);
  // handle
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(x + TILE - 12, y + TILE / 2 - 1, 3, 3);
  // glow when opened
  if (opened) {
    ctx.fillStyle = `rgba(252, 211, 77, ${0.3 + 0.2 * Math.sin(tick * 0.15)})`;
    ctx.fillRect(x, y, TILE, TILE);
  }
  // door icon
  ctx.fillStyle = "#fff";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opened ? "↪" : "🚪", x + TILE / 2, y + TILE - 8);
}

function drawQuizGate(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  // pedestal
  ctx.fillStyle = "#475569";
  ctx.fillRect(x - 8, y + 6, 16, 6);
  // light pillar
  const pulse = 0.45 + 0.35 * Math.sin(tick * 0.12);
  ctx.fillStyle = `rgba(96, 165, 250, ${pulse})`;
  ctx.fillRect(x - 4, y - 10, 8, 16);
  // bulb
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 1;
  ctx.stroke();
  // ? mark
  ctx.fillStyle = "#92400e";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("?", x, y - 6);
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, opened: boolean) {
  if (opened) {
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(x - 8, y - 4, 16, 8);
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✓", x, y + 3);
    return;
  }
  // base
  ctx.fillStyle = "#92400e";
  ctx.fillRect(x - 9, y - 4, 18, 12);
  // lid
  ctx.fillStyle = "#b45309";
  ctx.fillRect(x - 9, y - 8, 18, 6);
  // lock
  ctx.fillStyle = "#fcd34d";
  ctx.fillRect(x - 2, y - 4, 4, 5);
  // outline
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 9, y - 8, 18, 16);
}

// ─── Player sprite (Legend of Lua animated sheet, 19x21 frames) ───
function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement | undefined,
  x: number,
  y: number,
  dir: "up" | "down" | "left" | "right",
  moving: boolean,
  tick: number,
  label: string,
  isPlayer: boolean,
  shadow?: HTMLImageElement,
  hurt: boolean = false
) {
  const dw = PF_W * PLAYER_SCALE;
  const dh = PF_H * PLAYER_SCALE;
  const footY = y + dh / 2 - 4;
  // While invulnerable after a hit, blink the sprite so the damage reads clearly.
  const blinkHidden = hurt && Math.floor(tick / 4) % 2 === 0;

  // shadow
  if (shadow && shadow.width) {
    const sw = shadow.width * PLAYER_SCALE;
    const sh = shadow.height * PLAYER_SCALE;
    ctx.drawImage(shadow, x - sw / 2, footY - sh / 2 + 2, sw, sh);
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, footY, dw / 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sheet && sheet.width && !blinkHidden) {
    // row 0 = walk down, row 1 = walk up; left/right reuse down row (flipped for left)
    const row = dir === "up" ? 1 : 0;
    const col = moving ? Math.floor(tick / 8) % 2 : 0;
    const sx = col * PF_W;
    const sy = row * PF_H;
    const flip = dir === "left";
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (hurt) ctx.globalAlpha = 0.9;
    if (flip) {
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, sx, sy, PF_W, PF_H, -dw / 2, y - dh / 2 - 4, dw, dh);
    } else {
      ctx.drawImage(sheet, sx, sy, PF_W, PF_H, x - dw / 2, y - dh / 2 - 4, dw, dh);
    }
    ctx.restore();
    // Red hit ring around the sprite while invulnerable (does not tint the map).
    if (hurt) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, dw / 2.2, dh / 2.1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (!sheet || !sheet.width) {
    // fallback square if sheet missing
    ctx.fillStyle = "#4648d4";
    ctx.fillRect(x - 8, y - 10, 16, 18);
  }

  // name label
  ctx.fillStyle = isPlayer ? "#4648d4" : "#0f172a";
  ctx.font = "bold 9px 'DM Sans', system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y - dh / 2 - 6);

  // player selection ring
  if (isPlayer) {
    ctx.strokeStyle = "#4648d4";
    ctx.setLineDash([3, 2]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, footY + 2, dw / 2.4, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ─── Bat enemy (bat.png = 2 frames of 16x16) ───
function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number, A: Assets) {
  const img = A.bat;
  const scale = 1.5;
  if (img && img.width) {
    const fw = 16;
    const fh = 16;
    const frame = Math.floor(tick / 12) % 2;
    const dw = fw * scale;
    const dh = fh * scale;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y + dh / 2, dw / 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = Math.sin(tick * 0.12) * 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, frame * fw, 0, fw, fh, x - dw / 2, y - dh / 2 + bob, dw, dh);
  } else {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x - 5, y - 3, 10, 6);
  }
}

function withAlpha(hex: string, alpha: number) {
  // hex like #rrggbb
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
