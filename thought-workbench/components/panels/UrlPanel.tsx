import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";

type UrlPanelProps = {
  urls: string[];
  onUpdateUrls: (urls: string[]) => void;
  lang?: "ja" | "en";
};

function isValidUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

function truncateUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + "...";
}

export function UrlPanel({ urls, onUpdateUrls, lang }: UrlPanelProps) {
  const l = lang || "ja";
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const addUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setError(l === "ja" ? "http:// または https:// で始まるURLを入力してください" : "URL must start with http:// or https://");
      return;
    }
    if (urls.includes(trimmed)) {
      setError(l === "ja" ? "このURLは既に追加されています" : "This URL is already added");
      return;
    }
    setError("");
    onUpdateUrls([...urls, trimmed]);
    setNewUrl("");
  };

  const removeUrl = (idx: number) => {
    onUpdateUrls(urls.filter((_, i) => i !== idx));
  };

  const copyUrl = (url: string, idx: number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    });
  };

  return (
    <div>
      <FieldLabel>{l === "ja" ? "リンクURL" : "Linked URLs"}</FieldLabel>

      {/* URL list */}
      {urls.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {urls.map((url, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 rounded border px-1.5 py-0.5"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg)" }}
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-[9px] truncate hover:underline"
                style={{ color: "var(--tw-accent)" }}
                title={url}
              >
                {truncateUrl(url)}
              </a>
              <button
                onClick={() => copyUrl(url, idx)}
                className="text-[8px] px-1 py-0 rounded transition-colors hover:opacity-80"
                style={{ color: "var(--tw-text-dim)" }}
                title={l === "ja" ? "コピー" : "Copy"}
              >
                {copiedIdx === idx ? "ok" : "cp"}
              </button>
              <button
                onClick={() => removeUrl(idx)}
                className="text-[8px] px-1 py-0 rounded transition-colors"
                style={{ color: "rgba(248,113,113,0.6)" }}
                title={l === "ja" ? "削除" : "Delete"}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add URL form */}
      <div className="flex items-center gap-1">
        <Input
          value={newUrl}
          placeholder="https://..."
          onChange={(e) => { setNewUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }}
        />
        <Button onClick={addUrl}>+</Button>
      </div>
      {error && (
        <div className="mt-0.5 text-[7px]" style={{ color: "rgba(248,113,113,0.7)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
