import { NL } from "../constants/defaults";

export function parseFrontmatter(markdown: string) {
  const START = `---${NL}`;
  const END = `${NL}---${NL}`;
  if (!markdown.startsWith(START)) return { meta: {} as Record<string, any>, body: markdown };
  const end = markdown.indexOf(END, START.length);
  if (end === -1) return { meta: {} as Record<string, any>, body: markdown };
  const meta: Record<string, any> = {};
  markdown.slice(START.length, end).split(NL).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    if (!key) return;
    if (raw === "true" || raw === "false") meta[key] = raw === "true";
    else if (!Number.isNaN(Number(raw)) && raw !== "") meta[key] = Number(raw);
    else meta[key] = raw.replace(/^['\"]|['\"]$/g, "");
  });
  return { meta, body: markdown.slice(end + END.length) };
}
