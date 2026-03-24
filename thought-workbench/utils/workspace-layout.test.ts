import { describe, expect, it } from "vitest";
import type { TopicItem } from "../types";
import { arrangeWorkspaceTopics, getWorkspaceArrangeTopicIds } from "./workspace-layout";

function makeTopic(id: string, x: number, y: number, parentTopicId: string | null = null, size = 100): TopicItem {
  return {
    id,
    title: id,
    folder: "root",
    description: "",
    axisPreset: { x: "x", y: "y", z: "z" },
    sourceFile: `${id}.md`,
    workspace: { x, y, size },
    nodes: [],
    edges: [],
    history: [],
    unresolvedTopicLinks: [],
    activeMethods: [],
    paraCategory: "Projects",
    mustOneNodeId: null,
    mustOneDate: null,
    mustOneHistory: [],
    style: { sphereOpacity: 0.3, edgeOpacity: 0.5, gridOpacity: 0.1, nodeScale: 1, labelScale: 1, perspective: 800, showLabels: true, centerOffsetX: 0, centerOffsetY: 0 },
    canvasRegions: [],
    parentTopicId,
    layerStyles: {},
  };
}

describe("workspace-layout", () => {
  it("selected topic の sibling group を返す", () => {
    const topics = [
      makeTopic("a", 0, 0, null),
      makeTopic("b", 10, 0, "p"),
      makeTopic("c", 20, 0, "p"),
      makeTopic("d", 30, 0, "q"),
    ];
    expect(getWorkspaceArrangeTopicIds(topics, "b")).toEqual(["b", "c"]);
  });

  it("align-x で x を揃える", () => {
    const topics = [makeTopic("a", 0, 0), makeTopic("b", 20, 10), makeTopic("c", 40, 30)];
    const next = arrangeWorkspaceTopics(topics, ["a", "b", "c"], "align-x");
    expect(new Set(next.map((topic) => topic.workspace.x)).size).toBe(1);
  });

  it("distribute-y で y 順序を保ったまま再配置する", () => {
    const topics = [makeTopic("a", 0, 0), makeTopic("b", 0, 50), makeTopic("c", 0, 100)];
    const next = arrangeWorkspaceTopics(topics, ["a", "b", "c"], "distribute-y");
    expect(next[0].workspace.y).toBeLessThan(next[1].workspace.y);
    expect(next[1].workspace.y).toBeLessThan(next[2].workspace.y);
  });

  it("grid で複数行に再配置する", () => {
    const topics = [
      makeTopic("a", 0, 0),
      makeTopic("b", 10, 0),
      makeTopic("c", 20, 0),
      makeTopic("d", 30, 0),
    ];
    const next = arrangeWorkspaceTopics(topics, ["a", "b", "c", "d"], "grid");
    const xs = new Set(next.map((topic) => topic.workspace.x.toFixed(2)));
    const ys = new Set(next.map((topic) => topic.workspace.y.toFixed(2)));
    expect(xs.size).toBeGreaterThan(1);
    expect(ys.size).toBeGreaterThan(1);
  });

  it("radial で中心からの距離をおおむね揃える", () => {
    const topics = [
      makeTopic("a", -10, 0),
      makeTopic("b", 10, 0),
      makeTopic("c", 0, 10),
      makeTopic("d", 0, -10),
    ];
    const next = arrangeWorkspaceTopics(topics, ["a", "b", "c", "d"], "radial");
    const centerX = next.reduce((sum, topic) => sum + topic.workspace.x, 0) / next.length;
    const centerY = next.reduce((sum, topic) => sum + topic.workspace.y, 0) / next.length;
    const distances = next.map((topic) => Math.hypot(topic.workspace.x - centerX, topic.workspace.y - centerY));
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    expect(max - min).toBeLessThan(0.001);
  });

  it("pack で topic 同士が重ならないように詰める", () => {
    const topics = [
      makeTopic("a", 0, 0, null, 120),
      makeTopic("b", 5, 0, null, 90),
      makeTopic("c", 10, 0, null, 80),
      makeTopic("d", 15, 0, null, 70),
      makeTopic("e", 20, 0, null, 60),
    ];
    const next = arrangeWorkspaceTopics(topics, topics.map((topic) => topic.id), "pack");
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const distance = Math.hypot(
          next[i].workspace.x - next[j].workspace.x,
          next[i].workspace.y - next[j].workspace.y,
        );
        const minDistance = (next[i].workspace.size / 8.2) + (next[j].workspace.size / 8.2);
        expect(distance).toBeGreaterThanOrEqual(minDistance);
      }
    }
  });

  it("lane-x で folder ごとに別の横レーンへ分かれる", () => {
    const a = makeTopic("a", 0, 0); a.folder = "alpha";
    const b = makeTopic("b", 10, 0); b.folder = "alpha";
    const c = makeTopic("c", 20, 20); c.folder = "beta";
    const d = makeTopic("d", 30, 20); d.folder = "beta";
    const next = arrangeWorkspaceTopics([a, b, c, d], ["a", "b", "c", "d"], "lane-x");
    expect(next[0].workspace.y).toBe(next[1].workspace.y);
    expect(next[2].workspace.y).toBe(next[3].workspace.y);
    expect(next[0].workspace.y).not.toBe(next[2].workspace.y);
  });

  it("lane-y で folder ごとに別の縦レーンへ分かれる", () => {
    const a = makeTopic("a", 0, 0); a.folder = "alpha";
    const b = makeTopic("b", 0, 10); b.folder = "alpha";
    const c = makeTopic("c", 20, 20); c.folder = "beta";
    const d = makeTopic("d", 20, 30); d.folder = "beta";
    const next = arrangeWorkspaceTopics([a, b, c, d], ["a", "b", "c", "d"], "lane-y");
    expect(next[0].workspace.x).toBe(next[1].workspace.x);
    expect(next[2].workspace.x).toBe(next[3].workspace.x);
    expect(next[0].workspace.x).not.toBe(next[2].workspace.x);
  });

  it("cluster で folder ごとの塊に分かれる", () => {
    const a = makeTopic("a", 0, 0); a.folder = "alpha";
    const b = makeTopic("b", 2, 2); b.folder = "alpha";
    const c = makeTopic("c", 4, 4); c.folder = "beta";
    const d = makeTopic("d", 6, 6); d.folder = "beta";
    const next = arrangeWorkspaceTopics([a, b, c, d], ["a", "b", "c", "d"], "cluster");
    const alpha = next.filter((topic) => topic.folder === "alpha");
    const beta = next.filter((topic) => topic.folder === "beta");
    const alphaCenterX = alpha.reduce((sum, topic) => sum + topic.workspace.x, 0) / alpha.length;
    const alphaCenterY = alpha.reduce((sum, topic) => sum + topic.workspace.y, 0) / alpha.length;
    const betaCenterX = beta.reduce((sum, topic) => sum + topic.workspace.x, 0) / beta.length;
    const betaCenterY = beta.reduce((sum, topic) => sum + topic.workspace.y, 0) / beta.length;
    expect(Math.hypot(alphaCenterX - betaCenterX, alphaCenterY - betaCenterY)).toBeGreaterThan(1);
  });

  it("lane-x を para-category 軸で使える", () => {
    const a = makeTopic("a", 0, 0); a.paraCategory = "Projects";
    const b = makeTopic("b", 10, 0); b.paraCategory = "Projects";
    const c = makeTopic("c", 20, 20); c.paraCategory = "Areas";
    const d = makeTopic("d", 30, 20); d.paraCategory = "Areas";
    const next = arrangeWorkspaceTopics([a, b, c, d], ["a", "b", "c", "d"], "lane-x", "para-category");
    expect(next[0].workspace.y).toBe(next[1].workspace.y);
    expect(next[2].workspace.y).toBe(next[3].workspace.y);
    expect(next[0].workspace.y).not.toBe(next[2].workspace.y);
  });
});
