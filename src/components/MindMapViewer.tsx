import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MindMapNode } from "../types";
import {
  Plus,
  Trash,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ListFilter,
  Languages,
  Wand2,
  ArrowUp,
  ChevronDown as ChevDown,
  Info,
  ThumbsDown,
  X as XIcon,
  Paintbrush,
  Search,
  Undo2,
  Redo2,
  Edit3,
  Palette,
  CopyPlus,
  FoldVertical,
  Network,
  GitBranch,
  ArrowDownFromLine,
  Building2,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

/* ═══════════════════════════════════════════════════════════════════════════
   Types & Interfaces
   ═══════════════════════════════════════════════════════════════════════════ */

interface MindMapViewerProps {
  initialData?: MindMapNode;
  onUpdate?: (updated: MindMapNode) => void;
}

type LayoutMode = "mindmap" | "tree-right" | "tree-down" | "org-chart";

interface NodePos {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  notes?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  collapsed: boolean;
  parentId?: string;
  direction?: "left" | "right";
}

interface LinkPos {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  depth: number;
  parentId: string;
  childId: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const PALETTES = [
  { id: "indigo",  ring: "#111827", nodes: ["#006a61", "#3231c1", "#1a56db"] },
  { id: "ocean",   ring: "#1a56db", nodes: ["#1a56db", "#3231c1", "#006a61"] },
  { id: "amber",   ring: "#f97316", nodes: ["#f97316", "#1a56db", "#10b981"] },
  { id: "emerald", ring: "#10b981", nodes: ["#10b981", "#1a56db", "#3231c1"] },
  { id: "violet",  ring: "#8b5cf6", nodes: ["#8b5cf6", "#1a56db", "#10b981"] },
];

const RAINBOW = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#e84393"];

const LAYOUT_OPTIONS: { id: LayoutMode; label: string; icon: React.ReactNode }[] = [
  { id: "mindmap",    label: "Mind Map",   icon: <Network size={16} /> },
  { id: "tree-right", label: "Cây ngang",  icon: <GitBranch size={16} /> },
  { id: "tree-down",  label: "Cây dọc",    icon: <ArrowDownFromLine size={16} /> },
  { id: "org-chart",  label: "Sơ đồ tổ chức", icon: <Building2 size={16} /> },
];

const NODE_HEIGHT = 44;
const ROOT_HEIGHT = 52;
const H_GAP = 200;
const V_GAP = 14;
const V_LAYOUT_GAP = 140;
const MAX_HISTORY = 50;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.08;
const DRAG_THRESHOLD = 5;

/* ═══════════════════════════════════════════════════════════════════════════
   Utility Functions
   ═══════════════════════════════════════════════════════════════════════════ */

function measureNodeWidth(label: string, isRoot: boolean): number {
  const charW = isRoot ? 10 : 8;
  const pad = isRoot ? 56 : 40;
  return Math.max(isRoot ? 150 : 110, Math.min(300, label.length * charW + pad));
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Find a node in the tree by id */
function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** Find parent node of a given id */
function findParent(root: MindMapNode, id: string): MindMapNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParent(child, id);
      if (found) return found;
    }
  }
  return null;
}

/** Check if `descendantId` is a descendant of `ancestorId` */
function isDescendant(root: MindMapNode, ancestorId: string, descendantId: string): boolean {
  const ancestor = findNode(root, ancestorId);
  if (!ancestor) return false;
  return !!findNode(ancestor, descendantId);
}

/** Remove a node from the tree (returns the removed node or null) */
function removeNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].id === id) {
        return root.children.splice(i, 1)[0];
      }
      const found = removeNode(root.children[i], id);
      if (found) return found;
    }
  }
  return null;
}

/** Collect all node ids from a subtree */
function collectIds(node: MindMapNode): string[] {
  const ids = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectIds(child));
    }
  }
  return ids;
}

/** Count visible nodes */
function countVisibleNodes(node: MindMapNode): number {
  let count = 1;
  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      count += countVisibleNodes(child);
    }
  }
  return count;
}

/** Find max depth */
function findMaxDepth(node: MindMapNode, depth: number = 0): number {
  let max = depth;
  if (node.children && !node.collapsed) {
    for (const child of node.children) {
      max = Math.max(max, findMaxDepth(child, depth + 1));
    }
  }
  return max;
}

/** Get depth color (rainbow by depth) */
function getDepthColor(depth: number, paletteNodes: string[]): string {
  if (depth === 0) return paletteNodes[0];
  return RAINBOW[(depth - 1) % RAINBOW.length];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Layout Algorithms
   ═══════════════════════════════════════════════════════════════════════════ */

function layoutMindmap(tree: MindMapNode, paletteNodes: string[]): { nodes: NodePos[]; links: LinkPos[] } {
  const nodes: NodePos[] = [];
  const links: LinkPos[] = [];

  const rootW = measureNodeWidth(tree.label, true);
  const rootH = ROOT_HEIGHT;

  // Split children into left and right groups
  const children = (!tree.collapsed && tree.children) ? tree.children : [];
  const rightChildren = children.filter((_, i) => i % 2 === 0);
  const leftChildren = children.filter((_, i) => i % 2 === 1);

  // Measure subtree heights
  function subtreeHeight(node: MindMapNode): number {
    if (node.collapsed || !node.children || node.children.length === 0) {
      return NODE_HEIGHT;
    }
    let total = 0;
    for (const child of node.children) {
      total += subtreeHeight(child);
    }
    return total + (node.children.length - 1) * V_GAP;
  }

  // Layout a branch
  function layoutBranch(
    node: MindMapNode,
    cx: number,
    cy: number,
    depth: number,
    dir: "left" | "right",
    parentId?: string
  ) {
    const isRoot = depth === 0;
    const w = measureNodeWidth(node.label, isRoot);
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;

    nodes.push({
      id: node.id,
      label: node.label,
      icon: node.icon,
      color: node.color,
      notes: node.notes,
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      depth,
      collapsed: !!node.collapsed,
      parentId,
      direction: dir,
    });

    if (!node.collapsed && node.children && node.children.length > 0) {
      const totalH = node.children.reduce((s, c) => s + subtreeHeight(c), 0)
        + (node.children.length - 1) * V_GAP;
      let startY = cy - totalH / 2;

      for (const child of node.children) {
        const childH = subtreeHeight(child);
        const childCY = startY + childH / 2;
        const childW = measureNodeWidth(child.label, false);
        const childCX = dir === "right"
          ? cx + w / 2 + H_GAP + childW / 2
          : cx - w / 2 - H_GAP - childW / 2;

        // Link
        const fromX = dir === "right" ? cx + w / 2 : cx - w / 2;
        const toX = dir === "right" ? childCX - childW / 2 : childCX + childW / 2;
        links.push({
          fromX, fromY: cy,
          toX, toY: childCY,
          depth: depth + 1,
          parentId: node.id,
          childId: child.id,
        });

        layoutBranch(child, childCX, childCY, depth + 1, dir, node.id);
        startY += childH + V_GAP;
      }
    }
  }

  // Calculate right side height
  const rightTotalH = rightChildren.reduce((s, c) => s + subtreeHeight(c), 0)
    + Math.max(0, rightChildren.length - 1) * V_GAP;
  const leftTotalH = leftChildren.reduce((s, c) => s + subtreeHeight(c), 0)
    + Math.max(0, leftChildren.length - 1) * V_GAP;

  const canvasH = Math.max(rightTotalH, leftTotalH, ROOT_HEIGHT) + 200;
  const rootCX = 600;
  const rootCY = canvasH / 2;

  // Add root node
  nodes.push({
    id: tree.id,
    label: tree.label,
    icon: tree.icon,
    color: tree.color,
    notes: tree.notes,
    x: rootCX - rootW / 2,
    y: rootCY - rootH / 2,
    width: rootW,
    height: rootH,
    depth: 0,
    collapsed: !!tree.collapsed,
    direction: "right",
  });

  // Layout right children
  let rightStartY = rootCY - rightTotalH / 2;
  for (const child of rightChildren) {
    const childH = subtreeHeight(child);
    const childCY = rightStartY + childH / 2;
    const childW = measureNodeWidth(child.label, false);
    const childCX = rootCX + rootW / 2 + H_GAP + childW / 2;

    links.push({
      fromX: rootCX + rootW / 2, fromY: rootCY,
      toX: childCX - childW / 2, toY: childCY,
      depth: 1, parentId: tree.id, childId: child.id,
    });
    layoutBranch(child, childCX, childCY, 1, "right", tree.id);
    rightStartY += childH + V_GAP;
  }

  // Layout left children
  let leftStartY = rootCY - leftTotalH / 2;
  for (const child of leftChildren) {
    const childH = subtreeHeight(child);
    const childCY = leftStartY + childH / 2;
    const childW = measureNodeWidth(child.label, false);
    const childCX = rootCX - rootW / 2 - H_GAP - childW / 2;

    links.push({
      fromX: rootCX - rootW / 2, fromY: rootCY,
      toX: childCX + childW / 2, toY: childCY,
      depth: 1, parentId: tree.id, childId: child.id,
    });
    layoutBranch(child, childCX, childCY, 1, "left", tree.id);
    leftStartY += childH + V_GAP;
  }

  // Remove duplicate root node (already added first in the loop)
  const rootIdx = nodes.findIndex((n, i) => i > 0 && n.id === tree.id);
  if (rootIdx > 0) nodes.splice(rootIdx, 1);

  return { nodes, links };
}

function layoutTreeRight(tree: MindMapNode): { nodes: NodePos[]; links: LinkPos[] } {
  const nodes: NodePos[] = [];
  const links: LinkPos[] = [];

  function subtreeHeight(node: MindMapNode): number {
    if (node.collapsed || !node.children || node.children.length === 0) return NODE_HEIGHT;
    let total = 0;
    for (const child of node.children) total += subtreeHeight(child);
    return total + (node.children.length - 1) * V_GAP;
  }

  function layout(node: MindMapNode, x: number, y: number, depth: number, parentId?: string) {
    const isRoot = depth === 0;
    const w = measureNodeWidth(node.label, isRoot);
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;

    nodes.push({
      id: node.id, label: node.label, icon: node.icon, color: node.color, notes: node.notes,
      x, y: y - h / 2, width: w, height: h,
      depth, collapsed: !!node.collapsed, parentId, direction: "right",
    });

    if (!node.collapsed && node.children && node.children.length > 0) {
      const totalH = node.children.reduce((s, c) => s + subtreeHeight(c), 0)
        + (node.children.length - 1) * V_GAP;
      let startY = y - totalH / 2;

      for (const child of node.children) {
        const childH = subtreeHeight(child);
        const childCY = startY + childH / 2;
        const childW = measureNodeWidth(child.label, false);
        const childX = x + w + H_GAP;

        links.push({
          fromX: x + w, fromY: y,
          toX: childX, toY: childCY,
          depth: depth + 1, parentId: node.id, childId: child.id,
        });
        layout(child, childX, childCY, depth + 1, node.id);
        startY += childH + V_GAP;
      }
    }
  }

  const totalH = subtreeHeight(tree);
  const cy = Math.max(totalH, 400) / 2 + 100;
  layout(tree, 80, cy, 0);

  return { nodes, links };
}

function layoutTreeDown(tree: MindMapNode): { nodes: NodePos[]; links: LinkPos[] } {
  const nodes: NodePos[] = [];
  const links: LinkPos[] = [];

  function subtreeWidth(node: MindMapNode): number {
    const w = measureNodeWidth(node.label, node === tree);
    if (node.collapsed || !node.children || node.children.length === 0) return w;
    let total = 0;
    for (const child of node.children) total += subtreeWidth(child);
    total += (node.children.length - 1) * V_GAP;
    return Math.max(w, total);
  }

  function layout(node: MindMapNode, cx: number, y: number, depth: number, parentId?: string) {
    const isRoot = depth === 0;
    const w = measureNodeWidth(node.label, isRoot);
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;

    nodes.push({
      id: node.id, label: node.label, icon: node.icon, color: node.color, notes: node.notes,
      x: cx - w / 2, y, width: w, height: h,
      depth, collapsed: !!node.collapsed, parentId, direction: "right",
    });

    if (!node.collapsed && node.children && node.children.length > 0) {
      const totalW = node.children.reduce((s, c) => s + subtreeWidth(c), 0)
        + (node.children.length - 1) * V_GAP;
      let startX = cx - totalW / 2;

      for (const child of node.children) {
        const childW = subtreeWidth(child);
        const childCX = startX + childW / 2;
        const childY = y + h + V_LAYOUT_GAP;

        links.push({
          fromX: cx, fromY: y + h,
          toX: childCX, toY: childY,
          depth: depth + 1, parentId: node.id, childId: child.id,
        });
        layout(child, childCX, childY, depth + 1, node.id);
        startX += childW + V_GAP;
      }
    }
  }

  layout(tree, Math.max(600, subtreeWidth(tree) / 2 + 100), 80, 0);
  return { nodes, links };
}

function layoutOrgChart(tree: MindMapNode): { nodes: NodePos[]; links: LinkPos[] } {
  const nodes: NodePos[] = [];
  const links: LinkPos[] = [];

  function subtreeWidth(node: MindMapNode): number {
    const w = measureNodeWidth(node.label, node === tree);
    if (node.collapsed || !node.children || node.children.length === 0) return w;
    let total = 0;
    for (const child of node.children) total += subtreeWidth(child);
    total += (node.children.length - 1) * 24;
    return Math.max(w, total);
  }

  function layout(node: MindMapNode, cx: number, y: number, depth: number, parentId?: string) {
    const isRoot = depth === 0;
    const w = measureNodeWidth(node.label, isRoot);
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;

    nodes.push({
      id: node.id, label: node.label, icon: node.icon, color: node.color, notes: node.notes,
      x: cx - w / 2, y, width: w, height: h,
      depth, collapsed: !!node.collapsed, parentId, direction: "right",
    });

    if (!node.collapsed && node.children && node.children.length > 0) {
      const totalW = node.children.reduce((s, c) => s + subtreeWidth(c), 0)
        + (node.children.length - 1) * 24;
      let startX = cx - totalW / 2;

      for (const child of node.children) {
        const childW = subtreeWidth(child);
        const childCX = startX + childW / 2;
        const childY = y + h + V_LAYOUT_GAP;

        links.push({
          fromX: cx, fromY: y + h,
          toX: childCX, toY: childY,
          depth: depth + 1, parentId: node.id, childId: child.id,
        });
        layout(child, childCX, childY, depth + 1, node.id);
        startX += childW + 24;
      }
    }
  }

  layout(tree, Math.max(700, subtreeWidth(tree) / 2 + 100), 60, 0);
  return { nodes, links };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bézier Path Builders
   ═══════════════════════════════════════════════════════════════════════════ */

function buildHorizontalBezier(link: LinkPos): string {
  const midX = (link.fromX + link.toX) / 2;
  return `M ${link.fromX} ${link.fromY} C ${midX} ${link.fromY}, ${midX} ${link.toY}, ${link.toX} ${link.toY}`;
}

function buildVerticalBezier(link: LinkPos): string {
  const midY = (link.fromY + link.toY) / 2;
  return `M ${link.fromX} ${link.fromY} C ${link.fromX} ${midY}, ${link.toX} ${midY}, ${link.toX} ${link.toY}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Default Tree Data
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_TREE: MindMapNode = {
  id: "root",
  label: "Chủ đề học tập mới",
  children: [
    {
      id: "node_1",
      label: "I. Khái niệm cơ bản",
      children: [
        { id: "node_1_1", label: "1. Định nghĩa chính" },
        { id: "node_1_2", label: "2. Tại sao cần học?" },
      ],
    },
    {
      id: "node_2",
      label: "II. Phương pháp thực hành",
      children: [
        { id: "node_2_1", label: "A. Ghi chép sơ đồ" },
        { id: "node_2_2", label: "B. Kiểm tra ôn tập" },
      ],
    },
    {
      id: "node_3",
      label: "III. Tài liệu tham khảo",
      children: [
        { id: "node_3_1", label: "Sách giáo khoa" },
        { id: "node_3_2", label: "Video bài giảng" },
      ],
    },
    {
      id: "node_4",
      label: "IV. Đánh giá kết quả",
      children: [
        { id: "node_4_1", label: "Bài kiểm tra" },
        { id: "node_4_2", label: "Dự án thực tế" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function MindMapViewer({ initialData, onUpdate }: MindMapViewerProps) {
  // ── Core State ───────────────────────────────────────────────────────
  const [tree, setTree] = useState<MindMapNode>(() => deepClone(initialData || DEFAULT_TREE));
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("mindmap");
  const [paletteId, setPaletteId] = useState<string>("indigo");
  const [showFormatPanel, setShowFormatPanel] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>("");

  // ── Pan & Zoom ──────────────────────────────────────────────────────
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialCentered = useRef(false);

  // ── Node Editing ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Drag & Drop ─────────────────────────────────────────────────────
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ x: number; y: number; label: string } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragActive = useRef(false);

  // ── Undo / Redo ─────────────────────────────────────────────────────
  const [history, setHistory] = useState<MindMapNode[]>(() => [deepClone(initialData || DEFAULT_TREE)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // ── Context Menu ────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, nodeId: null });

  // ── Search ──────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Touch zoom ──────────────────────────────────────────────────────
  const touchState = useRef<{ dist: number; scale: number } | null>(null);

  const palette = PALETTES.find((p) => p.id === paletteId) || PALETTES[0];

  // ── Sync initialData ──────────────────────────────────────────────
  useEffect(() => {
    if (initialData) {
      const cloned = deepClone(initialData);
      setTree(cloned);
      setHistory([cloned]);
      setHistoryIndex(0);
      initialCentered.current = false;
    }
  }, [initialData]);

  // ── Push to History ─────────────────────────────────────────────────
  const pushHistory = useCallback((newTree: MindMapNode) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      trimmed.push(deepClone(newTree));
      if (trimmed.length > MAX_HISTORY) trimmed.shift();
      return trimmed;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // ── Mutate Tree (with auto-save) ───────────────────────────────────
  const mutateTree = useCallback((updater: (draft: MindMapNode) => void) => {
    setTree((prev) => {
      const next = deepClone(prev);
      updater(next);
      pushHistory(next);
      if (onUpdate) onUpdate(next);
      return next;
    });
  }, [pushHistory, onUpdate]);

  // ── Undo / Redo Handlers ──────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const restored = deepClone(history[newIdx]);
      setTree(restored);
      if (onUpdate) onUpdate(restored);
    }
  }, [historyIndex, history, onUpdate]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const restored = deepClone(history[newIdx]);
      setTree(restored);
      if (onUpdate) onUpdate(restored);
    }
  }, [historyIndex, history, onUpdate]);

  // ── Node Operations ─────────────────────────────────────────────────
  const addChildNode = useCallback((parentId: string) => {
    mutateTree((draft) => {
      const parent = findNode(draft, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push({ id: generateId(), label: "Nhánh mới" });
        parent.collapsed = false;
      }
    });
  }, [mutateTree]);

  const addSiblingNode = useCallback((nodeId: string) => {
    if (nodeId === tree.id) return; // root has no sibling
    mutateTree((draft) => {
      const parent = findParent(draft, nodeId);
      if (parent && parent.children) {
        const idx = parent.children.findIndex((c) => c.id === nodeId);
        if (idx >= 0) {
          parent.children.splice(idx + 1, 0, { id: generateId(), label: "Nhánh mới" });
        }
      }
    });
  }, [mutateTree, tree.id]);

  const deleteNode = useCallback((id: string) => {
    if (id === tree.id) return; // cannot delete root
    mutateTree((draft) => {
      removeNode(draft, id);
    });
    if (selectedId === id) setSelectedId(null);
  }, [mutateTree, tree.id, selectedId]);

  const startEdit = useCallback((id: string, label: string) => {
    setEditingId(id);
    setEditLabel(label);
  }, []);

  const saveEdit = useCallback((id: string) => {
    if (!editLabel.trim()) {
      setEditingId(null);
      return;
    }
    mutateTree((draft) => {
      const node = findNode(draft, id);
      if (node) node.label = editLabel.trim();
    });
    setEditingId(null);
  }, [editLabel, mutateTree]);

  const toggleCollapse = useCallback((id: string) => {
    mutateTree((draft) => {
      const node = findNode(draft, id);
      if (node) node.collapsed = !node.collapsed;
    });
  }, [mutateTree]);

  const changeNodeColor = useCallback((id: string, color: string) => {
    mutateTree((draft) => {
      const node = findNode(draft, id);
      if (node) node.color = color;
    });
  }, [mutateTree]);

  const collapseAll = useCallback((id: string) => {
    mutateTree((draft) => {
      const node = findNode(draft, id);
      if (node) {
        const setCollapsed = (n: MindMapNode) => {
          if (n.children && n.children.length > 0) {
            n.collapsed = true;
            n.children.forEach(setCollapsed);
          }
        };
        setCollapsed(node);
      }
    });
  }, [mutateTree]);

  const resetTree = useCallback(() => {
    const fresh = deepClone(DEFAULT_TREE);
    setTree(fresh);
    pushHistory(fresh);
    if (onUpdate) onUpdate(fresh);
  }, [pushHistory, onUpdate]);

  // ── Layout Computation ──────────────────────────────────────────────
  const { nodePositions, linkPositions, canvasBounds } = useMemo(() => {
    let result: { nodes: NodePos[]; links: LinkPos[] };

    switch (layoutMode) {
      case "tree-right":
        result = layoutTreeRight(tree);
        break;
      case "tree-down":
        result = layoutTreeDown(tree);
        break;
      case "org-chart":
        result = layoutOrgChart(tree);
        break;
      case "mindmap":
      default:
        result = layoutMindmap(tree, palette.nodes);
        break;
    }

    // Compute canvas bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of result.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const pad = 120;
    const bounds = {
      x: (minX || 0) - pad,
      y: (minY || 0) - pad,
      width: (maxX - minX || 1200) + pad * 2,
      height: (maxY - minY || 600) + pad * 2,
    };

    return { nodePositions: result.nodes, linkPositions: result.links, canvasBounds: bounds };
  }, [tree, layoutMode, palette.nodes]);

  // ── Center Root on Mount / Layout Change ───────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const rootNode = nodePositions.find((n) => n.id === tree.id);
    if (rootNode) {
      const rootCX = rootNode.x + rootNode.width / 2;
      const rootCY = rootNode.y + rootNode.height / 2;
      setViewX(cw / 2 - rootCX * scale);
      setViewY(ch / 2 - rootCY * scale);
    }
    initialCentered.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode, tree.id, initialCentered.current === false]);

  // ── Search Matches ─────────────────────────────────────────────────
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    const search = (node: MindMapNode) => {
      if (node.label.toLowerCase().includes(q)) matches.add(node.id);
      if (node.children) node.children.forEach(search);
    };
    search(tree);
    return matches;
  }, [searchQuery, tree]);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Z / Ctrl+Shift+Z
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleRedo();
        return;
      }
      // Ctrl+F — search
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }
      // Escape — close search / deselect
      if (e.key === "Escape") {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery("");
        }
        if (ctxMenu.visible) setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null });
        if (editingId) setEditingId(null);
        setSelectedId(null);
        return;
      }

      // Node-focused shortcuts (only when not editing)
      if (editingId || !selectedId) return;

      if (e.key === "Tab") {
        e.preventDefault();
        addChildNode(selectedId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        addSiblingNode(selectedId);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteNode(selectedId);
      } else if (e.key === "F2") {
        e.preventDefault();
        const node = findNode(tree, selectedId);
        if (node) startEdit(node.id, node.label);
      } else if (e.key === " ") {
        e.preventDefault();
        toggleCollapse(selectedId);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        // Navigate between nodes
        const currentIdx = nodePositions.findIndex((n) => n.id === selectedId);
        if (currentIdx < 0) return;
        const current = nodePositions[currentIdx];

        let bestId: string | null = null;
        let bestDist = Infinity;

        for (const n of nodePositions) {
          if (n.id === selectedId) continue;
          const dx = n.x - current.x;
          const dy = n.y - current.y;

          let valid = false;
          if (e.key === "ArrowDown" && dy > 10) valid = true;
          else if (e.key === "ArrowUp" && dy < -10) valid = true;
          else if (e.key === "ArrowRight" && dx > 10) valid = true;
          else if (e.key === "ArrowLeft" && dx < -10) valid = true;

          if (valid) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
              bestDist = dist;
              bestId = n.id;
            }
          }
        }
        if (bestId) setSelectedId(bestId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, selectedId, editingId, showSearch, ctxMenu.visible,
      addChildNode, addSiblingNode, deleteNode, startEdit, toggleCollapse, tree, nodePositions]);

  // ── Wheel Zoom ─────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale + delta));

    // Keep mouse position stable
    const worldX = (mouseX - viewX) / scale;
    const worldY = (mouseY - viewY) / scale;
    setViewX(mouseX - worldX * newScale);
    setViewY(mouseY - worldY * newScale);
    setScale(newScale);
  }, [scale, viewX, viewY]);

  // ── Canvas Pan (pointer events) ────────────────────────────────────
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan on left-click on empty canvas area
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-node-id]")) return;

    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewX, vy: viewY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Dismiss context menu & selection
    setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null });
    setSelectedId(null);
  }, [viewX, viewY]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setViewX(panStart.current.vx + dx);
      setViewY(panStart.current.vy + dy);
    }

    // Drag & Drop ghost tracking
    if (dragActive.current && dragNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragGhost({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          label: findNode(tree, dragNodeId)?.label || "",
        });
      }

      // Find drop target
      const worldX = (e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - viewX) / scale;
      const worldY = (e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - viewY) / scale;

      let foundTarget: string | null = null;
      for (const np of nodePositions) {
        if (np.id === dragNodeId) continue;
        if (isDescendant(tree, dragNodeId, np.id)) continue;
        if (worldX >= np.x && worldX <= np.x + np.width && worldY >= np.y && worldY <= np.y + np.height) {
          foundTarget = np.id;
          break;
        }
      }
      setDropTargetId(foundTarget);
    }
  }, [dragNodeId, tree, viewX, viewY, scale, nodePositions]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    // Drop logic
    if (dragActive.current && dragNodeId && dropTargetId) {
      mutateTree((draft) => {
        const removed = removeNode(draft, dragNodeId);
        if (removed) {
          const target = findNode(draft, dropTargetId);
          if (target) {
            if (!target.children) target.children = [];
            target.children.push(removed);
            target.collapsed = false;
          }
        }
      });
    }

    setDragNodeId(null);
    setDragGhost(null);
    setDropTargetId(null);
    dragActive.current = false;
    dragStartPos.current = null;
  }, [dragNodeId, dropTargetId, mutateTree]);

  // ── Touch pinch zoom ──────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState.current = { dist: Math.sqrt(dx * dx + dy * dy), scale };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchState.current.dist;
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchState.current.scale * ratio));
      setScale(newScale);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchState.current = null;
  }, []);

  // ── Node Pointer Down (drag initiation) ────────────────────────────
  const handleNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    if (nodeId === tree.id) return; // root cannot be dragged
    if (e.button !== 0) return;
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragNodeId(nodeId);
    dragActive.current = false;
  }, [tree.id]);

  const handleNodePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragNodeId && dragStartPos.current && !dragActive.current) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        dragActive.current = true;
      }
    }
  }, [dragNodeId]);

  // ── Context Menu Handler ──────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCtxMenu({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        nodeId,
      });
    }
    setSelectedId(nodeId);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => {
      if (ctxMenu.visible) setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null });
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [ctxMenu.visible]);

  // ── Fit to View ─────────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const sx = cw / canvasBounds.width;
    const sy = ch / canvasBounds.height;
    const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(sx, sy) * 0.9));

    const cx = canvasBounds.x + canvasBounds.width / 2;
    const cy = canvasBounds.y + canvasBounds.height / 2;
    setScale(newScale);
    setViewX(cw / 2 - cx * newScale);
    setViewY(ch / 2 - cy * newScale);
  }, [canvasBounds]);

  // ── Stats ────────────────────────────────────────────────────────────
  const totalNodes = countVisibleNodes(tree);
  const maxDepth = findMaxDepth(tree);

  // ── Connector path builder ─────────────────────────────────────────
  const buildPath = layoutMode === "tree-down" || layoutMode === "org-chart"
    ? buildVerticalBezier : buildHorizontalBezier;

  // ── Color helpers ──────────────────────────────────────────────────
  const getNodeBg = useCallback((np: NodePos): string => {
    if (np.color) return np.color;
    if (np.depth === 0) return palette.ring;
    if (np.depth === 1) {
      const siblings = nodePositions.filter((n) => n.parentId === tree.id);
      const idx = siblings.findIndex((n) => n.id === np.id);
      return palette.nodes[idx % palette.nodes.length] || palette.nodes[0];
    }
    return "#ffffff";
  }, [palette, nodePositions, tree.id]);

  const getNodeTextColor = useCallback((np: NodePos): string => {
    if (np.depth === 0 || np.depth === 1 || np.color) return "#ffffff";
    return "var(--color-text-primary)";
  }, []);

  const getLinkColor = useCallback((link: LinkPos): string => {
    return getDepthColor(link.depth, palette.nodes);
  }, [palette.nodes]);

  const getNodeBorder = useCallback((np: NodePos): string => {
    if (np.depth === 0) return "#ffffff";
    if (np.depth === 1) return getNodeBg(np);
    return "var(--color-border-subtle)";
  }, [getNodeBg]);

  const isHorizontalLayout = layoutMode === "mindmap" || layoutMode === "tree-right";

  // ── Minimap ─────────────────────────────────────────────────────────
  const minimapWidth = 180;
  const minimapHeight = 120;
  const minimapScale = Math.min(
    minimapWidth / canvasBounds.width,
    minimapHeight / canvasBounds.height,
  );

  const minimapPointerDown = useRef(false);

  const handleMinimapPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    minimapPointerDown.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handleMinimapNavigate(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasBounds, scale]);

  const handleMinimapNavigate = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = (e.clientX - rect.left) / minimapScale + canvasBounds.x;
    const my = (e.clientY - rect.top) / minimapScale + canvasBounds.y;

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    setViewX(cw / 2 - mx * scale);
    setViewY(ch / 2 - my * scale);
  }, [canvasBounds, minimapScale, scale]);

  const handleMinimapPointerMove = useCallback((e: React.PointerEvent) => {
    if (minimapPointerDown.current) handleMinimapNavigate(e);
  }, [handleMinimapNavigate]);

  const handleMinimapPointerUp = useCallback((e: React.PointerEvent) => {
    minimapPointerDown.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // ── Minimap viewport indicator ─────────────────────────────────────
  const minimapViewport = useMemo(() => {
    if (!containerRef.current) return { x: 0, y: 0, w: minimapWidth, h: minimapHeight };
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const worldLeft = (-viewX) / scale;
    const worldTop = (-viewY) / scale;
    const worldRight = worldLeft + cw / scale;
    const worldBottom = worldTop + ch / scale;

    return {
      x: (worldLeft - canvasBounds.x) * minimapScale,
      y: (worldTop - canvasBounds.y) * minimapScale,
      w: (worldRight - worldLeft) * minimapScale,
      h: (worldBottom - worldTop) * minimapScale,
    };
  }, [viewX, viewY, scale, canvasBounds, minimapScale, minimapWidth, minimapHeight]);

  // ── Node color choices for context menu ──────────────────────────
  const colorChoices = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#111827", ""];

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-[78vh] min-h-[600px] border border-[var(--color-border-subtle)]">
      {/* ── Toolbar header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-3 gap-3 bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[var(--color-primary-fixed)] text-[var(--color-primary)] flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] font-display leading-tight">
              AI Mind Map Editor
            </h2>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              {totalNodes} nodes · depth {maxDepth} · nhấp đúp để sửa, kéo thả để sắp xếp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors"
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors"
            title="Làm lại (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>

          <div className="w-px h-6 bg-[var(--color-border-subtle)] mx-1" />

          {/* Search */}
          <button
            onClick={() => { setShowSearch((v) => !v); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)]"}`}
            title="Tìm kiếm (Ctrl+F)"
          >
            <Search size={16} />
          </button>

          {/* Format Panel Toggle */}
          <button
            onClick={() => setShowFormatPanel((v) => !v)}
            className={`px-3 h-9 rounded-full text-[13px] font-medium flex items-center gap-1.5 border transition-colors ${
              showFormatPanel
                ? "bg-[var(--color-primary)] text-white border-transparent"
                : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            }`}
            title="Định dạng"
          >
            <Paintbrush size={14} />
            Format
          </button>

          <Button
            variant="danger"
            size="sm"
            onClick={resetTree}
            icon={<RefreshCw size={14} />}
            title="Reset"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-5 py-2 bg-[var(--color-neutral-soft)] border-b border-[var(--color-border-subtle)]">
          <Search size={14} className="text-[var(--color-text-secondary)] shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm node…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60"
            onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
          />
          {searchQuery && (
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {searchMatches.size} kết quả
            </span>
          )}
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(""); }}
            className="p-1 hover:bg-white rounded text-[var(--color-text-secondary)]"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* ── Workspace: Canvas + optional format panel ────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className={`relative flex-1 overflow-hidden bg-white ${
            isPanning.current ? "mm-canvas-grabbing" : "mm-canvas-grab"
          }`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={(e) => { handleCanvasPointerMove(e); handleNodePointerMove(e); }}
          onPointerUp={handleCanvasPointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dotted grid background */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #e0e3e5 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Floating zoom toolbar — top right */}
          <div className="absolute top-4 right-4 z-30 flex flex-col bg-white border border-[var(--color-border-subtle)] rounded-[10px] shadow-[var(--shadow-card)] overflow-hidden">
            <button
              onClick={() => setScale(Math.min(ZOOM_MAX, +(scale + 0.1).toFixed(2)))}
              className="p-2 hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-primary)]"
              title="Phóng to"
            >
              <ZoomIn size={18} />
            </button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] text-center py-1">
              {Math.round(scale * 100)}%
            </div>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button
              onClick={() => setScale(Math.max(ZOOM_MIN, +(scale - 0.1).toFixed(2)))}
              className="p-2 hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-primary)]"
              title="Thu nhỏ"
            >
              <ZoomOut size={18} />
            </button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button
              onClick={fitToView}
              className="p-2 hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-primary)]"
              title="Vừa khung hình"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          {/* Transformed canvas */}
          <div
            ref={canvasRef}
            className="absolute origin-top-left"
            style={{
              transform: `translate(${viewX}px, ${viewY}px) scale(${scale})`,
              willChange: "transform",
            }}
          >
            {/* SVG connectors layer */}
            <svg
              className="absolute pointer-events-none"
              style={{
                left: canvasBounds.x,
                top: canvasBounds.y,
                width: canvasBounds.width,
                height: canvasBounds.height,
              }}
            >
              {linkPositions.map((link, idx) => {
                const pathStr = buildPath({
                  ...link,
                  fromX: link.fromX - canvasBounds.x,
                  fromY: link.fromY - canvasBounds.y,
                  toX: link.toX - canvasBounds.x,
                  toY: link.toY - canvasBounds.y,
                });
                const color = getLinkColor(link);
                return (
                  <path
                    key={idx}
                    d={pathStr}
                    fill="none"
                    stroke={color}
                    strokeWidth={link.depth === 1 ? 2.5 : 1.5}
                    strokeOpacity={link.depth === 1 ? 0.9 : 0.6}
                    className="mm-path-animate"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* DOM node layer */}
            {nodePositions.map((np) => {
              const isEditing = editingId === np.id;
              const isRoot = np.depth === 0;
              const isPrimary = np.depth === 1;
              const isDragging = dragNodeId === np.id && dragActive.current;
              const isDropTarget = dropTargetId === np.id;
              const isSelected = selectedId === np.id;
              const isSearchMatch = searchMatches.has(np.id);
              const hasChildren = !!findNode(tree, np.id)?.children?.length;
              const bg = getNodeBg(np);
              const textColor = getNodeTextColor(np);
              const border = getNodeBorder(np);

              return (
                <div
                  key={np.id}
                  data-node-id={np.id}
                  className={`absolute flex items-center gap-1 select-none pointer-events-auto group
                    mm-node-enter mm-layout-transition
                    ${isRoot ? "shadow-2xl border-2" : "border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px]"}
                    ${isDragging ? "mm-node-dragging" : ""}
                    ${isDropTarget ? "mm-drop-target" : ""}
                    ${isSelected ? "mm-selected" : ""}
                    ${isSearchMatch ? "mm-search-match" : ""}
                  `}
                  style={{
                    left: `${np.x}px`,
                    top: `${np.y}px`,
                    width: `${np.width}px`,
                    height: `${np.height}px`,
                    zIndex: isRoot ? 30 : isDragging ? 50 : 20,
                    backgroundColor: bg,
                    borderColor: border,
                    borderRadius: isRoot ? "16px" : isPrimary ? "9999px" : "10px",
                    padding: isRoot ? "14px 16px" : isPrimary ? "8px 14px" : "8px 12px",
                    color: textColor,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!dragActive.current) setSelectedId(np.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(np.id, np.label);
                  }}
                  onPointerDown={(e) => handleNodePointerDown(e, np.id)}
                  onContextMenu={(e) => handleContextMenu(e, np.id)}
                >
                  {/* Collapse / Expand chevron */}
                  {hasChildren && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(np.id); }}
                      className={`p-1 rounded-md transition shrink-0 ${
                        isRoot || isPrimary
                          ? "hover:bg-white/20 text-white/80"
                          : "hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {np.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}

                  {/* Icon */}
                  {np.icon && <span className="text-[14px] shrink-0">{np.icon}</span>}

                  {/* Label / Editor */}
                  <div className="flex-1 min-w-0 pr-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editLabel}
                        autoFocus
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => saveEdit(np.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(np.id);
                          if (e.key === "Escape") setEditingId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-[13px] bg-white border-2 border-[var(--color-primary)] focus:outline-none rounded-md px-2 py-0.5 font-semibold text-[var(--color-text-primary)]"
                      />
                    ) : (
                      <div
                        className={`truncate cursor-pointer ${
                          isRoot
                            ? "text-[15px] font-bold tracking-wide text-center"
                            : isPrimary
                            ? "text-[13px] font-bold"
                            : "text-[13px] font-medium"
                        }`}
                        title={np.label}
                      >
                        {np.label}
                      </div>
                    )}
                  </div>

                  {/* Hover controls */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); addChildNode(np.id); }}
                      className={`p-1 rounded-md transition ${
                        isRoot || isPrimary
                          ? "hover:bg-white/20 text-white/90"
                          : "hover:bg-indigo-50 text-[var(--color-primary)]"
                      }`}
                      title="Thêm nhánh con"
                    >
                      <Plus size={13} />
                    </button>
                    {!isRoot && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNode(np.id); }}
                        className={`p-1 rounded-md transition ${
                          isPrimary
                            ? "hover:bg-white/20 text-white/90"
                            : "hover:bg-rose-50 text-rose-500"
                        }`}
                        title="Xóa nhánh"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Drag Ghost ──────────────────────────────────────────── */}
          {dragGhost && dragActive.current && (
            <div
              className="absolute pointer-events-none z-[100] flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur border border-[var(--color-primary)] rounded-lg shadow-lg text-[13px] font-medium text-[var(--color-text-primary)]"
              style={{
                left: dragGhost.x + 12,
                top: dragGhost.y + 12,
              }}
            >
              {dragGhost.label}
            </div>
          )}

          {/* ── Context Menu ─────────────────────────────────────────── */}
          {ctxMenu.visible && ctxMenu.nodeId && (
            <div
              className="absolute z-[200] mm-ctx-menu"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-lg border border-[var(--color-border-subtle)] py-1.5 w-52 overflow-hidden">
                <button
                  onClick={() => { addChildNode(ctxMenu.nodeId!); setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null }); }}
                  className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-neutral-soft)] flex items-center gap-2 text-[var(--color-text-primary)]"
                >
                  <Plus size={14} /> Thêm nhánh con
                </button>
                {ctxMenu.nodeId !== tree.id && (
                  <button
                    onClick={() => { addSiblingNode(ctxMenu.nodeId!); setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null }); }}
                    className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-neutral-soft)] flex items-center gap-2 text-[var(--color-text-primary)]"
                  >
                    <CopyPlus size={14} /> Thêm nhánh ngang hàng
                  </button>
                )}
                <button
                  onClick={() => {
                    const node = findNode(tree, ctxMenu.nodeId!);
                    if (node) startEdit(node.id, node.label);
                    setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null });
                  }}
                  className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-neutral-soft)] flex items-center gap-2 text-[var(--color-text-primary)]"
                >
                  <Edit3 size={14} /> Sửa nội dung
                </button>

                {/* Color choices */}
                <div className="px-3 py-2 border-t border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Palette size={12} className="text-[var(--color-text-secondary)]" />
                    <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">Màu nhánh</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorChoices.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          changeNodeColor(ctxMenu.nodeId!, c);
                          setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null });
                        }}
                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                          !c ? "border-2 border-dashed border-gray-300 bg-white" : "border-white/50"
                        }`}
                        style={c ? { backgroundColor: c } : undefined}
                        title={c || "Mặc định"}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--color-border-subtle)]">
                  <button
                    onClick={() => { collapseAll(ctxMenu.nodeId!); setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null }); }}
                    className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-neutral-soft)] flex items-center gap-2 text-[var(--color-text-primary)]"
                  >
                    <FoldVertical size={14} /> Thu gọn tất cả
                  </button>
                </div>

                {ctxMenu.nodeId !== tree.id && (
                  <div className="border-t border-[var(--color-border-subtle)]">
                    <button
                      onClick={() => { deleteNode(ctxMenu.nodeId!); setCtxMenu({ visible: false, x: 0, y: 0, nodeId: null }); }}
                      className="w-full px-3 py-2 text-left text-[13px] hover:bg-rose-50 flex items-center gap-2 text-rose-500"
                    >
                      <Trash size={14} /> Xóa nhánh
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Minimap ──────────────────────────────────────────────── */}
          <div
            className="absolute bottom-20 right-4 z-30 bg-white/90 backdrop-blur border border-[var(--color-border-subtle)] rounded-lg shadow-[var(--shadow-card)] overflow-hidden"
            style={{ width: minimapWidth, height: minimapHeight }}
            onPointerDown={handleMinimapPointerDown}
            onPointerMove={handleMinimapPointerMove}
            onPointerUp={handleMinimapPointerUp}
          >
            <svg width={minimapWidth} height={minimapHeight} className="block">
              {/* Links */}
              {linkPositions.map((link, idx) => (
                <line
                  key={idx}
                  x1={(link.fromX - canvasBounds.x) * minimapScale}
                  y1={(link.fromY - canvasBounds.y) * minimapScale}
                  x2={(link.toX - canvasBounds.x) * minimapScale}
                  y2={(link.toY - canvasBounds.y) * minimapScale}
                  stroke="#c7c4d7"
                  strokeWidth={0.5}
                />
              ))}
              {/* Nodes */}
              {nodePositions.map((np) => (
                <rect
                  key={np.id}
                  x={(np.x - canvasBounds.x) * minimapScale}
                  y={(np.y - canvasBounds.y) * minimapScale}
                  width={np.width * minimapScale}
                  height={np.height * minimapScale}
                  fill={np.depth === 0 ? palette.ring : np.depth === 1 ? palette.nodes[0] : "#e2e2e2"}
                  rx={1.5}
                />
              ))}
              {/* Viewport indicator */}
              <rect
                x={Math.max(0, minimapViewport.x)}
                y={Math.max(0, minimapViewport.y)}
                width={Math.min(minimapWidth, minimapViewport.w)}
                height={Math.min(minimapHeight, minimapViewport.h)}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                rx={2}
                className="mm-minimap-viewport"
              />
            </svg>
          </div>

          {/* ── Floating AI Toolbar — bottom center ─────────────────── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[760px] px-4 z-30 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-[0_8px_28px_rgba(26,28,28,0.10)] border border-[var(--color-border-subtle)] p-3 flex flex-col gap-3 pointer-events-auto">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex gap-1.5 flex-wrap">
                  <button className="px-3 py-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)] text-[12px] font-medium flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <ListFilter size={14} /> Ngắn gọn hơn
                  </button>
                  <button className="px-3 py-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)] text-[12px] font-medium flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Plus size={14} /> Thêm chi tiết
                  </button>
                  <button className="px-3 py-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)] text-[12px] font-medium flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Languages size={14} /> Dịch sang
                    <ChevDown size={12} />
                  </button>
                  <button className="px-3 py-2 rounded-lg border border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)] text-[12px] font-medium flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Wand2 size={14} /> Tạo lại
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-2 hover:bg-[var(--color-neutral-soft)] rounded-full text-[var(--color-text-secondary)]"
                    title="Thông tin"
                  >
                    <Info size={16} />
                  </button>
                  <button
                    className="p-2 hover:bg-[var(--color-neutral-soft)] rounded-full text-[var(--color-text-secondary)]"
                    title="Phản hồi"
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className="w-full bg-white border border-[var(--color-border-subtle)] rounded-xl pl-4 pr-12 py-3 text-[14px] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-secondary)]/70"
                  placeholder="Hỏi AI về sơ đồ tư duy này…"
                  type="text"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
                  disabled={!aiInput.trim()}
                  title="Gửi"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Format Panel (collapsible right side) ──────────────── */}
        {showFormatPanel && (
          <aside className="w-72 bg-white border-l border-[var(--color-border-subtle)] flex flex-col overflow-y-auto shrink-0 animate-fade-in">
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-[15px] font-semibold font-display text-[var(--color-text-primary)]">
                Định dạng
              </h3>
              <button
                onClick={() => setShowFormatPanel(false)}
                className="p-1 hover:bg-[var(--color-neutral-soft)] rounded-full text-[var(--color-text-secondary)]"
                title="Đóng"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              {/* ── Layout Mode Switcher ──────────────────────────────── */}
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider block mb-3">
                  Bố cục
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setLayoutMode(opt.id)}
                      className={`px-3 py-2.5 rounded-lg border text-[12px] font-medium flex items-center gap-2 transition-all ${
                        layoutMode === opt.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                          : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Color Palette Picker ──────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                    Màu sắc
                  </label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaletteId(p.id)}
                      className={`w-8 h-8 rounded-full transition-transform shadow-sm ${
                        paletteId === p.id
                          ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-105"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: p.ring }}
                      title={p.id}
                    />
                  ))}
                </div>

                {/* Palette preview */}
                <div className="mt-3 flex items-center gap-1">
                  {palette.nodes.map((c, i) => (
                    <div
                      key={i}
                      className="flex-1 h-2 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Rainbow Branch Colors Preview ────────────────────── */}
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider block mb-3">
                  Màu cầu vồng theo độ sâu
                </label>
                <div className="flex gap-1">
                  {RAINBOW.map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: c }}
                      title={`Cấp ${i + 2}`}
                    />
                  ))}
                </div>
              </div>

              {/* ── Text Format (visual only) ────────────────────────── */}
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Văn bản
                </label>
                <div className="flex border border-[var(--color-border-default)] rounded-lg overflow-hidden divide-x divide-[var(--color-border-default)] bg-white">
                  <button className="flex-1 p-2 hover:bg-[var(--color-neutral-soft)] text-[13px] font-bold transition-colors">
                    B
                  </button>
                  <button className="flex-1 p-2 hover:bg-[var(--color-neutral-soft)] text-[13px] italic transition-colors">
                    I
                  </button>
                  <button className="flex-1 p-2 hover:bg-[var(--color-neutral-soft)] text-[13px] line-through transition-colors">
                    S
                  </button>
                  <button className="flex-1 p-2 hover:bg-[var(--color-neutral-soft)] text-[13px] underline transition-colors">
                    U
                  </button>
                </div>
              </div>

              {/* ── Keyboard Shortcuts Help ───────────────────────────── */}
              <div className="border-t border-[var(--color-border-subtle)] pt-4">
                <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider block mb-3">
                  Phím tắt
                </label>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                  <div className="flex justify-between"><span>Tab</span><span>Thêm nhánh con</span></div>
                  <div className="flex justify-between"><span>Enter</span><span>Thêm nhánh ngang</span></div>
                  <div className="flex justify-between"><span>F2</span><span>Sửa nội dung</span></div>
                  <div className="flex justify-between"><span>Space</span><span>Thu gọn/Mở rộng</span></div>
                  <div className="flex justify-between"><span>Delete</span><span>Xóa nhánh</span></div>
                  <div className="flex justify-between"><span>Ctrl+Z</span><span>Hoàn tác</span></div>
                  <div className="flex justify-between"><span>Ctrl+Shift+Z</span><span>Làm lại</span></div>
                  <div className="flex justify-between"><span>Ctrl+F</span><span>Tìm kiếm</span></div>
                  <div className="flex justify-between"><span>Mũi tên</span><span>Di chuyển</span></div>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t border-[var(--color-border-subtle)]">
                Tip: nhấp đúp chuột vào node để chỉnh sửa; chuột phải để mở menu; kéo thả
                node để di chuyển nhánh sang vị trí mới.
              </p>
            </div>
          </aside>
        )}
      </div>
    </Card>
  );
}
