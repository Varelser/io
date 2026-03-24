import { describe, expect, it } from "vitest";
import { normalizeEdgeItem } from "./edge";
import { normalizeTopicLinks } from "./topic-links";

describe("relation canonicalization", () => {
  it("edge の 参照 は references に正規化される", () => {
    const edge = normalizeEdgeItem({ from: "a", to: "b", relation: "参照", meaning: "" });
    expect(edge.relation).toBe("references");
  });

  it("topic link の parent は contains に正規化される", () => {
    const links = normalizeTopicLinks(
      [{ id: "l1", from: "t1", to: "t2", relation: "parent", meaning: "" }],
      new Set(["t1", "t2"])
    );
    expect(links[0]?.relation).toBe("contains");
  });

  it("未知の relation はそのまま残す", () => {
    const edge = normalizeEdgeItem({ from: "a", to: "b", relation: "customLink", meaning: "" });
    expect(edge.relation).toBe("customLink");
  });
});
