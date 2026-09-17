import type { MindMapNode } from "../types";

/** SimpleMindMap node shape (subset used by WorkNote). */
export interface SimpleMindMapNode {
  data: {
    text: string;
    uid?: string;
    expand?: boolean;
    note?: string;
    fillColor?: string;
  };
  children?: SimpleMindMapNode[];
}

export type SimpleMindMapLayout =
  | "mindMap"
  | "logicalStructure"
  | "catalogOrganization"
  | "organizationStructure";

export function toSimpleMindMap(node: MindMapNode): SimpleMindMapNode {
  return {
    data: {
      text: node.label || "Nhánh mới",
      uid: node.id,
      expand: node.collapsed !== true,
      ...(node.notes ? { note: node.notes } : {}),
      ...(node.color ? { fillColor: node.color } : {}),
    },
    children: (node.children || []).map(toSimpleMindMap),
  };
}

export function fromSimpleMindMap(node: SimpleMindMapNode): MindMapNode {
  const id = node.data.uid || `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    label: node.data.text?.replace(/<[^>]+>/g, "").trim() || "Nhánh mới",
    collapsed: node.data.expand === false,
    ...(node.data.note ? { notes: node.data.note } : {}),
    ...(node.data.fillColor ? { color: node.data.fillColor } : {}),
    children: (node.children || []).map(fromSimpleMindMap),
  };
}

export const DEFAULT_MIND_MAP_TREE: MindMapNode = {
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
  ],
};

export const LAYOUT_OPTIONS: { id: SimpleMindMapLayout; label: string }[] = [
  { id: "mindMap", label: "Mind Map" },
  { id: "logicalStructure", label: "Cây ngang" },
  { id: "catalogOrganization", label: "Cây dọc" },
  { id: "organizationStructure", label: "Sơ đồ tổ chức" },
];
