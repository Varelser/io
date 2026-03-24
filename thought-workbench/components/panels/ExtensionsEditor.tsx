import React from "react";
import type { PropertyDef, ManagementMethod } from "../../types";
import { BUILTIN_METHODS } from "../../constants/builtin-methods";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { Section } from "../ui/Section";

/** PropertyDef → フォームコントロール */
function PropertyField({
  def,
  value,
  lang,
  onChange,
}: {
  def: PropertyDef;
  value: unknown;
  lang: "ja" | "en";
  onChange: (val: unknown) => void;
}) {
  const label = def.label[lang];

  switch (def.type) {
    case "string":
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <Input
            value={(value as string) || ""}
            placeholder={def.placeholder || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
      );

    case "number":
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-blue-400"
          />
          <span className="text-[9px] text-white/60">{label}</span>
        </label>
      );

    case "select":
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <Select
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            <option value="">-</option>
            {(def.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Select>
        </div>
      );

    case "tags": {
      const tags = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <Input
            value={tags.join(", ")}
            placeholder={def.placeholder || "tag1, tag2"}
            onChange={(e) => {
              const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              onChange(arr.length > 0 ? arr : undefined);
            }}
          />
          {tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {tags.map((tag, i) => (
                <span key={i} className="rounded-full border border-white/10 bg-white/5 px-1 py-0.5 text-[7px] text-white/50">{tag}</span>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "date":
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <FieldLabel>{label}</FieldLabel>
          <TextArea
            rows={2}
            value={(value as string) || ""}
            placeholder={def.placeholder || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
      );

    case "range":
      return (
        <div>
          <FieldLabel>{label} ({formatRangeValue(value, def)})</FieldLabel>
          <Input
            type="range"
            min={def.min ?? 0}
            max={def.max ?? 10}
            step={def.step ?? 1}
            value={(value as number) ?? def.min ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );

    default:
      return null;
  }
}

function formatRangeValue(value: unknown, def: PropertyDef): string {
  if (value == null) return String(def.min ?? 0);
  if (typeof value === "number") {
    return def.step != null && def.step < 1 ? value.toFixed(2) : String(value);
  }
  return String(value);
}

/**
 * アクティブな ManagementMethod の PropertyDef[] を動的レンダリングし、
 * node.extensions[methodId][propertyKey] を読み書きする汎用エディタ。
 */
export function ExtensionsEditor({
  activeMethods,
  extensions,
  lang,
  onUpdateExtensions,
  allMethods,
}: {
  activeMethods: string[];
  extensions: Record<string, Record<string, unknown>>;
  lang?: "ja" | "en";
  onUpdateExtensions: (next: Record<string, Record<string, unknown>>) => void;
  allMethods?: ManagementMethod[];
}) {
  const l = lang || "ja";

  if (activeMethods.length === 0) return null;

  // standard-core はNodePanel自体がLabel/Tags/Note/Folderを管理しているのでスキップ
  const methodsToRender = activeMethods
    .filter((id) => id !== "standard-core")
    .map((id) => (allMethods ?? BUILTIN_METHODS).find((m) => m.id === id))
    .filter((m): m is ManagementMethod => m != null);

  if (methodsToRender.length === 0) return null;

  const handleChange = (methodId: string, key: string, val: unknown) => {
    const prev = extensions[methodId] || {};
    const next = { ...prev };
    if (val === undefined || val === null || val === "") {
      delete next[key];
    } else {
      next[key] = val;
    }
    const updated = { ...extensions };
    if (Object.keys(next).length === 0) {
      delete updated[methodId];
    } else {
      updated[methodId] = next;
    }
    onUpdateExtensions(updated);
  };

  return (
    <>
      {methodsToRender.map((method) => (
        <Section key={method.id} title={method.name[l]} className="mt-1.5">
          <div className="text-[7px] text-white/20 mb-1">{method.description[l]}</div>
          <div className="space-y-1.5">
            {method.properties.map((prop) => (
              <PropertyField
                key={prop.key}
                def={prop}
                value={(extensions[method.id] || {})[prop.key]}
                lang={l}
                onChange={(val) => handleChange(method.id, prop.key, val)}
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
