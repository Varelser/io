const { Notice, TFile, TFolder } = require("obsidian");

function sanitizePath(input) {
  return String(input || "")
    .replace(/[<>:"|?*\\]/g, "_")
    .replace(/\/+/g, "/")
    .trim()
    .replace(/^\/+|\/+$/g, "") || "untitled";
}

function sanitizeFilename(input) {
  return String(input || "")
    .replace(/[<>:"|?*\\/\[\]#^]/g, "_")
    .trim() || "untitled";
}

function buildFrontmatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${String(item)}`);
      continue;
    }
    lines.push(`${key}: ${String(value)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function ensureFolder(vault, folderPath) {
  const normalized = sanitizePath(folderPath);
  const parts = normalized.split("/").filter(Boolean);
  let currentPath = "";
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const existing = vault.getAbstractFileByPath(currentPath);
    if (!existing) {
      await vault.createFolder(currentPath);
      continue;
    }
    if (!(existing instanceof TFolder)) {
      throw new Error(`${currentPath} exists and is not a folder`);
    }
  }
}

async function upsertTextFile(vault, filePath, content) {
  const existing = vault.getAbstractFileByPath(filePath);
  if (!existing) {
    return vault.create(filePath, content);
  }
  if (!(existing instanceof TFile)) {
    throw new Error(`${filePath} exists and is not a file`);
  }
  await vault.modify(existing, content);
  return existing;
}

function findLatestJsonFile(vault, sourceFolder) {
  const normalized = sanitizePath(sourceFolder);
  const folder = vault.getAbstractFileByPath(normalized);
  if (!folder) {
    throw new Error(`Source folder not found: ${normalized}`);
  }
  if (!(folder instanceof TFolder)) {
    throw new Error(`Source path is not a folder: ${normalized}`);
  }

  const files = [];
  const stack = [...folder.children];
  while (stack.length > 0) {
    const entry = stack.shift();
    if (!entry) continue;
    if (entry instanceof TFolder) {
      stack.push(...entry.children);
      continue;
    }
    if (entry instanceof TFile && entry.extension.toLowerCase() === "json") {
      files.push(entry);
    }
  }

  if (files.length === 0) {
    throw new Error(`No JSON snapshot found in ${normalized}`);
  }

  files.sort((a, b) => (b.stat.mtime || 0) - (a.stat.mtime || 0));
  return files[0];
}

function buildNodeMap(state) {
  const nodeMap = new Map();
  for (const topic of state.topics || []) {
    for (const node of topic.nodes || []) {
      nodeMap.set(node.id, { node, topic });
    }
  }
  return nodeMap;
}

function buildTopicIndexContent(topic) {
  const frontmatter = buildFrontmatter({
    topicId: topic.id,
    title: topic.title,
    type: "topic",
    folder: topic.folder,
    description: topic.description,
    paraCategory: topic.paraCategory,
    nodeCount: topic.nodes.length,
    edgeCount: topic.edges.length,
    mustOneNodeId: topic.mustOneNodeId,
  });
  const nodeLinks = topic.nodes.map((node) => `- [[${sanitizeFilename(node.label)}]]`).join("\n");
  return `${frontmatter}# ${topic.title}\n\n${topic.description || ""}\n\n## Nodes\n\n${nodeLinks}\n`;
}

function buildNodeContent(topic, node, nodeMap) {
  const frontmatter = buildFrontmatter({
    title: node.label,
    type: node.type,
    tense: node.tense,
    layer: node.layer,
    group: node.group,
    confidence: node.confidence,
    tags: node.tags,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    topic: topic.title,
    topicId: topic.id,
    nodeId: node.id,
  });

  let body = `# ${node.label}\n\n`;
  if (node.note) body += `${node.note}\n\n`;

  const relatedEdges = (topic.edges || []).filter((edge) => edge.from === node.id || edge.to === node.id);
  if (relatedEdges.length > 0) {
    body += "## Relations\n\n";
    for (const edge of relatedEdges) {
      const otherId = edge.from === node.id ? edge.to : edge.from;
      const otherNode = topic.nodes.find((candidate) => candidate.id === otherId);
      const direction = edge.from === node.id ? "->" : "<-";
      if (otherNode) {
        body += `- ${direction} ${edge.relation || "related"}: [[${sanitizeFilename(otherNode.label)}]]${edge.meaning ? ` (${edge.meaning})` : ""}\n`;
      }
    }
    body += "\n";
  }

  if (node.counterArgumentNodeIds && node.counterArgumentNodeIds.length > 0) {
    body += "## Counter Arguments\n\n";
    for (const counterId of node.counterArgumentNodeIds) {
      const resolved = nodeMap.get(counterId);
      if (resolved) body += `- [[${sanitizeFilename(resolved.node.label)}]]\n`;
    }
    body += "\n";
  }

  if (node.task) {
    body += "## Task\n\n";
    body += `- Status: ${node.task.status}\n`;
    if (node.task.deadline) body += `- Deadline: ${node.task.deadline}\n`;
    if (node.task.priority != null) body += `- Priority: ${node.task.priority}\n`;
    body += "\n";
  }

  return `${frontmatter}${body}`;
}

async function writeImportReport(vault, targetFolder, report) {
  const path = `${targetFolder}/_import-report.md`;
  const content = `# Thought Workbench Import Report

- Source file: ${report.sourcePath}
- Imported at: ${report.importedAt}
- Topics: ${report.topicCount}
- Nodes: ${report.nodeCount}
- Files updated: ${report.updatedFiles}

## Topic folders

${report.topicFolders.map((folder) => `- ${folder}`).join("\n")}
`;
  await upsertTextFile(vault, path, content);
}

async function importSnapshotIntoVault(plugin, state, sourceFile) {
  if (!state || !Array.isArray(state.topics)) {
    throw new Error("Invalid Thought Workbench snapshot: topics array not found");
  }

  const targetRoot = sanitizePath(plugin.settings.importTargetFolder);
  const nodeMap = buildNodeMap(state);
  const importedAt = new Date().toISOString();
  const topicFolders = [];
  let updatedFiles = 0;
  let nodeCount = 0;

  await ensureFolder(plugin.app.vault, targetRoot);

  for (const topic of state.topics) {
    const folderPath = `${targetRoot}/${sanitizePath(topic.folder || "uncategorized")}/${sanitizeFilename(topic.title)}`;
    topicFolders.push(folderPath);
    await ensureFolder(plugin.app.vault, folderPath);
    await upsertTextFile(plugin.app.vault, `${folderPath}/_index.md`, buildTopicIndexContent(topic));
    updatedFiles += 1;

    for (const node of topic.nodes || []) {
      const nodePath = `${folderPath}/${sanitizeFilename(node.label)}.md`;
      await upsertTextFile(plugin.app.vault, nodePath, buildNodeContent(topic, node, nodeMap));
      updatedFiles += 1;
      nodeCount += 1;
    }
  }

  await writeImportReport(plugin.app.vault, targetRoot, {
    sourcePath: sourceFile.path,
    importedAt,
    topicCount: state.topics.length,
    nodeCount,
    updatedFiles,
    topicFolders,
  });

  plugin.settings.lastImportedSnapshot = sourceFile.path;
  plugin.settings.lastImportedAt = importedAt;
  await plugin.saveSettings();

  new Notice(`Thought Workbench snapshot imported: ${state.topics.length} topics / ${nodeCount} nodes`);
}

async function importLatestSnapshot(plugin) {
  try {
    const sourceFile = findLatestJsonFile(plugin.app.vault, plugin.settings.snapshotSourceFolder);
    const raw = await plugin.app.vault.read(sourceFile);
    const state = JSON.parse(raw);
    await importSnapshotIntoVault(plugin, state, sourceFile);
  } catch (error) {
    new Notice(error instanceof Error ? error.message : "Failed to import Thought Workbench snapshot");
  }
}

module.exports = {
  importLatestSnapshot,
};
