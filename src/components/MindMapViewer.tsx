import React, { useEffect, useRef, useState, useCallback } from "react";
import MindMap from "simple-mind-map";
import "simple-mind-map/dist/simpleMindMap.esm.min.css";
import type { MindMapNode } from "../types";
import {
  DEFAULT_MIND_MAP_TREE,
  fromSimpleMindMap,
  toSimpleMindMap,
  LAYOUT_OPTIONS,
  type SimpleMindMapLayout,
} from "../utils/mindMapAdapter";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import {
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  GitBranch,
  ArrowDownFromLine,
  Building2,
} from "lucide-react";

interface MindMapViewerProps {
  initialData?: MindMapNode;
  onUpdate?: (updated: MindMapNode) => void;
}

type MindMapInstance = InstanceType<typeof MindMap>;

const LAYOUT_ICONS: Record<SimpleMindMapLayout, React.ReactNode> = {
  mindMap: <Network size={16} />,
  logicalStructure: <GitBranch size={16} />,
  catalogOrganization: <ArrowDownFromLine size={16} />,
  organizationStructure: <Building2 size={16} />,
};

export default function MindMapViewer({ initialData, onUpdate }: MindMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<MindMapInstance | null>(null);
  const skipExternalSync = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  const [layout, setLayout] = useState<SimpleMindMapLayout>("mindMap");
  const [ready, setReady] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);

  onUpdateRef.current = onUpdate;

  const syncToParent = useCallback(() => {
    const instance = mindMapRef.current;
    if (!instance || !onUpdateRef.current) return;
    const root = instance.getData(false);
    if (!root) return;
    skipExternalSync.current = true;
    onUpdateRef.current(fromSimpleMindMap(root));
  }, []);

  const applyExternalData = useCallback((data?: MindMapNode) => {
    const instance = mindMapRef.current;
    if (!instance) return;
    const tree = data || DEFAULT_MIND_MAP_TREE;
    instance.setData(toSimpleMindMap(tree));
  }, []);

  // Init SimpleMindMap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const instance = new MindMap({
      el,
      data: toSimpleMindMap(initialData || DEFAULT_MIND_MAP_TREE),
      layout,
      theme: "classic4",
      readonly: false,
      enableFreeDrag: true,
      mousewheelAction: "zoom",
      mousewheelZoomActionReverse: true,
      isUseCustomNodeContent: false,
      fit: true,
    });

    mindMapRef.current = instance;
    setReady(true);

    const handleDataChange = () => syncToParent();
    const handleViewChange = () => {
      const view = instance.view.getTransformData();
      setScalePercent(Math.round((view?.state?.scale ?? 1) * 100));
    };

    instance.on("data_change", handleDataChange);
    instance.on("view_data_change", handleViewChange);
    instance.on("node_tree_render_end", handleViewChange);

    const ro = new ResizeObserver(() => {
      try {
        instance.resize();
      } catch {
        // container may be hidden during tab switch
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      instance.off("data_change", handleDataChange);
      instance.off("view_data_change", handleViewChange);
      instance.off("node_tree_render_end", handleViewChange);
      instance.destroy();
      mindMapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent passes new AI-generated mindmap
  useEffect(() => {
    if (!mindMapRef.current) return;
    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }
    if (initialData) {
      applyExternalData(initialData);
    }
  }, [initialData, applyExternalData]);

  const changeLayout = (next: SimpleMindMapLayout) => {
    setLayout(next);
    mindMapRef.current?.setLayout(next);
  };

  const zoomIn = () => mindMapRef.current?.view.enlarge();
  const zoomOut = () => mindMapRef.current?.view.narrow();
  const fitView = () => mindMapRef.current?.view.fit();

  const resetTree = () => {
    applyExternalData(DEFAULT_MIND_MAP_TREE);
    syncToParent();
  };

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-[78vh] min-h-[600px] border border-[var(--color-border-subtle)]">
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
              Powered by{" "}
              <a
                href="https://github.com/wanglin2/mind-map"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-primary)] hover:underline"
              >
                SimpleMindMap
              </a>
              {" "}· Tab/Enter thêm node · F2 sửa · kéo thả tự do
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => changeLayout(opt.id)}
              className={`px-3 h-9 rounded-full text-[12px] font-medium flex items-center gap-1.5 border transition-colors ${
                layout === opt.id
                  ? "bg-[var(--color-primary)] text-white border-transparent"
                  : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              }`}
              title={opt.label}
            >
              {LAYOUT_ICONS[opt.id]}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}

          <div className="w-px h-6 bg-[var(--color-border-subtle)] mx-1" />

          <button
            onClick={zoomIn}
            disabled={!ready}
            className="p-2 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] disabled:opacity-40"
            title="Phóng to"
          >
            <ZoomIn size={16} />
          </button>
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] min-w-[36px] text-center">
            {scalePercent}%
          </span>
          <button
            onClick={zoomOut}
            disabled={!ready}
            className="p-2 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] disabled:opacity-40"
            title="Thu nhỏ"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={fitView}
            disabled={!ready}
            className="p-2 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)] disabled:opacity-40"
            title="Vừa khung hình"
          >
            <Maximize2 size={16} />
          </button>

          <Button variant="danger" size="sm" onClick={resetTree} icon={<RefreshCw size={14} />}>
            Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-[var(--color-surface-container-lowest)]">
        <div
          ref={containerRef}
          className="smm-mind-map-host absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-[14px] text-[var(--color-text-secondary)]">
            Đang tải mind map…
          </div>
        )}
      </div>
    </Card>
  );
}
