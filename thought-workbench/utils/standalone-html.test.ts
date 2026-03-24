import { describe, expect, it } from "vitest";
import { buildStandaloneWorkspaceHtml } from "./standalone-html";
import { createSampleAppState } from "./sample-state";

describe("buildStandaloneWorkspaceHtml", () => {
  it("renders summary counts and topic content", () => {
    const html = buildStandaloneWorkspaceHtml(createSampleAppState("story-branch"), {
      lang: "ja",
      title: "Snapshot",
      generatedAt: "2026-03-21T12:34:56.000Z",
    });

    expect(html).toContain("<title>Snapshot</title>");
    expect(html).toContain("単一 HTML で持ち運べるワークスペーススナップショット");
    expect(html).toContain("作品構想 / Story Engine");
    expect(html).toContain("埋め込み JSON を保存");
    expect(html).toContain('"topic-story"');
  });

  it("escapes embedded state to avoid script break-out", () => {
    const state = createSampleAppState("story-branch");
    state.topics[0] = {
      ...state.topics[0],
      title: "</script><script>alert(1)</script>",
    };

    const html = buildStandaloneWorkspaceHtml(state, { lang: "en" });

    expect(html).toContain("&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e");
  });
});
