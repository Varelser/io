import type { NodeItem } from "./node";
import type { EdgeItem } from "./edge";
import type { HistoryFrame } from "./history";

/** 名前付きキャンバス領域 */
export type CanvasRegion = {
  id: string;
  label: string;
  bounds: { x: number; y: number; w: number; h: number };
  color: string;
};

export type MustOneHistoryEntry = {
  date: string;
  nodeId: string;
  label: string;
};

export type TopicLayerStyle = {
  visible: boolean;
  color: string;
};

export type UnresolvedTopicLink = {
  id?: string;
  targetTitle?: string;
  targetId?: string;
  targetFile?: string;
  relation?: string;
  meaning?: string;
};

export type TopicItem = {
  id: string;
  title: string;
  folder: string;
  description: string;
  axisPreset: { x: string; y: string; z: string };
  workspace: { x: number; y: number; size: number };
  style: {
    sphereOpacity: number;
    edgeOpacity: number;
    gridOpacity: number;
    nodeScale: number;
    labelScale: number;
    perspective: number;
    showLabels: boolean;
    centerOffsetX?: number;
    centerOffsetY?: number;
  };
  history: HistoryFrame[];
  paraCategory: string;
  mustOneNodeId: string | null;
  mustOneDate?: string | null;
  mustOneHistory?: MustOneHistoryEntry[];
  sourceFile: string;
  unresolvedTopicLinks: UnresolvedTopicLink[];
  nodes: NodeItem[];
  edges: EdgeItem[];
  /** 知識分野・ジャンル（例: "音楽理論", "認知科学", "哲学"） */
  domain?: string;
  /** 親球体のID（入れ子構造, null/undefined = ルートレベル） */
  parentTopicId?: string | null;
  /** 球体の外側に配置されたノードID群（「属せない/属さない」を表現） */
  outsideNodeIds?: string[];
  /** この球体でアクティブな管理法ID群 */
  activeMethods?: string[];
  /** 名前付きキャンバス領域（ワークスペース上の意味的区画） */
  canvasRegions?: CanvasRegion[];
  layerStyles?: Record<string, TopicLayerStyle>;
};

export type TopicLinkItem = {
  id: string;
  from: string;
  to: string;
  relation: string;
  meaning: string;
  contradictionType?: string;
  transformOp?: string;
};
