import type { AppState, TopicItem } from "../types";

type ExportLang = "ja" | "en";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForHtml(value: string) {
  return value.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function summarizeTopic(topic: TopicItem) {
  const layers = new Set(topic.nodes.map((node) => node.layer || "(none)"));
  const groups = new Set(topic.nodes.map((node) => node.group || "(none)"));
  const activeMethods = topic.activeMethods || [];
  const branchCount = 0;
  return {
    id: topic.id,
    title: topic.title,
    folder: topic.folder || "-",
    description: topic.description || "",
    nodeCount: topic.nodes.length,
    edgeCount: topic.edges.length,
    layerCount: layers.size,
    groupCount: groups.size,
    activeMethods,
    mustOneNodeId: topic.mustOneNodeId,
    branchCount,
    nodes: topic.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
      layer: node.layer || "(none)",
      group: node.group || "(none)",
      note: node.note || "",
      updatedAt: node.updatedAt || node.createdAt || "",
    })),
  };
}

function buildStats(state: AppState) {
  const topics = state.topics.length;
  const nodes = state.topics.reduce((sum, topic) => sum + topic.nodes.length, 0);
  const edges = state.topics.reduce((sum, topic) => sum + topic.edges.length, 0);
  return {
    topics,
    nodes,
    edges,
    branches: state.scenarioBranches?.length || 0,
    bookmarks: state.bookmarks?.length || 0,
    layouts: state.layoutPresets?.length || 0,
    bundles: state.bundles?.length || 0,
    journals: state.journals.length,
  };
}

export function buildStandaloneWorkspaceHtml(
  state: AppState,
  {
    lang = "ja",
    title = "Thought Workbench Snapshot",
    generatedAt = new Date().toISOString(),
  }: {
    lang?: ExportLang;
    title?: string;
    generatedAt?: string;
  } = {}
) {
  const labels = lang === "ja"
    ? {
        subtitle: "単一 HTML で持ち運べるワークスペーススナップショット",
        generated: "生成時刻",
        summary: "概要",
        topics: "トピック",
        nodes: "ノード",
        edges: "エッジ",
        branches: "分岐",
        bookmarks: "ブックマーク",
        layouts: "レイアウト",
        bundles: "バンドル",
        journals: "ジャーナル",
        methods: "管理法",
        layers: "レイヤー",
        groups: "グループ",
        mustOne: "Must One",
        noMustOne: "未設定",
        emptyDescription: "説明なし",
        downloadJson: "埋め込み JSON を保存",
        copySummary: "概要をコピー",
        filterPlaceholder: "topic / node / folder を絞り込み",
        noMatch: "一致する topic はありません",
        nodeList: "主要ノード",
      }
    : {
        subtitle: "Portable workspace snapshot as a single HTML file",
        generated: "Generated",
        summary: "Summary",
        topics: "Topics",
        nodes: "Nodes",
        edges: "Edges",
        branches: "Branches",
        bookmarks: "Bookmarks",
        layouts: "Layouts",
        bundles: "Bundles",
        journals: "Journals",
        methods: "Methods",
        layers: "Layers",
        groups: "Groups",
        mustOne: "Must One",
        noMustOne: "Not set",
        emptyDescription: "No description",
        downloadJson: "Download embedded JSON",
        copySummary: "Copy summary",
        filterPlaceholder: "Filter by topic / node / folder",
        noMatch: "No matching topics",
        nodeList: "Key nodes",
      };

  const stats = buildStats(state);
  const topicSummaries = state.topics.map(summarizeTopic);
  const stateJson = escapeJsonForHtml(JSON.stringify(state));
  const summaryText = [
    `${labels.topics}: ${stats.topics}`,
    `${labels.nodes}: ${stats.nodes}`,
    `${labels.edges}: ${stats.edges}`,
    `${labels.branches}: ${stats.branches}`,
    `${labels.bookmarks}: ${stats.bookmarks}`,
    `${labels.layouts}: ${stats.layouts}`,
    `${labels.bundles}: ${stats.bundles}`,
    `${labels.journals}: ${stats.journals}`,
  ].join(" | ");

  const topicCards = topicSummaries.map((topic) => {
    const mustOneNode = topic.mustOneNodeId
      ? topic.nodes.find((node) => node.id === topic.mustOneNodeId)?.label || topic.mustOneNodeId
      : labels.noMustOne;
    const nodes = topic.nodes
      .slice(0, 8)
      .map(
        (node) => `
          <li class="node-item" data-node-text="${escapeHtml(`${node.label} ${node.layer} ${node.group}`.toLowerCase())}">
            <div class="node-head">
              <span class="node-label">${escapeHtml(node.label)}</span>
              <span class="node-meta">${escapeHtml(node.type)} / ${escapeHtml(node.layer)}</span>
            </div>
            <div class="node-sub">${escapeHtml(node.group)}</div>
            ${node.note ? `<div class="node-note">${escapeHtml(node.note)}</div>` : ""}
          </li>`
      )
      .join("");

    return `
      <article class="topic-card" data-search="${escapeHtml(
        `${topic.title} ${topic.folder} ${topic.description} ${topic.nodes.map((node) => node.label).join(" ")}`.toLowerCase()
      )}">
        <div class="topic-card-head">
          <div>
            <div class="topic-folder">${escapeHtml(topic.folder)}</div>
            <h2>${escapeHtml(topic.title)}</h2>
          </div>
          <div class="topic-counts">
            <span>${labels.nodes}: ${topic.nodeCount}</span>
            <span>${labels.edges}: ${topic.edgeCount}</span>
          </div>
        </div>
        <p class="topic-description">${escapeHtml(topic.description || labels.emptyDescription)}</p>
        <div class="topic-metrics">
          <span>${labels.layers}: ${topic.layerCount}</span>
          <span>${labels.groups}: ${topic.groupCount}</span>
          <span>${labels.mustOne}: ${escapeHtml(mustOneNode)}</span>
        </div>
        ${topic.activeMethods.length ? `<div class="topic-methods">${labels.methods}: ${escapeHtml(topic.activeMethods.join(", "))}</div>` : ""}
        <details class="topic-details">
          <summary>${labels.nodeList}</summary>
          <ul class="node-list">${nodes}</ul>
        </details>
      </article>
    `;
  }).join("");

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: rgba(12, 18, 34, 0.82);
        --panel-2: rgba(19, 28, 51, 0.9);
        --line: rgba(148, 163, 184, 0.18);
        --text: #e5eefc;
        --muted: #8ca1c4;
        --accent: #6ee7b7;
        --accent-2: #7dd3fc;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(125, 211, 252, 0.16), transparent 28%),
          radial-gradient(circle at top left, rgba(110, 231, 183, 0.12), transparent 24%),
          linear-gradient(180deg, #0b1020 0%, #070b15 100%);
      }
      .shell {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 60px;
      }
      .hero, .stats, .toolbar, .topics {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        backdrop-filter: blur(18px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
      }
      .hero {
        padding: 24px;
      }
      .eyebrow {
        color: var(--accent);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-size: 11px;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: clamp(28px, 4vw, 42px);
        line-height: 1.05;
      }
      .hero p, .meta, .toolbar-note, .empty {
        color: var(--muted);
      }
      .meta {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        font-size: 13px;
      }
      .stats {
        margin-top: 16px;
        padding: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }
      .stat {
        padding: 12px 14px;
        border-radius: 16px;
        background: var(--panel-2);
        border: 1px solid rgba(148, 163, 184, 0.12);
      }
      .stat-label {
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .stat-value {
        margin-top: 6px;
        font-size: 24px;
        font-weight: 700;
      }
      .toolbar {
        margin-top: 16px;
        padding: 16px;
      }
      .toolbar-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar input {
        flex: 1 1 280px;
        min-width: 220px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: rgba(2, 6, 23, 0.42);
        color: var(--text);
        padding: 12px 14px;
      }
      .toolbar button {
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        color: #08111d;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
        font-weight: 700;
        cursor: pointer;
      }
      .toolbar-note {
        margin-top: 10px;
        font-size: 12px;
      }
      .topics {
        margin-top: 16px;
        padding: 18px;
      }
      .topic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 14px;
      }
      .topic-card {
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.14);
        background: rgba(10, 15, 29, 0.86);
        padding: 16px;
      }
      .topic-card-head {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        justify-content: space-between;
      }
      .topic-folder {
        color: var(--accent-2);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .topic-card h2 {
        margin: 6px 0 0;
        font-size: 20px;
      }
      .topic-counts {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--muted);
        font-size: 12px;
        text-align: right;
      }
      .topic-description {
        color: var(--muted);
        line-height: 1.55;
        min-height: 44px;
      }
      .topic-metrics, .topic-methods {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: var(--text);
      }
      .topic-metrics span, .topic-methods {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(30, 41, 59, 0.68);
        border: 1px solid rgba(148, 163, 184, 0.1);
      }
      .topic-details {
        margin-top: 12px;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
        padding-top: 12px;
      }
      .topic-details summary {
        cursor: pointer;
        color: var(--accent);
      }
      .node-list {
        list-style: none;
        margin: 12px 0 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }
      .node-item {
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.84);
        border: 1px solid rgba(148, 163, 184, 0.1);
      }
      .node-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .node-label {
        font-weight: 600;
      }
      .node-meta, .node-sub, .node-note {
        color: var(--muted);
        font-size: 12px;
      }
      .node-note {
        margin-top: 6px;
        line-height: 1.5;
      }
      .empty {
        display: none;
        padding: 18px 0 6px;
      }
      @media (max-width: 720px) {
        .shell {
          width: min(100%, calc(100% - 20px));
          padding-top: 18px;
        }
        .hero, .stats, .toolbar, .topics {
          border-radius: 18px;
        }
        .topic-card-head, .node-head {
          flex-direction: column;
        }
        .topic-counts {
          text-align: left;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <div class="eyebrow">Thought Workbench Snapshot</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(labels.subtitle)}</p>
        <div class="meta">
          <span>${escapeHtml(labels.generated)}: ${escapeHtml(generatedAt)}</span>
          <span>${escapeHtml(summaryText)}</span>
        </div>
      </section>

      <section class="stats" aria-label="${escapeHtml(labels.summary)}">
        <div class="stat"><div class="stat-label">${escapeHtml(labels.topics)}</div><div class="stat-value">${stats.topics}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.nodes)}</div><div class="stat-value">${stats.nodes}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.edges)}</div><div class="stat-value">${stats.edges}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.branches)}</div><div class="stat-value">${stats.branches}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.bookmarks)}</div><div class="stat-value">${stats.bookmarks}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.layouts)}</div><div class="stat-value">${stats.layouts}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.bundles)}</div><div class="stat-value">${stats.bundles}</div></div>
        <div class="stat"><div class="stat-label">${escapeHtml(labels.journals)}</div><div class="stat-value">${stats.journals}</div></div>
      </section>

      <section class="toolbar">
        <div class="toolbar-row">
          <input id="filter" type="search" placeholder="${escapeHtml(labels.filterPlaceholder)}" />
          <button id="download-json" type="button">${escapeHtml(labels.downloadJson)}</button>
          <button id="copy-summary" type="button">${escapeHtml(labels.copySummary)}</button>
        </div>
        <div class="toolbar-note">${escapeHtml(summaryText)}</div>
      </section>

      <section class="topics">
        <div class="topic-grid" id="topic-grid">
          ${topicCards}
        </div>
        <div class="empty" id="empty-state">${escapeHtml(labels.noMatch)}</div>
      </section>
    </div>

    <script id="tw-state" type="application/json">${stateJson}</script>
    <script>
      const embeddedState = JSON.parse(document.getElementById("tw-state").textContent || "{}");
      const filterInput = document.getElementById("filter");
      const cards = Array.from(document.querySelectorAll(".topic-card"));
      const emptyState = document.getElementById("empty-state");
      const summaryText = ${JSON.stringify(summaryText)};

      function applyFilter() {
        const query = (filterInput.value || "").trim().toLowerCase();
        let visible = 0;
        cards.forEach((card) => {
          const matched = !query || (card.dataset.search || "").includes(query);
          card.style.display = matched ? "" : "none";
          if (matched) visible += 1;
        });
        emptyState.style.display = visible ? "none" : "block";
      }

      document.getElementById("download-json").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(embeddedState, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "thought-workbench-snapshot.json";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });

      document.getElementById("copy-summary").addEventListener("click", async () => {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(summaryText);
      });

      filterInput.addEventListener("input", applyFilter);
      applyFilter();
    </script>
  </body>
</html>`;
}
