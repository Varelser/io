import React, { useState } from "react";
import type { VocabTerm } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";
import { Section } from "../ui/Section";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function TermEditor({
  term,
  allTerms,
  lang,
  onUpdate,
  onDelete,
}: {
  term: VocabTerm;
  allTerms: VocabTerm[];
  lang: "ja" | "en";
  onUpdate: (patch: Partial<VocabTerm>) => void;
  onDelete: () => void;
}) {
  const broaderLabels = (term.broader || [])
    .map((id) => allTerms.find((t) => t.id === id)?.label || id)
    .join(", ");
  const relatedLabels = (term.related || [])
    .map((id) => allTerms.find((t) => t.id === id)?.label || id)
    .join(", ");
  const narrower = allTerms.filter((t) => t.broader?.includes(term.id));

  const resolveIds = (input: string): string[] => {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((labelOrId) => {
        const found = allTerms.find(
          (t) => t.label === labelOrId || t.id === labelOrId
        );
        return found?.id || labelOrId;
      });
  };

  return (
    <div
      className="rounded-md border p-2 space-y-1.5"
      style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-medium truncate" style={{ color: "var(--tw-text)" }}>
          {term.classNumber && (
            <span className="mr-1.5 text-[8px] opacity-60">{term.classNumber}</span>
          )}
          {term.label}
        </div>
        <Button danger onClick={onDelete} className="shrink-0">
          {lang === "ja" ? "削除" : "Del"}
        </Button>
      </div>

      <div className="grid gap-1">
        <div>
          <FieldLabel>{lang === "ja" ? "標目（優先ラベル）" : "Preferred Label"}</FieldLabel>
          <Input value={term.label} onChange={(e) => onUpdate({ label: e.target.value })} />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "異形語（カンマ区切り）" : "Alt Labels"}</FieldLabel>
          <Input
            value={(term.altLabels || []).join(", ")}
            onChange={(e) =>
              onUpdate({
                altLabels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder={lang === "ja" ? "同義語, 別名, ..." : "synonym, alias, ..."}
          />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "分類番号" : "Class Number"}</FieldLabel>
          <Input
            value={term.classNumber || ""}
            onChange={(e) => onUpdate({ classNumber: e.target.value || undefined })}
            placeholder="e.g. 010, 3.1.2"
          />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "上位語（ラベルまたはID）" : "Broader Terms"}</FieldLabel>
          <Input
            value={broaderLabels}
            onChange={(e) => onUpdate({ broader: resolveIds(e.target.value) })}
            placeholder={lang === "ja" ? "上位概念の標目..." : "broader concept label..."}
          />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "関連語（ラベルまたはID）" : "Related Terms"}</FieldLabel>
          <Input
            value={relatedLabels}
            onChange={(e) => onUpdate({ related: resolveIds(e.target.value) })}
            placeholder={lang === "ja" ? "関連概念の標目..." : "related concept label..."}
          />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "使用範囲注記" : "Scope Note"}</FieldLabel>
          <Input
            value={term.scopeNote || ""}
            onChange={(e) => onUpdate({ scopeNote: e.target.value || undefined })}
            placeholder={lang === "ja" ? "このタームの適用範囲..." : "scope of this term..."}
          />
        </div>
        {narrower.length > 0 && (
          <div>
            <FieldLabel>{lang === "ja" ? "下位語（自動）" : "Narrower (auto)"}</FieldLabel>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {narrower.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border px-1.5 py-0.5 text-[7px]"
                  style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-dim)" }}
                >
                  {t.classNumber ? `${t.classNumber} ` : ""}{t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VocabularyPanel({
  vocabulary,
  lang,
  onUpdate,
}: {
  vocabulary: VocabTerm[];
  lang: "ja" | "en";
  onUpdate: (vocab: VocabTerm[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = vocabulary.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.label.toLowerCase().includes(q) ||
      (t.altLabels || []).some((a) => a.toLowerCase().includes(q)) ||
      (t.classNumber || "").toLowerCase().includes(q) ||
      (t.scopeNote || "").toLowerCase().includes(q)
    );
  });

  const addTerm = () => {
    const id = newId();
    const newTerm: VocabTerm = { id, label: lang === "ja" ? "新しい標目" : "New Term" };
    onUpdate([...vocabulary, newTerm]);
    setExpandedId(id);
  };

  const updateTerm = (id: string, patch: Partial<VocabTerm>) => {
    onUpdate(vocabulary.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTerm = (id: string) => {
    onUpdate(
      vocabulary
        .filter((t) => t.id !== id)
        .map((t) => ({
          ...t,
          broader: (t.broader || []).filter((bid) => bid !== id),
          related: (t.related || []).filter((rid) => rid !== id),
        }))
    );
    if (expandedId === id) setExpandedId(null);
  };

  // Build tree for display: top-level terms first
  const topLevel = filtered.filter((t) => !t.broader?.length || !t.broader.some((bid) => vocabulary.find((v) => v.id === bid)));

  const renderTree = (terms: VocabTerm[], depth = 0): React.ReactNode => {
    return terms.map((term) => {
      const isExpanded = expandedId === term.id;
      const children = vocabulary.filter((t) => t.broader?.includes(term.id));
      return (
        <div key={term.id} style={{ marginLeft: depth * 12 }}>
          <div
            className="flex items-center gap-1.5 rounded px-1.5 py-1 cursor-pointer hover:brightness-125"
            style={{ background: isExpanded ? "var(--tw-bg-card)" : "transparent" }}
            onClick={() => setExpandedId(isExpanded ? null : term.id)}
          >
            <span className="text-[7px] w-3 shrink-0 text-center" style={{ color: "var(--tw-text-muted)" }}>
              {children.length > 0 ? (isExpanded ? "▼" : "▶") : "·"}
            </span>
            {term.classNumber && (
              <span className="text-[8px] shrink-0" style={{ color: "var(--tw-text-muted)" }}>
                {term.classNumber}
              </span>
            )}
            <span className="text-[9px] truncate" style={{ color: "var(--tw-text)" }}>
              {term.label}
            </span>
            {(term.altLabels || []).length > 0 && (
              <span className="text-[7px] truncate" style={{ color: "var(--tw-text-muted)" }}>
                ({term.altLabels!.join(", ")})
              </span>
            )}
          </div>
          {isExpanded && (
            <div className="ml-3 my-1">
              <TermEditor
                term={term}
                allTerms={vocabulary}
                lang={lang}
                onUpdate={(patch) => updateTerm(term.id, patch)}
                onDelete={() => deleteTerm(term.id)}
              />
            </div>
          )}
          {children.length > 0 && renderTree(children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ja" ? "標目を検索..." : "Search terms..."}
          className="flex-1"
        />
        <Button onClick={addTerm} className="shrink-0">
          {lang === "ja" ? "+ 標目" : "+ Term"}
        </Button>
      </div>

      {vocabulary.length === 0 ? (
        <div className="text-[9px] text-center py-4" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja"
            ? "統制語彙がありません。「+ 標目」で追加できます。"
            : "No vocabulary terms. Add one with '+ Term'."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[9px] text-center py-2" style={{ color: "var(--tw-text-muted)" }}>
          {lang === "ja" ? "一致なし" : "No matches"}
        </div>
      ) : (
        <Section title={lang === "ja" ? `標目一覧 (${filtered.length})` : `Terms (${filtered.length})`} defaultOpen>
          <div className="space-y-0.5">{renderTree(topLevel)}</div>
          {/* Orphaned terms (broader set but parent not in filtered) */}
          {filtered
            .filter((t) => !topLevel.includes(t))
            .map((term) => (
              <div key={term.id}>
                <div
                  className="flex items-center gap-1.5 rounded px-1.5 py-1 cursor-pointer hover:brightness-125"
                  style={{ background: expandedId === term.id ? "var(--tw-bg-card)" : "transparent" }}
                  onClick={() => setExpandedId(expandedId === term.id ? null : term.id)}
                >
                  <span className="text-[7px] w-3 shrink-0 text-center" style={{ color: "var(--tw-text-muted)" }}>·</span>
                  <span className="text-[9px] truncate" style={{ color: "var(--tw-text)" }}>{term.label}</span>
                </div>
                {expandedId === term.id && (
                  <div className="ml-3 my-1">
                    <TermEditor
                      term={term}
                      allTerms={vocabulary}
                      lang={lang}
                      onUpdate={(patch) => updateTerm(term.id, patch)}
                      onDelete={() => deleteTerm(term.id)}
                    />
                  </div>
                )}
              </div>
            ))}
        </Section>
      )}
    </div>
  );
}
