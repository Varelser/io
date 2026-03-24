export function slugify(text: string) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSourceFilename(title: string) {
  const base = slugify(title || "topic") || "topic";
  return `${base}.md`;
}
