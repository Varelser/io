import React, { useState } from "react";
import type { ManagementMethod } from "../../types";
import { METHOD_CATEGORIES } from "../../types";
import { BUILTIN_METHODS } from "../../constants/builtin-methods";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { newId } from "../../utils/id";

const CATEGORY_LABELS: Record<string, { ja: string; en: string }> = {
  standard: { ja: "標準", en: "Standard" },
  library: { ja: "図書館", en: "Library" },
  pkm: { ja: "PKM", en: "PKM" },
  task: { ja: "タスク", en: "Task" },
  research: { ja: "研究", en: "Research" },
  assessment: { ja: "評価", en: "Assessment" },
  custom: { ja: "カスタム", en: "Custom" },
};

function MethodRow({
  method,
  isActive,
  onToggle,
  onDelete,
  lang,
}: {
  method: ManagementMethod;
  isActive: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  lang: "ja" | "en";
}) {
  return (
    <label className="flex items-start gap-1.5 cursor-pointer rounded-md px-1 py-0.5 hover:bg-white/[0.04] transition-colors">
      <input
        type="checkbox"
        checked={isActive}
        onChange={onToggle}
        className="mt-0.5 accent-blue-400"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-white/70">{method.name[lang]}</div>
        <div className="text-[7px] text-white/30 truncate">{method.description[lang]}</div>
      </div>
      {onDelete && !method.builtin && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="shrink-0 text-[8px] px-1 rounded"
          style={{ color: "#ef4444", background: "#ef444418", border: "1px solid #ef444433" }}
          title={lang === "ja" ? "削除" : "Delete"}
        >
          ✕
        </button>
      )}
    </label>
  );
}

export function MethodSelectorPanel({
  lang,
  activeMethods,
  userMethods = [],
  onToggleMethod,
  onAddUserMethod,
  onDeleteUserMethod,
}: {
  lang?: "ja" | "en";
  activeMethods: string[];
  userMethods?: ManagementMethod[];
  onToggleMethod: (methodId: string) => void;
  onAddUserMethod?: (method: ManagementMethod) => void;
  onDeleteUserMethod?: (id: string) => void;
}) {
  const l = lang || "ja";
  const activeSet = new Set(activeMethods);
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<ManagementMethod["category"]>("custom");
  const [formColorBy, setFormColorBy] = useState("");

  const allMethods = [...BUILTIN_METHODS, ...userMethods];

  // Group by category
  const grouped = new Map<string, ManagementMethod[]>();
  allMethods.forEach((m) => {
    const list = grouped.get(m.category) || [];
    list.push(m);
    grouped.set(m.category, list);
  });

  const handleSubmit = () => {
    const name = formName.trim();
    if (!name) return;
    const method: ManagementMethod = {
      id: newId("um"),
      name: { ja: name, en: name },
      description: { ja: formDesc.trim() || name, en: formDesc.trim() || name },
      category: formCategory,
      properties: [],
      displayRules: formColorBy ? { colorBy: formColorBy.trim() } : undefined,
      builtin: false,
    };
    onAddUserMethod?.(method);
    setFormOpen(false);
    setFormName(""); setFormDesc(""); setFormCategory("custom"); setFormColorBy("");
  };

  return (
    <Section title={l === "ja" ? "管理法" : "Methods"} defaultOpen={false}>
      <div className="space-y-1.5">
        {Array.from(grouped.entries()).map(([category, methods]) => (
          <div key={category}>
            <div className="text-[7px] uppercase tracking-wider text-white/25 mb-0.5">
              {CATEGORY_LABELS[category]?.[l] || category}
            </div>
            {methods.map((method) => (
              <MethodRow
                key={method.id}
                method={method}
                isActive={activeSet.has(method.id)}
                onToggle={() => onToggleMethod(method.id)}
                onDelete={!method.builtin && onDeleteUserMethod ? () => onDeleteUserMethod(method.id) : undefined}
                lang={l}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-1.5 text-[7px] text-white/20">
        {l === "ja" ? `${activeMethods.length} 個アクティブ` : `${activeMethods.length} active`}
      </div>

      {/* ユーザー定義メソッド追加 */}
      {onAddUserMethod && (
        <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--tw-border, #333)" }}>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="w-full text-[8px] rounded border px-2 py-1"
            style={{ borderColor: "var(--tw-border, #333)", color: "var(--tw-text-muted, #888)", background: "transparent" }}
          >
            {formOpen
              ? (l === "ja" ? "閉じる" : "Close")
              : (l === "ja" ? "+ カスタムメソッド追加" : "+ Add custom method")}
          </button>

          {formOpen && (
            <div className="mt-1.5 space-y-1">
              <div>
                <FieldLabel>{l === "ja" ? "名前" : "Name"}</FieldLabel>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={l === "ja" ? "メソッド名" : "Method name"} />
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "説明" : "Description"}</FieldLabel>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder={l === "ja" ? "用途の説明" : "Purpose"} />
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "カテゴリ" : "Category"}</FieldLabel>
                <Select value={formCategory} onChange={(e) => setFormCategory(e.target.value as ManagementMethod["category"])}>
                  {METHOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]?.[l] || c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>{l === "ja" ? "colorBy フィールド (任意)" : "colorBy field (optional)"}</FieldLabel>
                <Input
                  value={formColorBy}
                  onChange={(e) => setFormColorBy(e.target.value)}
                  placeholder="workStatus / type / group ..."
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {l === "ja" ? "追加" : "Add"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
