import React, { useState } from "react";
import { MindMapNode } from "../types";
import { Plus, Trash, ChevronRight, ChevronDown, RefreshCw, ZoomIn, ZoomOut, Download } from "lucide-react";

interface MindMapViewerProps {
  initialData?: MindMapNode;
  onUpdate?: (updated: MindMapNode) => void;
}

export default function MindMapViewer({ initialData, onUpdate }: MindMapViewerProps) {
  // Safe default tree if none is provided
  const defaultTree: MindMapNode = {
    id: "root",
    label: "Chủ đề học tập mới",
    children: [
      {
        id: "node_1",
        label: "I. Khái niệm cơ bản",
        children: [
          { id: "node_1_1", label: "1. Định nghĩa chính" },
          { id: "node_1_2", label: "2. Tại sao cần học?" }
        ]
      },
      {
        id: "node_2",
        label: "II. Phương pháp thực hành",
        children: [
          { id: "node_2_1", label: "A. Ghi chép sơ đồ" },
          { id: "node_2_2", label: "B. Kiểm tra ôn tập" }
        ]
      }
    ]
  };

  const [tree, setTree] = useState<MindMapNode>(initialData || defaultTree);
  const [zoom, setZoom] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");

  // Keep state sync with external file uploads
  React.useEffect(() => {
    if (initialData) {
      setTree(initialData);
    }
  }, [initialData]);

  // Deep update a node in the tree
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

  const handleUpdate = (updatedTree: MindMapNode) => {
    setTree({ ...updatedTree });
    if (onUpdate) {
      onUpdate(updatedTree);
    }
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
      node.children.push({
        id: newChildId,
        label: `Tiểu mục con mới`
      });
      node.collapsed = false; // keep open
    });
    handleUpdate(next);
  };

  const deleteNode = (id: string) => {
    if (id === "root") return; // cannot delete root
    const next = { ...tree };
    // Helper to delete node from parent's children
    const filterChildren = (current: MindMapNode): boolean => {
      if (current.children) {
        const lenBefore = current.children.length;
        current.children = current.children.filter((child) => child.id !== id);
        if (current.children.length < lenBefore) return true;
        for (const child of current.children) {
          if (filterChildren(child)) return true;
        }
      }
      return false;
    };
    filterChildren(next);
    handleUpdate(next);
  };

  // Convert Tree structure to absolute nodes and links lists for easy clean layouts
  const computePositions = () => {
    const nodesList: { id: string; label: string; x: number; y: number; depth: number; collapsed: boolean; parentId?: string }[] = [];
    const linksList: { fromX: number; fromY: number; toX: number; toY: number }[] = [];

    // Simple robust layout math:
    // depth determines X coord
    // Y coords are distributed amongst vertical columns
    let leafCounter = 0;

    const traverse = (node: MindMapNode, depth: number, parentX?: number, parentY?: number, parentId?: string) => {
      const x = 50 + depth * 220;
      
      // Let's compute Y based on a staggered layout
      let y = 0;
      nodesList.push({
        id: node.id,
        label: node.label,
        x,
        y: 0, // calculated later
        depth,
        collapsed: !!node.collapsed,
        parentId
      });

      const currentIdx = nodesList.length - 1;

      if (node.children && node.children.length > 0 && !node.collapsed) {
        node.children.forEach((child) => {
          traverse(child, depth + 1, x, 0, node.id);
        });
      } else {
        // leaf node
        leafCounter++;
      }
    };

    traverse(tree, 0);

    // Now assign vertical values spacing out leaves evenly
    let leafYIndex = 0;
    const verticalGap = 70;

    // First assign leaves, and compute non-leaves as averages
    const assignY = () => {
      const solveDFS = (nodeId: string): number => {
        const metaNode = nodesList.find((n) => n.id === nodeId);
        const sourceNode = findNodeInTree(tree, nodeId);
        if (!metaNode || !sourceNode) return 100;

        if (!sourceNode.children || sourceNode.children.length === 0 || sourceNode.collapsed) {
          const calculatedY = 60 + leafYIndex * verticalGap;
          metaNode.y = calculatedY;
          leafYIndex++;
          return calculatedY;
        } else {
          const childrenY = sourceNode.children.map((c) => solveDFS(c.id));
          const avgY = childrenY.reduce((a, b) => a + b, 0) / childrenY.length;
          metaNode.y = avgY;
          return avgY;
        }
      };
      solveDFS(tree.id);
    };

    assignY();

    // Now draft bezier connections
    nodesList.forEach((n) => {
      if (n.parentId) {
        const parent = nodesList.find((p) => p.id === n.parentId);
        if (parent) {
          linksList.push({
            fromX: parent.x + 160, // approximate box width offset
            fromY: parent.y + 20,  // half box height
            toX: n.x,
            toY: n.y + 20
          });
        }
      }
    });

    return { nodesList, linksList, maxLeafHeight: leafCounter * verticalGap + 120 };
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

  const { nodesList, linksList, maxLeafHeight } = computePositions();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden flex flex-col h-[700px]" id="mindmap-workspace">
      {/* Mindmap controllers */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Sơ Đồ Tư Duy Tương Tác</h2>
          <p className="text-xs text-slate-500">Tự động cấu trúc theo cây nội dung (I, II, III). Nhấp để thu gọn, chỉnh sửa hoặc tạo nhánh mới.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Thu nhỏ"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-mono text-slate-500 px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(1.4, zoom + 0.1))}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Phóng to"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => handleUpdate(defaultTree)}
            className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-rose-50 hover:text-rose-600 font-medium text-slate-600 transition flex items-center gap-1.5"
            title="Reset"
          >
            <RefreshCw size={13} />
            Reset Sơ Đồ
          </button>
        </div>
      </div>

      {/* SVG Canvas Board */}
      <div className="relative flex-1 bg-slate-50 rounded-xl overflow-auto border border-slate-100">
        <div
          className="absolute origin-top-left transition-all duration-150 p-8"
          style={{
            transform: `scale(${zoom})`,
            width: `${Math.max(1200, 400 + nodesList.length * 50)}px`,
            height: `${Math.max(550, maxLeafHeight)}px`
          }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: maxLeafHeight }}>
            <defs>
              <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {linksList.map((link, idx) => {
              // Draw a smooth cubic bezier curve
              const dx = Math.abs(link.toX - link.fromX) * 0.45;
              const p1x = link.fromX + dx;
              const p1y = link.fromY;
              const p2x = link.toX - dx;
              const p2y = link.toY;
              const pathStr = `M ${link.fromX} ${link.fromY} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${link.toX} ${link.toY}`;

              return (
                <path
                  key={idx}
                  d={pathStr}
                  fill="none"
                  stroke="url(#curveGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />
              );
            })}
          </svg>

          {/* Interactive HTML Node Cards */}
          {nodesList.map((node) => {
            const hasChildrenList = nodesList.some((n) => n.parentId === node.id);
            const isEditing = editingId === node.id;

            return (
              <div
                key={node.id}
                className="absolute flex items-center gap-1 bg-white select-none pointer-events-auto rounded-xl border border-slate-200/90 shadow-sm transition-all hover:shadow-md py-2 px-3 hover:border-indigo-400 group"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: "190px",
                  zIndex: 20
                }}
              >
                {/* Collapse / Expand handler if has kids */}
                {node.id !== "root" && (
                  <button
                    onClick={() => toggleCollapse(node.id)}
                    className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  >
                    {node.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {/* Node Label Display */}
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
                      }}
                      className="w-full text-xs bg-slate-50 border border-indigo-400 focus:outline-none rounded px-1.5 py-0.5 font-medium text-slate-800"
                    />
                  ) : (
                    <div
                      onDoubleClick={() => handleEditNode(node.id, node.label)}
                      className={`text-xs font-medium truncate curor-pointer py-0.5 ${
                        node.id === "root"
                          ? "text-indigo-700 font-semibold"
                          : node.parentId === "root"
                          ? "text-slate-800 font-medium"
                          : "text-slate-600"
                      }`}
                      title="Nhấp đúp chuột để sửa nội dung"
                    >
                      {node.label}
                    </div>
                  )}
                </div>

                {/* Tiny controls: plus node / delete node */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
                  <button
                    onClick={() => addChildNode(node.id)}
                    className="p-1 rounded hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600 transition"
                    title="Thêm nhánh mới"
                  >
                    <Plus size={12} />
                  </button>
                  {node.id !== "root" && (
                    <button
                      onClick={() => deleteNode(node.id)}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-500 transition"
                      title="Xóa nhánh"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
