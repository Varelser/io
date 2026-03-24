/**
 * ファイル形式別コンバーター
 * 各形式をマークダウン文字列に変換し、既存の parseMarkdownTopic パイプラインに流す
 */

import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// ---------------------------------------------------------------------------
// HTML → Markdown
// ---------------------------------------------------------------------------
export function htmlToMarkdown(html: string, filename: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || filenameToTitle(filename);
  const lines: string[] = [`---`, `title: ${title}`, `folder: Import`, `---`, ""];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10);
      const hashes = "#".repeat(level);
      lines.push("", `${hashes} ${el.textContent?.trim() || ""}`, "");
    } else if (tag === "p") {
      lines.push("", el.textContent?.trim() || "", "");
    } else if (tag === "li") {
      lines.push(`- ${el.textContent?.trim() || ""}`);
    } else if (tag === "pre" || tag === "code") {
      lines.push("", "```", el.textContent || "", "```", "");
    } else if (tag === "br") {
      lines.push("");
    } else if (tag === "blockquote") {
      const text = el.textContent?.trim() || "";
      text.split("\n").forEach((l) => lines.push(`> ${l.trim()}`));
    } else if (tag === "table") {
      convertTable(el, lines);
    } else if (tag === "style" || tag === "script" || tag === "noscript") {
      return; // skip
    } else {
      for (const child of Array.from(node.childNodes)) walk(child);
    }
  }

  const body = doc.body || doc.documentElement;
  for (const child of Array.from(body.childNodes)) walk(child);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function convertTable(el: Element, lines: string[]) {
  const rows = Array.from(el.querySelectorAll("tr"));
  if (!rows.length) return;
  const matrix = rows.map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) => cell.textContent?.trim() || "")
  );
  if (!matrix.length) return;
  lines.push("");
  lines.push("| " + matrix[0].join(" | ") + " |");
  lines.push("| " + matrix[0].map(() => "---").join(" | ") + " |");
  for (let i = 1; i < matrix.length; i++) {
    lines.push("| " + matrix[i].join(" | ") + " |");
  }
  lines.push("");
}

// ---------------------------------------------------------------------------
// SVG → Markdown
// ---------------------------------------------------------------------------
export function svgToMarkdown(svgText: string, filename: string): string {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const title = doc.querySelector("title")?.textContent?.trim() || filenameToTitle(filename);
  const lines: string[] = [`---`, `title: ${title}`, `folder: Import`, `---`, "", `# ${title}`, ""];

  // Extract all <text> elements with position info
  const textEls = Array.from(doc.querySelectorAll("text"));
  const groups = new Map<string, string[]>();

  for (const el of textEls) {
    const content = el.textContent?.trim();
    if (!content) continue;
    // Group by parent <g> id or label
    const parentG = el.closest("g");
    const groupLabel = parentG?.getAttribute("inkscape:label")
      || parentG?.getAttribute("id")
      || parentG?.getAttribute("data-name")
      || "_root";
    if (!groups.has(groupLabel)) groups.set(groupLabel, []);
    groups.get(groupLabel)!.push(content);
  }

  if (groups.size === 0) {
    lines.push("(SVG contains no text elements)");
  } else if (groups.size === 1 && groups.has("_root")) {
    // Flat list
    for (const text of groups.get("_root")!) {
      lines.push(`## ${text}`, "");
    }
  } else {
    for (const [groupName, texts] of groups) {
      if (groupName !== "_root") {
        lines.push(`## ${groupName}`, "");
      }
      for (const text of texts) {
        lines.push(`### ${text}`, "");
      }
    }
  }

  // Extract <desc> and <metadata>
  const desc = doc.querySelector("desc")?.textContent?.trim();
  if (desc) lines.push("", "---", "", desc);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// PDF → Markdown  (pdfjs-dist, lazy loaded)
// ---------------------------------------------------------------------------
export async function pdfToMarkdown(arrayBuffer: ArrayBuffer, filename: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled worker so PDF import also works offline.
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const title = filenameToTitle(filename);
  const lines: string[] = [`---`, `title: ${title}`, `folder: Import`, `---`, ""];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageLines: string[] = [];
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[]; height: number };
      const y = Math.round(textItem.transform[5]);
      const text = textItem.str.trim();
      if (!text) continue;

      // Detect heading by font size
      const fontSize = textItem.height;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        // New line
        if (fontSize >= 18) {
          pageLines.push("", `# ${text}`);
        } else if (fontSize >= 14) {
          pageLines.push("", `## ${text}`);
        } else {
          pageLines.push(text);
        }
      } else {
        // Same line continuation
        if (pageLines.length > 0) {
          pageLines[pageLines.length - 1] += " " + text;
        } else {
          pageLines.push(text);
        }
      }
      lastY = y;
    }

    if (pdf.numPages > 1) {
      lines.push(`## Page ${i}`, "");
    }
    lines.push(...pageLines, "");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// DOCX → Markdown  (mammoth, lazy loaded)
// ---------------------------------------------------------------------------
export async function docxToMarkdown(arrayBuffer: ArrayBuffer, filename: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  // Reuse HTML converter
  const md = htmlToMarkdown(html, filename);

  // If mammoth didn't produce title in HTML, ensure frontmatter has it
  if (!md.includes("title:")) {
    const title = filenameToTitle(filename);
    return `---\ntitle: ${title}\nfolder: Import\n---\n\n${md}`;
  }
  return md;
}

// ---------------------------------------------------------------------------
// Utility: detect format and convert
// ---------------------------------------------------------------------------
const EXT_MAP: Record<string, "markdown" | "html" | "svg" | "pdf" | "docx"> = {
  ".md": "markdown",
  ".markdown": "markdown",
  ".html": "html",
  ".htm": "html",
  ".xhtml": "html",
  ".svg": "svg",
  ".pdf": "pdf",
  ".docx": "docx",
};

export function detectFileFormat(filename: string): "markdown" | "html" | "svg" | "pdf" | "docx" {
  const lower = filename.toLowerCase();
  for (const [ext, fmt] of Object.entries(EXT_MAP)) {
    if (lower.endsWith(ext)) return fmt;
  }
  return "markdown"; // fallback
}

export async function convertFileToMarkdown(file: File): Promise<string> {
  const format = detectFileFormat(file.name);

  switch (format) {
    case "html":
      return htmlToMarkdown(await file.text(), file.name);
    case "svg":
      return svgToMarkdown(await file.text(), file.name);
    case "pdf":
      return pdfToMarkdown(await file.arrayBuffer(), file.name);
    case "docx":
      return docxToMarkdown(await file.arrayBuffer(), file.name);
    case "markdown":
    default:
      return file.text();
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function filenameToTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "Untitled";
}

/**
 * file input の accept 属性に使う文字列
 */
export const FILE_IMPORT_ACCEPT = ".md,.markdown,.html,.htm,.xhtml,.svg,.pdf,.docx,text/markdown,text/plain,text/html,image/svg+xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
