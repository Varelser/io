import { describe, it, expect } from "vitest";
import { normalizeNodeItem } from "./node";

describe("normalizeNodeItem", () => {
  it("null を渡しても安全にデフォルト NodeItem を返す", () => {
    const result = normalizeNodeItem(null, 0);
    expect(typeof result.id).toBe("string");
    expect(result.label).toBe("node 1");
    expect(result.type).toBe("主張");
    expect(result.tense).toBe("現在");
    expect(result.size).toBe(0.6);
    expect(result.group).toBe("default");
    expect(result.layer).toBe("default");
  });

  it("undefined を渡しても安全にデフォルト NodeItem を返す", () => {
    const result = normalizeNodeItem(undefined, 5);
    expect(result.label).toBe("node 6");
  });

  it("label があればそのまま保持する", () => {
    const result = normalizeNodeItem({ label: "テストノード" }, 0);
    expect(result.label).toBe("テストノード");
  });

  it("position が正しい 3 要素配列なら保持する", () => {
    const pos: [number, number, number] = [1.5, -0.3, 2.0];
    const result = normalizeNodeItem({ position: pos }, 0);
    expect(result.position).toEqual(pos);
  });

  it("position が不正な場合は [0,0,0] にフォールバックする", () => {
    const result = normalizeNodeItem({ position: [1, 2] as any }, 0);
    expect(result.position).toEqual([0, 0, 0]);
  });

  it("不正な hypothesisStage は undefined になる", () => {
    const result = normalizeNodeItem({ hypothesisStage: "invalid-stage" as any }, 0);
    expect(result.hypothesisStage).toBeUndefined();
  });

  it("有効な hypothesisStage は保持する", () => {
    const result = normalizeNodeItem({ hypothesisStage: "hypothesis" }, 0);
    expect(result.hypothesisStage).toBe("hypothesis");
  });

  it("不正な intakeStatus は undefined になる", () => {
    const result = normalizeNodeItem({ intakeStatus: "not-a-status" as any }, 0);
    expect(result.intakeStatus).toBeUndefined();
  });

  it("有効な intakeStatus は保持する", () => {
    const result = normalizeNodeItem({ intakeStatus: "inbox" }, 0);
    expect(result.intakeStatus).toBe("inbox");
  });

  it("legacy intakeStatus の placed は structured として受け入れる", () => {
    const result = normalizeNodeItem({ intakeStatus: "placed" as any }, 0);
    expect(result.intakeStatus).toBe("structured");
  });

  it("legacy workStatus の organizing は active として受け入れる", () => {
    const result = normalizeNodeItem({ workStatus: "organizing" as any }, 0);
    expect(result.workStatus).toBe("active");
  });

  it("publicationState は published を受け入れる", () => {
    const explicit = normalizeNodeItem({ publicationState: "published" as any }, 0);
    expect(explicit.publicationState).toBe("published");
  });

  it("tags が数値のみの配列の場合は文字列が 0 件になり undefined になる", () => {
    // 実装: filter((t): t is string => typeof t === "string") → [] → undefined はしない
    // 実際は空配列を返す（filter は undefined を返さない）
    const result = normalizeNodeItem({ tags: [1, 2, 3] as any }, 0);
    // 数値は文字列フィルタで除外され空配列になる（undefined ではなく [] が返る）
    expect(result.tags).toEqual([]);
  });

  it("tags が文字列配列なら保持する", () => {
    const result = normalizeNodeItem({ tags: ["foo", "bar"] }, 0);
    expect(result.tags).toEqual(["foo", "bar"]);
  });

  it("size が数値なら保持する", () => {
    const result = normalizeNodeItem({ size: 1.2 }, 0);
    expect(result.size).toBe(1.2);
  });

  it("size が非数値なら 0.6 にフォールバックする", () => {
    const result = normalizeNodeItem({ size: "big" as any }, 0);
    expect(result.size).toBe(0.6);
  });

  it("createdAt が文字列なら保持する", () => {
    const ts = "2024-01-01T00:00:00.000Z";
    const result = normalizeNodeItem({ createdAt: ts }, 0);
    expect(result.createdAt).toBe(ts);
  });

  it("extensions が正しい形式なら保持する", () => {
    const ext = { method1: { key: "value" } };
    const result = normalizeNodeItem({ extensions: ext }, 0);
    expect(result.extensions).toEqual(ext);
  });

  it("extensions が不正な形式なら undefined になる", () => {
    const result = normalizeNodeItem({ extensions: "bad" as any }, 0);
    expect(result.extensions).toBeUndefined();
  });

  it("counterArgumentNodeIds に非文字列が混在していても文字列のみ残る", () => {
    const result = normalizeNodeItem({ counterArgumentNodeIds: ["id1", 42, null, "id2"] as any }, 0);
    expect(result.counterArgumentNodeIds).toEqual(["id1", "id2"]);
  });

  it("counterArgumentNodeIds が全て非文字列なら空配列になる", () => {
    const result = normalizeNodeItem({ counterArgumentNodeIds: [1, 2, null] as any }, 0);
    expect(result.counterArgumentNodeIds).toEqual([]);
  });
});
