import React, { useState } from "react";
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
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

interface MindMapViewerProps {
  initialData?: MindMapNode;
  onUpdate?: (updated: MindMapNode) => void;
}

const PALETTES = [
  { id: "indigo",  ring: "#111827", nodes: ["#006a61", "#3231c1", "#1a56db"] },
  { id: "ocean",   ring: "#1a56db", nodes: ["#1a56db", "#3231c1", "#006a61"] },
  { id: "amber",   ring: "#f97316", nodes: ["#f97316", "#1a56db", "#10b981"] },
  { id: "emerald", ring: "#10b981", nodes: ["#10b981", "#1a56db", "#3231c1"] },
  { id: "violet",  ring: "#8b5cf6", nodes: ["#8b5cf6", "#1a56db", "#10b981"] },
];

export default function MindMapViewer({ initialData, onUpdate }: MindMapViewerProps) {
  // Safe default tree
  const defaultTree: MindMapNode = {
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
    ],
  };

  const [tree, setTree] = useState<MindMapNode>(initialData || defaultTree);
  const [zoom, setZoom] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");
  const [paletteId, setPaletteId] = useState<string>("indigo");
  const [showFormatPanel, setShowFormatPanel] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>("");

  React.useEffect(() => {
    if (initialData) setTree(initialData);
  }, [initialData]);

  const palette = PALETTES.find((p) => p.id === paletteId) || PALETTES[0];

  // ── Tree helpers ───────────────────────────────────────────────────────
  const findAndModifyNode = (
    current: MindMapNode,
    targetId: string,
    action: (node: MindMapNode) => void
  ): boolean => {
    if (current.id === targetId) {
      action(current);
      return true;
    }
    if (current.children) {
      for (let i = 0; i < current.children.length; i++) {
        const found = findAndModifyNode(current.children[i], targetId, action);
        if (found) return true;
      }
    }
    return false;
  };

  const findNodeInTree = (current: MindMapNode, targetId: string): MindMapNode | null => {
    if (current.id === targetId) return current;
    if (current.children) {
      for (const child of current.children) {
        const found = findNodeInTree(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleUpdate = (updatedTree: MindMapNode) => {
    setTree({ ...updatedTree });
    if (onUpdate) onUpdate(updatedTree);
  };

  const handleEditNode = (id: string, label: string) => {
    setEditingId(id);
    setEditLabel(label);
  };

  const saveEditNode = (id: string) => {
    const next = { ...tree };
    findAndModifyNode(next, id, (node) => {
      node.label = editLabel;
    });
    handleUpdate(next);
    setEditingId(null);
  };

  const toggleCollapse = (id: string) => {
    const next = { ...tree };
    findAndModifyNode(next, id, (node) => {
      node.collapsed = !node.collapsed;
    });
    handleUpdate(next);
  };

  const addChildNode = (parentId: string) => {
    const next = { ...tree };
    const newChildId = `node_${Date.now()}`;
    findAndModifyNode(next, parentId, (node) => {
      if (!node.children) node.children = [];
      node.children.push({ id: newChildId, label: "Tiểu mục con mới" });
      node.collapsed = false;
    });
    handleUpdate(next);
  };

  const deleteNode = (id: string) => {
    if (id === "root") return;
    const next = { ...tree };
    const filterChildren = (current: MindMapNode): boolean => {
      if (current.children) {
        const before = current.children.length;
        current.children = current.children.filter((c) => c.id !== id);
        if (current.children.length < before) return true;
        for (const child of current.children) {
          if (filterChildren(child)) return true;
        }
      }
      return false;
    };
    filterChildren(next);
    handleUpdate(next);
  };

  // ── Layout computation ────────────────────────────────────────────────
  const computePositions = () => {
    const nodesList: {
      id: string;
      label: string;
      x: number;
      y: number;
      depth: number;
      collapsed: boolean;
      parentId?: string;
    }[] = [];
    const linksList: { fromX: number; fromY: number; toX: number; toY: number; depth: number }[] = [];

    const traverse = (node: MindMapNode, depth: number, parentId?: string) => {
      const x = 60 + depth * 230;
      nodesList.push({
        id: node.id,
        label: node.label,
        x,
        y: 0,
        depth,
        collapsed: !!node.collapsed,
        parentId,
      });
      if (node.children && node.children.length > 0 && !node.collapsed) {
        node.children.forEach((child) => traverse(child, depth + 1, node.id));
      }
    };
    traverse(tree, 0);

    let leafYIndex = 0;
    const verticalGap = 70;
    const solveDFS = (nodeId: string): number => {
      const meta = nodesList.find((n) => n.id === nodeId);
      const source = findNodeInTree(tree, nodeId);
      if (!meta || !source) return 100;
      if (!source.children || source.children.length === 0 || source.collapsed) {
        const y = 60 + leafYIndex * verticalGap;
        meta.y = y;
        leafYIndex++;
        return y;
      }
      const childrenY = source.children.map((c) => solveDFS(c.id));
      const avgY = childrenY.reduce((a, b) => a + b, 0) / childrenY.length;
      meta.y = avgY;
      return avgY;
    };
    solveDFS(tree.id);

    nodesList.forEach((n) => {
      if (n.parentId) {
        const parent = nodesList.find((p) => p.id === n.parentId);
        if (parent) {
          linksList.push({
            fromX: parent.x + 200,
            fromY: parent.y + 22,
            toX: n.x,
            toY: n.y + 22,
            depth: n.depth,
          });
        }
      }
    });

    return { nodesList, linksList, maxLeafHeight: leafYIndex * verticalGap + 200 };
  };

  const { nodesList, linksList, maxLeafHeight } = computePositions();

  const totalNodes = nodesList.length;
  const maxDepth = nodesList.reduce((m, n) => Math.max(m, n.depth), 0);

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
              {totalNodes} nodes · depth {maxDepth} · click to collapse, double-click to edit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => handleUpdate(defaultTree)}
            icon={<RefreshCw size={14} />}
            title="Reset"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* ── Workspace: Canvas + optional format panel ────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden bg-white">
          {/* dotted grid background — matches Stitch grid-bg */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #e0e3e5 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Floating zoom toolbar — top right */}
          <div className="absolute top-4 right-4 z-30 flex flex-col bg-white border border-[var(--color-border-subtle)] rounded-[10px] shadow-[var(--shadow-card)] overflow-hidden">
            <button
              onClick={() => setZoom(Math.min(1.6, +(zoom + 0.1).toFixed(2)))}
              className="p-2 hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] text-center py-1">
              {Math.round(zoom * 100)}%
            </div>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button
              onClick={() => setZoom(Math.max(0.5, +(zoom - 0.1).toFixed(2)))}
              className="p-2 hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <button
              onClick={() => setZoom(1)}
              className="p-2 hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"
              title="Fit / Reset zoom"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          {/* Scrollable canvas */}
          <div className="absolute inset-0 overflow-auto">
            <div
              className="relative origin-top-left transition-transform duration-150 p-8"
              style={{
                transform: `scale(${zoom})`,
                width: `${Math.max(1200, 400 + nodesList.length * 50)}px`,
                height: `${Math.max(620, maxLeafHeight)}px`,
              }}
            >
              {/* SVG connectors */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ minHeight: maxLeafHeight }}
              >
                {linksList.map((link, idx) => {
                  const dx = Math.abs(link.toX - link.fromX) * 0.45;
                  const p1x = link.fromX + dx;
                  const p1y = link.fromY;
                  const p2x = link.toX - dx;
                  const p2y = link.toY;
                  const pathStr = `M ${link.fromX} ${link.fromY} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${link.toX} ${link.toY}`;
                  const color =
                    palette.nodes[(link.depth - 1) % palette.nodes.length] || palette.nodes[0];
                  return (
                    <path
                      key={idx}
                      d={pathStr}
                      fill="none"
                      stroke={color}
                      strokeWidth={link.depth === 1 ? 2.5 : 1.5}
                      strokeOpacity={link.depth === 1 ? 0.9 : 0.6}
                    />
                  );
                })}
              </svg>

              {/* Interactive node cards */}
              {nodesList.map((node) => {
                const isEditing = editingId === node.id;
                const isRoot = node.id === "root";
                const isPrimary = node.parentId === "root";
                const branchColor =
                  isPrimary
                    ? palette.nodes[
                        (nodesList
                          .filter((n) => n.parentId === "root")
                          .findIndex((n) => n.id === node.id)) % palette.nodes.length
                      ]
                    : "";

                return (
                  <div
                    key={node.id}
                    className={`absolute flex items-center gap-1 select-none pointer-events-auto transition-all group ${
                      isRoot
                        ? "shadow-2xl border-2"
                        : "border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[2px]"
                    }`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: "200px",
                      zIndex: isRoot ? 30 : 20,
                      backgroundColor: isRoot
                        ? palette.ring
                        : isPrimary
                        ? branchColor
                        : "#ffffff",
                      borderColor: isRoot
                        ? "#ffffff"
                        : isPrimary
                        ? branchColor
                        : "var(--color-border-subtle)",
                      borderRadius: isRoot ? "16px" : isPrimary ? "9999px" : "10px",
                      padding: isRoot ? "14px 16px" : isPrimary ? "8px 14px" : "8px 12px",
                      color: isRoot || isPrimary ? "#ffffff" : "var(--color-text-primary)",
                    }}
                  >
                    {/* Collapse / Expand button */}
                    {!isRoot && (
                      <button
                        onClick={() => toggleCollapse(node.id)}
                        className={`p-1 rounded-md transition ${
                          isPrimary
                            ? "hover:bg-white/20 text-white/80"
                            : "hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {node.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}

                    {/* Label / Editor */}
                    <div className="flex-1 min-w-0 pr-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLabel}
                          autoFocus
                          onChange={(e) => setEditLabel(e.target.value)}
                          onBlur={() => saveEditNode(node.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditNode(node.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full text-[13px] bg-white border-2 border-[var(--color-primary)] focus:outline-none rounded-md px-2 py-0.5 font-semibold text-[var(--color-text-primary)]"
                        />
                      ) : (
                        <div
                          onDoubleClick={() => handleEditNode(node.id, node.label)}
                          className={`truncate cursor-pointer ${
                            isRoot
                              ? "text-[15px] font-bold tracking-wide text-center"
                              : isPrimary
                              ? "text-[13px] font-bold"
                              : "text-[13px] font-medium text-[var(--color-text-primary)]"
                          }`}
                          title="Nhấp đúp chuột để sửa"
                        >
                          {node.label}
                        </div>
                      )}
                    </div>

                    {/* Hover controls */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={() => addChildNode(node.id)}
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
                          onClick={() => deleteNode(node.id)}
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
              {/* Color palette picker */}
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
              </div>

              {/* Layout swatches (visual only) */}
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-wider block mb-3">
                  Khung
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      className={`aspect-video border rounded-lg flex items-center justify-center transition-all ${
                        i === 3
                          ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 ${
                          i === 3 ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        {i === 0 && (
                          <path d="M4 12h16M12 4v16" strokeLinecap="round" />
                        )}
                        {i === 1 && (
                          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                        )}
                        {i === 2 && (
                          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {i === 3 && (
                          <path d="M4 12l8-8 8 8M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {i === 4 && (
                          <path d="M12 4v16m-8-8h16" strokeLinecap="round" />
                        )}
                        {i === 5 && (
                          <path
                            d="M4 12h16M4 6h16M4 18h16"
                            strokeDasharray="2 2"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font weight visual */}
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

              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t border-[var(--color-border-subtle)]">
                Tip: nhấp đúp chuột vào một node để chỉnh sửa nội dung; di chuột để hiện
                nút thêm/xóa nhánh.
              </p>
            </div>
          </aside>
        )}
      </div>
    </Card>
  );
}
