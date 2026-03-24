import type { TopicItem, NodeItem, EdgeItem } from "../types";

// ── CSV Export ──

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

export function exportNodesCsv(topics: TopicItem[]): string {
  const headers = ["topic_id", "topic_title", "node_id", "label", "type", "tense", "layer", "group", "depth", "confidence", "size", "x", "y", "z", "note", "tags", "shared_id", "task_status", "task_deadline", "task_priority", "created_at", "updated_at"];
  const rows = [csvRow(headers)];

  topics.forEach((topic) => {
    topic.nodes.forEach((node) => {
      rows.push(csvRow([
        topic.id,
        topic.title,
        node.id,
        node.label,
        node.type,
        node.tense,
        node.layer,
        node.group,
        node.depth != null ? String(node.depth) : "",
        node.confidence != null ? String(node.confidence) : "",
        String(node.size),
        String(node.position[0]),
        String(node.position[1]),
        String(node.position[2]),
        node.note,
        (node.tags || []).join(";"),
        node.sharedId || "",
        node.task?.status || "",
        node.task?.deadline || "",
        node.task?.priority != null ? String(node.task.priority) : "",
        node.createdAt || "",
        node.updatedAt || "",
      ]));
    });
  });

  return rows.join("\n");
}

export function exportEdgesCsv(topics: TopicItem[]): string {
  const headers = ["topic_id", "topic_title", "edge_id", "from", "to", "relation", "meaning"];
  const rows = [csvRow(headers)];

  topics.forEach((topic) => {
    topic.edges.forEach((edge) => {
      rows.push(csvRow([
        topic.id,
        topic.title,
        edge.id,
        edge.from,
        edge.to,
        edge.relation,
        edge.meaning,
      ]));
    });
  });

  return rows.join("\n");
}

// ── CSV Import ──

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = fields[i] || ""; });
    return row;
  });
}

export function importNodesCsv(text: string): { topicId: string; topicTitle: string; node: Partial<NodeItem> }[] {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    topicId: row.topic_id || "",
    topicTitle: row.topic_title || "",
    node: {
      id: row.node_id || undefined,
      label: row.label || "imported",
      type: row.type || "concept",
      tense: row.tense || "現在",
      layer: row.layer || "",
      group: row.group || "",
      depth: row.depth ? Number(row.depth) : undefined,
      confidence: row.confidence ? Number(row.confidence) : undefined,
      size: row.size ? Number(row.size) : 0.3,
      position: [
        row.x ? Number(row.x) : 0,
        row.y ? Number(row.y) : 0,
        row.z ? Number(row.z) : 0,
      ] as [number, number, number],
      note: row.note || "",
      tags: row.tags ? row.tags.split(";").filter(Boolean) : [],
      sharedId: row.shared_id || undefined,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    },
  }));
}

export function importEdgesCsv(text: string): { topicId: string; edge: Partial<EdgeItem> }[] {
  const rows = parseCsv(text);
  return rows.map((row) => ({
    topicId: row.topic_id || "",
    edge: {
      id: row.edge_id || undefined,
      from: row.from || "",
      to: row.to || "",
      relation: row.relation || "",
      meaning: row.meaning || "",
    },
  }));
}

// ── Download helper ──

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
