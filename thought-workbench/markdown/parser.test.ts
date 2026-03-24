import { describe, it, expect } from "vitest";
import { parseMarkdownTopic } from "./parser";

describe("parseMarkdownTopic", () => {
  it("シンプルな frontmatter と見出しを正しくパースする", () => {
    const md = `---
title: テストトピック
folder: テスト
---

# ノードA

ノードAの内容

# ノードB

ノードBの内容
`;
    const result = parseMarkdownTopic(md, "test.md");
    expect(result.title).toBe("テストトピック");
    expect(result.folder).toBe("テスト");
    expect(result.nodes.length).toBe(2);
    expect(result.nodes[0].label).toBe("ノードA");
    expect(result.nodes[1].label).toBe("ノードB");
  });

  it("note がノードのコンテンツとして設定される", () => {
    const md = `# ノードA\n\nこれはノードAの説明です。\n`;
    const result = parseMarkdownTopic(md, "test.md");
    expect(result.nodes[0].note).toBe("これはノードAの説明です。");
  });

  it("見出しがない場合はファイル名をラベルにした単一ノードになる", () => {
    const md = `本文だけのテキスト。見出しなし。`;
    const result = parseMarkdownTopic(md, "myfile.md");
    expect(result.nodes.length).toBe(1);
    expect(result.title).toBe("myfile");
  });

  it("[[wikilink]] から edges が生成される", () => {
    const md = `# ノードA\n\n[[ノードB]] を参照する\n\n# ノードB\n\n本文\n`;
    const result = parseMarkdownTopic(md, "test.md");
    expect(result.edges.length).toBeGreaterThan(0);
    // 参照エッジは ノードA → ノードB のはず
    const edge = result.edges.find((e) => {
      const fromNode = result.nodes.find((n) => n.id === e.from);
      const toNode = result.nodes.find((n) => n.id === e.to);
      return fromNode?.label === "ノードA" && toNode?.label === "ノードB";
    });
    expect(edge).toBeDefined();
  });

  it("mode='simple' では wikilink から edges を生成しない", () => {
    const md = `# ノードA\n\n[[ノードB]] を参照する\n\n# ノードB\n\n本文\n`;
    const result = parseMarkdownTopic(md, "test.md", "simple");
    expect(result.edges.length).toBe(0);
  });

  it("<!-- tw: --> コメントから type と tense を読む（parser.ts がマッピングするフィールド）", () => {
    const md = `# テストノード\n\n<!-- tw: {"type":"仮説","tense":"過去","size":1.2} -->\n\n内容\n`;
    const result = parseMarkdownTopic(md, "test.md");
    expect(result.nodes[0].type).toBe("仮説");
    expect(result.nodes[0].tense).toBe("過去");
    expect(result.nodes[0].size).toBeCloseTo(1.2, 5);
  });

  it("見出しレベルが layer に反映される", () => {
    const md = `# 見出し1\n\n内容\n\n## 見出し2\n\n内容\n`;
    const result = parseMarkdownTopic(md, "test.md");
    expect(result.nodes[0].layer).toBe("h1");
    expect(result.nodes[1].layer).toBe("h2");
  });

  it("frontmatter がない場合はファイル名がタイトルになる", () => {
    const md = `# ノード1\n\n内容\n`;
    const result = parseMarkdownTopic(md, "sample-topic.md");
    expect(result.title).toBe("sample-topic");
  });

  it("エッジは両端のノードが存在するもののみ残る", () => {
    // no invalid edges expected from a clean parse
    const md = `# A\n\n[[B]]\n\n# B\n\n本文\n`;
    const result = parseMarkdownTopic(md, "test.md");
    for (const edge of result.edges) {
      const fromOk = result.nodes.some((n) => n.id === edge.from);
      const toOk = result.nodes.some((n) => n.id === edge.to);
      expect(fromOk).toBe(true);
      expect(toOk).toBe(true);
    }
  });
});
