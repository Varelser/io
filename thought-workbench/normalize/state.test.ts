import { describe, it, expect } from "vitest";
import { normalizeState, createFallbackAppState } from "./state";

describe("normalizeState", () => {
  it("null を渡したときフォールバック AppState を返す", () => {
    const result = normalizeState(null as any);
    expect(result.topics).toBeDefined();
    expect(Array.isArray(result.topics)).toBe(true);
    expect(result.topics.length).toBe(0);
  });

  it("undefined を渡したときフォールバック AppState を返す", () => {
    const result = normalizeState(undefined as any);
    expect(result.topics).toBeDefined();
  });

  it("topics が配列でない場合フォールバックを返す", () => {
    const bad = { topics: "not-an-array" } as any;
    const result = normalizeState(bad);
    expect(Array.isArray(result.topics)).toBe(true);
  });

  it("空の topics 配列でも正常に処理する", () => {
    const empty = { topics: [], topicLinks: [], journals: [] } as any;
    const result = normalizeState(empty);
    expect(result.topics).toEqual([]);
    expect(result.topicLinks).toEqual([]);
  });

  it("journals が配列でない場合は空配列になる", () => {
    const input = { topics: [], topicLinks: [], journals: "bad" } as any;
    const result = normalizeState(input);
    expect(Array.isArray(result.journals)).toBe(true);
    expect(result.journals.length).toBe(0);
  });

  it("壊れた topic エントリでも安全にフォールバックする", () => {
    const input = {
      topics: [null, undefined, { id: "t1", title: "valid", nodes: [] }],
      topicLinks: [],
      journals: [],
    } as any;
    const result = normalizeState(input);
    expect(result.topics.length).toBe(3);
    // 全 topic に id と nodes が存在する
    result.topics.forEach((t) => {
      expect(typeof t.id).toBe("string");
      expect(Array.isArray(t.nodes)).toBe(true);
    });
  });

  it("bookmarks / layoutPresets / scenarioBranches / nodeSelectionSets がない場合は空配列になる", () => {
    const input = { topics: [], topicLinks: [], journals: [] } as any;
    const result = normalizeState(input);
    expect(Array.isArray(result.bookmarks)).toBe(true);
    expect(Array.isArray(result.layoutPresets)).toBe(true);
    expect(Array.isArray(result.scenarioBranches)).toBe(true);
    expect(Array.isArray(result.nodeSelectionSets)).toBe(true);
  });

  it("createFallbackAppState は有効な AppState を返す", () => {
    const fallback = createFallbackAppState();
    expect(Array.isArray(fallback.topics)).toBe(true);
    expect(fallback.topics).toEqual([]);
    expect(fallback.topicLinks).toEqual([]);
  });
});
