const { Notice, TFile, TFolder } = require("obsidian");

function sanitizePath(input) {
  return String(input || "")
    .replace(/[<>:"|?*\\]/g, "_")
    .replace(/\/+/g, "/")
    .trim()
    .replace(/^\/+|\/+$/g, "") || "untitled";
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

function extractFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { frontmatter: {}, body: raw };
  const closing = raw.indexOf("\n---\n", 4);
  if (closing === -1) return { frontmatter: {}, body: raw };
  const fmText = raw.slice(4, closing);
  const body = raw.slice(closing + 5);
  const frontmatter = {};
  let currentArrayKey = null;

  for (const line of fmText.split("\n")) {
    if (!line.trim()) continue;
    if (/^\s+-\s+/.test(line) && currentArrayKey) {
      frontmatter[currentArrayKey].push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const [, keyRaw, valueRaw] = match;
    const key = keyRaw.trim();
    const value = valueRaw.trim();
    if (value === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }
    currentArrayKey = null;
    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function stripHeading(body, heading) {
  const trimmed = body.trimStart();
  const marker = `# ${heading}`;
  if (!trimmed.startsWith(marker)) return body.trim();
  return trimmed.slice(marker.length).trim();
}

function extractPrimaryContent(body, heading) {
  const withoutHeading = stripHeading(body, heading);
  const lines = withoutHeading.split("\n");
  const collected = [];
  for (const line of lines) {
    if (line.startsWith("## ")) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function readNoteSection(body, heading) {
  const lines = body.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (startIndex === -1) return [];
  const values = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
    if (line.trim().startsWith("- ")) values.push(line.trim().slice(2));
  }
  return values;
}

function parseTaskSection(body) {
  const values = readNoteSection(body, "Task");
  if (!values.length) return undefined;
  const task = {};
  for (const entry of values) {
    const [label, ...rest] = entry.split(":");
    const value = rest.join(":").trim();
    const key = label.trim().toLowerCase();
    if (key === "status") task.status = value;
    if (key === "deadline") task.deadline = value;
    if (key === "priority") task.priority = Number(value);
  }
  return Object.keys(task).length ? task : undefined;
}

async function collectImportedMarkdown(vault, folderPath) {
  const normalized = sanitizePath(folderPath);
  const folder = vault.getAbstractFileByPath(normalized);
  if (!folder) {
    throw new Error(`Import target folder not found: ${normalized}`);
  }
  if (!(folder instanceof TFolder)) {
    throw new Error(`Import target path is not a folder: ${normalized}`);
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
    if (entry instanceof TFile && entry.extension.toLowerCase() === "md") {
      files.push(entry);
    }
  }
  return files;
}

async function buildExchange(plugin) {
  const files = await collectImportedMarkdown(plugin.app.vault, plugin.settings.importTargetFolder);
  const topicMap = new Map();
  const topicFolderMap = new Map();

  for (const file of files) {
    if (file.name === "_import-report.md") continue;
    const raw = await plugin.app.vault.read(file);
    const { frontmatter, body } = extractFrontmatter(raw);
    if (file.name === "_index.md") {
      const topicId = frontmatter.topicId || frontmatter.id || file.parent?.name;
      if (!topicId) continue;
      const existing = topicMap.get(topicId) || {
        topicId,
        title: frontmatter.title || file.parent?.name || topicId,
        folder: frontmatter.folder || file.parent?.path || "",
        description: extractPrimaryContent(body, frontmatter.title || file.parent?.name || topicId),
        paraCategory: frontmatter.paraCategory || "",
        mustOneNodeId: frontmatter.mustOneNodeId || null,
        nodes: [],
      };
      existing.title = frontmatter.title || existing.title;
      existing.folder = frontmatter.folder || existing.folder;
      existing.description = extractPrimaryContent(body, existing.title);
      existing.paraCategory = frontmatter.paraCategory || existing.paraCategory;
      existing.mustOneNodeId = frontmatter.mustOneNodeId || existing.mustOneNodeId || null;
      topicMap.set(topicId, existing);
      if (file.parent?.path) {
        topicFolderMap.set(file.parent.path, {
          topicId,
          title: existing.title,
          folder: existing.folder,
        });
      }
      continue;
    }
  }

  for (const file of files) {
    if (file.name === "_import-report.md" || file.name === "_index.md") continue;
    const raw = await plugin.app.vault.read(file);
    const { frontmatter, body } = extractFrontmatter(raw);
    const folderTopic = file.parent?.path ? topicFolderMap.get(file.parent.path) : null;
    const topicId = frontmatter.topicId || folderTopic?.topicId;
    const nodeId = frontmatter.nodeId;
    if (!topicId || !nodeId) continue;
    const topic = topicMap.get(topicId) || {
      topicId,
      title: frontmatter.topic || folderTopic?.title || file.parent?.name || topicId,
      folder: folderTopic?.folder || file.parent?.parent?.path || "",
      description: "",
      paraCategory: "",
      mustOneNodeId: null,
      nodes: [],
    };
    topic.nodes.push({
      nodeId,
      label: frontmatter.title || file.basename,
      type: frontmatter.type || "concept",
      tense: frontmatter.tense || "",
      layer: frontmatter.layer || "",
      group: frontmatter.group || "",
      confidence: frontmatter.confidence ? Number(frontmatter.confidence) : undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : undefined,
      createdAt: frontmatter.createdAt || "",
      updatedAt: frontmatter.updatedAt || new Date(file.stat.mtime || Date.now()).toISOString(),
      note: extractPrimaryContent(body, frontmatter.title || file.basename),
      task: parseTaskSection(body),
      sourcePath: file.path,
      exportedAt: new Date().toISOString(),
    });
    topicMap.set(topicId, topic);
  }

  const topics = Array.from(topicMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  return {
    kind: "thought-workbench-obsidian-exchange",
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "obsidian-plugin",
    importTargetFolder: plugin.settings.importTargetFolder,
    topics,
  };
}

async function exportExchange(plugin) {
  try {
    const exchange = await buildExchange(plugin);
    const outputFolder = sanitizePath(plugin.settings.exchangeOutputFolder);
    await ensureFolder(plugin.app.vault, outputFolder);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${outputFolder}/tw-obsidian-exchange-${stamp}.json`;
    await upsertTextFile(plugin.app.vault, path, `${JSON.stringify(exchange, null, 2)}\n`);
    plugin.settings.lastExchangePath = path;
    plugin.settings.lastExchangeAt = exchange.generatedAt;
    await plugin.saveSettings();
    new Notice(`Thought Workbench exchange exported: ${exchange.topics.length} topics`);
  } catch (error) {
    new Notice(error instanceof Error ? error.message : "Failed to export Thought Workbench exchange");
  }
}

module.exports = {
  exportExchange,
};
