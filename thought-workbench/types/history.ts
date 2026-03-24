export type HistoryFrameNodeEntry = {
  id: string;
  position: [number, number, number];
  size: number;
  frameScale?: number;
  /** 意味フィールド（後方互換で optional） */
  label?: string;
  nodeType?: string;
  workStatus?: string;
  intakeStatus?: string;
};

export type HistoryFrame = {
  id: string;
  label: string;
  createdAt: string;
  nodes: HistoryFrameNodeEntry[];
};
