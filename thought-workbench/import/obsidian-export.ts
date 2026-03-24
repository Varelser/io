import type { AppState, TopicItem, NodeItem } from "../types";

/**
 * Obsidian 互換の Markdown ファイル群を生成する。
 * 各ノードが1つの .md ファイルになり、frontmatter でメタデータを保持。
 * Wikilink でノード間リンクを表現。
 * 返り値は { path: string, content: string }[] で、ZIP 化は呼び出し側で行う。
 */
export function generateObsidianVault(state: AppState): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];

  // Build global node lookup for wikilink resolution
  const nodeMap = new Map<string, { node: NodeItem; topic: TopicItem }>();
  for (const topic of state.topics) {
    for (const node of topic.nodes) {
      nodeMap.set(node.id, { node, topic });
    }
  }

  for (const topic of state.topics) {
    const folder = sanitizePath(topic.folder || "uncategorized");
    const topicDir = `${folder}/${sanitizePath(topic.title)}`;

    // Topic index file
    const topicFrontmatter = buildFrontmatter({
      title: topic.title,
      type: "topic",
      folder: topic.folder,
      description: topic.description,
      paraCategory: topic.paraCategory,
      nodeCount: topic.nodes.length,
      edgeCount: topic.edges.length,
    });
    const topicBody = `# ${topic.title}\n\n${topic.description || ""}\n\n## Nodes\n\n${topic.nodes.map((n) => `- [[${sanitizeFilename(n.label)}]]`).join("\n")}\n`;
    files.push({ path: `${topicDir}/_index.md`, content: topicFrontmatter + topicBody });

    // Node files
    for (const node of topic.nodes) {
      const fm = buildFrontmatter({
        title: node.label,
        type: node.type,
        tense: node.tense,
        layer: node.layer,
        group: node.group,
        depth: node.depth,
        confidence: node.confidence,
        intakeStatus: node.intakeStatus,
        workStatus: node.workStatus,
        evidenceBasis: node.evidenceBasis,
        versionState: node.versionState,
        materialStatus: node.materialStatus,
        hypothesisStage: node.hypothesisStage,
        knowledgePhase: node.knowledgePhase,
        membershipStatus: node.membershipStatus,
        tags: node.tags,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      });

      // Build body with wikilinks for edges
      let body = `# ${node.label}\n\n`;
      if (node.note) body += `${node.note}\n\n`;

      // Linked nodes via edges
      const relatedEdges = topic.edges.filter((e) => e.from === node.id || e.to === node.id);
      if (relatedEdges.length > 0) {
        body += `## Relations\n\n`;
        for (const edge of relatedEdges) {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const otherNode = topic.nodes.find((n) => n.id === otherId);
          const direction = edge.from === node.id ? "→" : "←";
          if (otherNode) {
            body += `- ${direction} ${edge.relation}: [[${sanitizeFilename(otherNode.label)}]]${edge.meaning ? ` (${edge.meaning})` : ""}\n`;
          }
        }
        body += "\n";
      }

      // Counter arguments
      if (node.counterArgumentNodeIds && node.counterArgumentNodeIds.length > 0) {
        body += `## Counter Arguments\n\n`;
        for (const cid of node.counterArgumentNodeIds) {
          const resolved = nodeMap.get(cid);
          if (resolved) body += `- [[${sanitizeFilename(resolved.node.label)}]]\n`;
        }
        body += "\n";
      }

      // URLs
      if (node.linkedUrls && node.linkedUrls.length > 0) {
        body += `## Links\n\n`;
        for (const url of node.linkedUrls) {
          body += `- ${url}\n`;
        }
        body += "\n";
      }

      // Observer
      if (node.observer?.viewpoint || node.observer?.role) {
        body += `## Observer\n\n`;
        if (node.observer.viewpoint) body += `- Viewpoint: ${node.observer.viewpoint}\n`;
        if (node.observer.role) body += `- Role: ${node.observer.role}\n`;
        if (node.observer.reEvaluation) body += `- Re-evaluation: ${node.observer.reEvaluation}\n`;
        body += "\n";
      }

      // Task
      if (node.task) {
        body += `## Task\n\n`;
        body += `- Status: ${node.task.status}\n`;
        if (node.task.deadline) body += `- Deadline: ${node.task.deadline}\n`;
        if (node.task.priority != null) body += `- Priority: ${node.task.priority}\n`;
        body += "\n";
      }

      files.push({ path: `${topicDir}/${sanitizeFilename(node.label)}.md`, content: fm + body });
    }
  }

  // Bundles
  if (state.bundles && state.bundles.length > 0) {
    for (const bundle of state.bundles) {
      const fm = buildFrontmatter({
        title: bundle.title,
        type: "bundle",
        bundleType: bundle.bundleType,
        status: bundle.status,
        tags: bundle.tags,
        createdAt: bundle.createdAt,
        updatedAt: bundle.updatedAt,
      });
      let body = `# ${bundle.title}\n\n${bundle.description || ""}\n\n## Members\n\n`;
      for (const nid of bundle.memberNodeIds) {
        const resolved = nodeMap.get(nid);
        if (resolved) body += `- [[${sanitizeFilename(resolved.node.label)}]]\n`;
      }
      files.push({ path: `_bundles/${sanitizeFilename(bundle.title)}.md`, content: fm + body });
    }
  }

  // Journals
  if (state.journals && state.journals.length > 0) {
    for (const entry of state.journals) {
      const fm = buildFrontmatter({
        date: entry.date,
        type: "journal",
        mood: entry.mood,
        tags: entry.tags,
      });
      files.push({ path: `_journal/${entry.date}.md`, content: fm + `# ${entry.date}\n\n${entry.body}\n` });
    }
  }

  return files;
}

function buildFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${String(item)}`);
      }
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

function sanitizePath(input: string): string {
  return input.replace(/[<>:"|?*\\\/]/g, "_").trim() || "untitled";
}

function sanitizeFilename(input: string): string {
  return input.replace(/[<>:"|?*\\\/\[\]#^]/g, "_").trim() || "untitled";
}
