import React, { useState } from "react";
import type { JournalEntry, TopicItem } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";

const ENERGY_PRESETS = ["high", "medium", "low"] as const;
const MOOD_PRESETS = ["😊", "😐", "😴", "🔥", "💤", "😤"] as const;

export function JournalPanel({
  journals,
  selectedDate,
  todayEntry,
  topics,
  lang,
  onSelectDate,
  onAddOrUpdate,
  onDelete,
}: {
  journals: JournalEntry[];
  selectedDate: string;
  todayEntry: JournalEntry | null;
  topics: { id: string; title: string }[];
  lang: "ja" | "en";
  onSelectDate: (date: string) => void;
  onAddOrUpdate: (patch: Partial<JournalEntry>) => void;
  onDelete: (date: string) => void;
}) {
  const [extraOpen, setExtraOpen] = useState(false);
  const ja = lang === "ja";

  const u = (patch: Partial<JournalEntry>) => onAddOrUpdate(patch);
  const v = (field: keyof JournalEntry) => (todayEntry?.[field] as string) || "";

  return (
    <div className="space-y-2">
      {/* Date */}
      <div>
        <FieldLabel>{ja ? "日付" : "Date"}</FieldLabel>
        <Input type="date" value={selectedDate} onChange={(e) => onSelectDate(e.target.value)} />
      </div>

      {/* Title */}
      <div>
        <FieldLabel>{ja ? "タイトル" : "Title"}</FieldLabel>
        <Input
          value={v("title")}
          placeholder={ja ? "今日のタイトル..." : "Today's title..."}
          onChange={(e) => u({ title: e.target.value || undefined })}
        />
      </div>

      {/* Body */}
      <div>
        <FieldLabel>{ja ? "本文" : "Body"}</FieldLabel>
        <textarea
          className="w-full rounded border px-1.5 py-1 text-[8px]"
          style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)", color: "var(--tw-text)", resize: "vertical", lineHeight: 1.6 }}
          rows={6}
          value={v("body")}
          placeholder={ja ? "今日の記録..." : "Today's entry..."}
          onChange={(e) => u({ body: e.target.value })}
        />
      </div>

      {/* Mood + Energy row */}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <FieldLabel>{ja ? "気分" : "Mood"}</FieldLabel>
          <Input
            value={v("mood")}
            placeholder="😊 / 3/10..."
            onChange={(e) => u({ mood: e.target.value || undefined })}
          />
          <div className="flex gap-0.5 mt-0.5">
            {MOOD_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => u({ mood: m })}
                className="text-[9px] rounded px-0.5"
                style={{ background: v("mood") === m ? "var(--tw-accent)22" : "transparent", color: "var(--tw-text-muted)" }}
              >{m}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>{ja ? "エネルギー" : "Energy"}</FieldLabel>
          <Input
            value={v("energy")}
            placeholder="high / 7/10..."
            onChange={(e) => u({ energy: e.target.value || undefined })}
          />
          <div className="flex gap-0.5 mt-0.5">
            {ENERGY_PRESETS.map((e) => (
              <button
                key={e}
                onClick={() => u({ energy: e })}
                className="text-[7px] rounded px-1"
                style={{
                  background: v("energy") === e ? "var(--tw-accent)22" : "var(--tw-bg-card)",
                  color: v("energy") === e ? "var(--tw-accent)" : "var(--tw-text-muted)",
                  border: "1px solid var(--tw-border)",
                }}
              >{e}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Extra properties toggle */}
      <button
        onClick={() => setExtraOpen((v) => !v)}
        className="w-full text-left text-[7px] rounded border px-1.5 py-0.5"
        style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)", background: "transparent" }}
      >
        {extraOpen ? "▾" : "▸"} {ja ? "詳細プロパティ" : "More properties"}
      </button>

      {extraOpen && (
        <div className="space-y-1.5 pl-1 border-l" style={{ borderColor: "var(--tw-border)" }}>
          <div>
            <FieldLabel>{ja ? "天候 / 環境" : "Weather"}</FieldLabel>
            <Input value={v("weather")} placeholder={ja ? "晴れ / 雨..." : "sunny / rainy..."} onChange={(e) => u({ weather: e.target.value || undefined })} />
          </div>
          <div>
            <FieldLabel>{ja ? "場所" : "Location"}</FieldLabel>
            <Input value={v("location")} placeholder={ja ? "自宅..." : "home..."} onChange={(e) => u({ location: e.target.value || undefined })} />
          </div>
          <div>
            <FieldLabel>{ja ? "フォーカス" : "Focus"}</FieldLabel>
            <Input value={v("focus")} placeholder={ja ? "今日の主題..." : "main theme..."} onChange={(e) => u({ focus: e.target.value || undefined })} />
          </div>
          <div>
            <FieldLabel>{ja ? "感謝" : "Gratitude"}</FieldLabel>
            <textarea
              className="w-full rounded border px-1.5 py-0.5 text-[8px]"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)", color: "var(--tw-text)", resize: "vertical" }}
              rows={2}
              value={v("gratitude")}
              placeholder={ja ? "感謝していること..." : "grateful for..."}
              onChange={(e) => u({ gratitude: e.target.value || undefined })}
            />
          </div>
          <div>
            <FieldLabel>{ja ? "意図 / 次のアクション" : "Intentions"}</FieldLabel>
            <textarea
              className="w-full rounded border px-1.5 py-0.5 text-[8px]"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)", color: "var(--tw-text)", resize: "vertical" }}
              rows={2}
              value={v("intentions")}
              placeholder={ja ? "明日・次にやること..." : "next actions..."}
              onChange={(e) => u({ intentions: e.target.value || undefined })}
            />
          </div>
          <div>
            <FieldLabel>{ja ? "サマリー" : "Summary"}</FieldLabel>
            <textarea
              className="w-full rounded border px-1.5 py-0.5 text-[8px]"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-input)", color: "var(--tw-text)", resize: "vertical" }}
              rows={2}
              value={v("summary")}
              placeholder={ja ? "今日の振り返り..." : "reflection..."}
              onChange={(e) => u({ summary: e.target.value || undefined })}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <FieldLabel>{ja ? "タグ" : "Tags"}</FieldLabel>
        <Input
          value={(todayEntry?.tags || []).join(", ")}
          placeholder="tag1, tag2"
          onChange={(e) => u({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>

      {/* Linked Topics */}
      {topics.length > 0 && (
        <div>
          <FieldLabel>{ja ? "リンク球体" : "Linked Topics"}</FieldLabel>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {topics.map((t) => {
              const linked = (todayEntry?.linkedTopicIds || []).includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    const current = todayEntry?.linkedTopicIds || [];
                    u({ linkedTopicIds: linked ? current.filter((id) => id !== t.id) : [...current, t.id] });
                  }}
                  className="text-[7px] rounded-full px-1.5 py-0.5"
                  style={{
                    border: `1px solid ${linked ? "var(--tw-accent)" : "var(--tw-border)"}`,
                    background: linked ? "var(--tw-accent)18" : "transparent",
                    color: linked ? "var(--tw-accent)" : "var(--tw-text-muted)",
                  }}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete */}
      {todayEntry && (
        <Button danger onClick={() => onDelete(selectedDate)} className="w-full">
          {ja ? "削除" : "Delete"}
        </Button>
      )}

      {/* Past entries list */}
      {journals.length > 0 && (
        <div>
          <div className="text-[7px] mb-1" style={{ color: "var(--tw-text-muted)" }}>
            {ja ? "過去のエントリ" : "Past entries"}
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {journals.map((j) => (
              <button
                key={j.id}
                onClick={() => onSelectDate(j.date)}
                className="w-full rounded px-1.5 py-0.5 text-left text-[8px] hover:bg-white/5"
                style={{ color: j.date === selectedDate ? "var(--tw-text)" : "var(--tw-text-muted)" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-[7px]">{j.date}</span>
                  {j.mood && <span className="text-[8px]">{j.mood}</span>}
                  {j.energy && <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>⚡{j.energy}</span>}
                  {j.title && <span className="flex-1 truncate text-[7px]" style={{ color: "var(--tw-text-dim)" }}>{j.title}</span>}
                </div>
                {!j.title && (
                  <div className="truncate opacity-50 text-[7px]">{j.body?.slice(0, 35)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
