import type { NodeItem, TopicItem } from "../types";
import type { ManagementMethod } from "../types/management-method";

/** ドット記法パスでノードのフィールド値を取得する（例: "observer.role", "extensions.stage"） */
export function resolveNodeField(node: NodeItem, path: string): unknown {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = node;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[part] ?? (cur.extensions ? cur.extensions[part] : undefined);
  }
  return cur;
}

/** 文字列値をHSLカラーに変換する（決定的ハッシュ） */
export function fieldValueToColor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 62%)`;
}

/** アクティブな管理法のcolorByに基づいてノードの色オーバーライドMapを生成する */
export function buildNodeColorOverrides(
  topic: TopicItem,
  methods: ManagementMethod[]
): Map<string, string> {
  const activeMethods = (topic.activeMethods || [])
    .map((id) => methods.find((m) => m.id === id))
    .filter((m): m is ManagementMethod => m != null);

  const colorByPath = activeMethods
    .map((m) => m.displayRules?.colorBy)
    .find(Boolean);

  const overrides = new Map<string, string>();
  if (!colorByPath) return overrides;

  for (const node of topic.nodes) {
    const raw = resolveNodeField(node, colorByPath);
    if (raw != null && raw !== "") {
      overrides.set(node.id, fieldValueToColor(String(raw)));
    }
  }
  return overrides;
}
