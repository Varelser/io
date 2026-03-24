import React, { useState, useMemo } from "react";
import type { JournalEntry, TopicItem } from "../../types";

type FlatNode = { id: string; label: string; topicTitle: string; topicId: string };

const VAR = {
  bg: "var(--tw-bg)",
  bgPanel: "var(--tw-bg-panel)",
  bgCard: "var(--tw-bg-card)",
  bgInput: "var(--tw-bg-input)",
  border: "var(--tw-border)",
  text: "var(--tw-text)",
  textDim: "var(--tw-text-dim)",
  textMuted: "var(--tw-text-muted)",
  accent: "var(--tw-accent)",
  danger: "var(--tw-danger)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: VAR.bgInput,
  border: `1px solid ${VAR.border}`,
  borderRadius: 6,
  color: VAR.text,
  fontSize: 11,
  padding: "5px 8px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  color: VAR.textMuted,
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function MultilineInput({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
    />
  );
}

export function JournalView({
  journals,
  selectedDate,
  onChangeDate,
  todayEntry,
  onUpdateEntry,
  onDeleteEntry,
  topics,
  onSelectTopic,
}: {
  journals: JournalEntry[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  todayEntry: JournalEntry | null;
  onUpdateEntry: (patch: Partial<JournalEntry>) => void;
  onDeleteEntry: (date: string) => void;
  topics?: TopicItem[];
  onSelectTopic?: (topicId: string, nodeId: string | null) => void;
}) {
  const recentEntries = journals.slice(0, 50);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [propsOpen, setPropsOpen] = useState(false);

  const allNodes: FlatNode[] = useMemo(() => {
    if (!topics) return [];
    const flat: FlatNode[] = [];
    topics.forEach((t) => t.nodes.forEach((n) => flat.push({ id: n.id, label: n.label, topicTitle: t.title, topicId: t.id })));
    return flat;
  }, [topics]);

  const searchResults = useMemo(() => {
    if (!nodeSearchQuery.trim()) return [];
    const q = nodeSearchQuery.toLowerCase();
    return allNodes.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 12);
  }, [nodeSearchQuery, allNodes]);

  const linkedNodeIds = todayEntry?.linkedNodeIds || [];
  const linkedNodes = allNodes.filter((n) => linkedNodeIds.includes(n.id));
  const linkedTopicIds = todayEntry?.linkedTopicIds || [];

  const addLinkedNode = (nodeId: string) => {
    if (linkedNodeIds.includes(nodeId)) return;
    onUpdateEntry({ linkedNodeIds: [...linkedNodeIds, nodeId] });
    setNodeSearchQuery("");
  };

  const removeLinkedNode = (nodeId: string) => {
    onUpdateEntry({ linkedNodeIds: linkedNodeIds.filter((id) => id !== nodeId) });
  };

  const toggleLinkedTopic = (topicId: string) => {
    const next = linkedTopicIds.includes(topicId)
      ? linkedTopicIds.filter((id) => id !== topicId)
      : [...linkedTopicIds, topicId];
    onUpdateEntry({ linkedTopicIds: next });
  };

  const u = (patch: Partial<JournalEntry>) => onUpdateEntry(patch);
  const val = (field: keyof JournalEntry) => (todayEntry?.[field] as string) || "";

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onChangeDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onChangeDate(d.toISOString().split("T")[0]);
  };
  const today = () => onChangeDate(new Date().toISOString().split("T")[0]);

  const navBtnStyle: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 5,
    border: `1px solid ${VAR.border}`,
    background: VAR.bgCard,
    color: VAR.textDim,
    fontSize: 11,
    cursor: "pointer",
  };

  const wordCount = (todayEntry?.body || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      style={{ position: "absolute", inset: 0, overflowY: "auto", background: VAR.bg, padding: 20 }}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: VAR.textMuted, marginBottom: 12 }}>
          Journal
        </div>

        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button style={navBtnStyle} onClick={prevDay}>←</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onChangeDate(e.target.value)}
            style={{ ...inputStyle, width: "auto", padding: "4px 8px" }}
          />
          <button style={navBtnStyle} onClick={nextDay}>→</button>
          <button style={{ ...navBtnStyle, color: VAR.accent, borderColor: VAR.accent }} onClick={today}>Today</button>
          {todayEntry && (
            <span style={{ marginLeft: "auto", fontSize: 9, color: VAR.textMuted }}>
              {wordCount} words
            </span>
          )}
        </div>

        {/* Entry card */}
        <div style={{
          borderRadius: 10,
          border: `1px solid ${VAR.border}`,
          background: VAR.bgCard,
          padding: 18,
          marginBottom: 20,
        }}>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={val("title")}
              onChange={(e) => u({ title: e.target.value || undefined })}
              placeholder={`${selectedDate} — 今日のタイトル...`}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${VAR.border}`,
                color: VAR.text,
                fontSize: 16,
                fontWeight: 600,
                padding: "4px 0 8px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Body — big textarea */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>本文</label>
            <textarea
              value={val("body")}
              onChange={(e) => u({ body: e.target.value })}
              placeholder="今日の記録、思考、気づきを書く..."
              rows={22}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.75,
                fontSize: 13,
                padding: "10px 12px",
                minHeight: 360,
              }}
            />
          </div>

          {/* Summary */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>サマリー / 振り返り</label>
            <textarea
              value={val("summary")}
              onChange={(e) => u({ summary: e.target.value || undefined })}
              placeholder="今日の要点・学び・振り返り..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Properties accordion */}
          <div style={{ marginBottom: 14, borderTop: `1px solid ${VAR.border}`, paddingTop: 10 }}>
            <button
              onClick={() => setPropsOpen((v) => !v)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: VAR.textDim,
                fontSize: 9,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: 0,
                marginBottom: propsOpen ? 10 : 0,
              }}
            >
              <span style={{ color: VAR.accent }}>{propsOpen ? "▾" : "▸"}</span>
              プロパティ
              {!propsOpen && [
                todayEntry?.mood,
                todayEntry?.energy,
                todayEntry?.weather,
                todayEntry?.location,
                todayEntry?.focus,
              ].filter(Boolean).length > 0 && (
                <span style={{ fontSize: 8, color: VAR.textMuted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  {[todayEntry?.mood, todayEntry?.energy, todayEntry?.weather].filter(Boolean).join(" · ")}
                </span>
              )}
            </button>

            {propsOpen && (
              <div style={{ display: "grid", gap: 10 }}>
                {/* Mood + Energy */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="気分 (Mood)">
                    <TextInput value={val("mood")} onChange={(v) => u({ mood: v || undefined })} placeholder="😊 happy / tired / 3/10..." />
                  </Field>
                  <Field label="エネルギー (Energy)">
                    <TextInput value={val("energy")} onChange={(v) => u({ energy: v || undefined })} placeholder="high / medium / low / 7/10..." />
                  </Field>
                </div>

                {/* Weather + Location */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="天候 / 環境 (Weather)">
                    <TextInput value={val("weather")} onChange={(v) => u({ weather: v || undefined })} placeholder="晴れ / 雨 / 在宅..." />
                  </Field>
                  <Field label="場所 (Location)">
                    <TextInput value={val("location")} onChange={(v) => u({ location: v || undefined })} placeholder="自宅 / オフィス..." />
                  </Field>
                </div>

                {/* Focus */}
                <Field label="フォーカス / 主題 (Focus)">
                  <TextInput value={val("focus")} onChange={(v) => u({ focus: v || undefined })} placeholder="今日の主テーマ..." />
                </Field>

                {/* Gratitude */}
                <Field label="感謝 (Gratitude)">
                  <MultilineInput value={val("gratitude")} onChange={(v) => u({ gratitude: v || undefined })} placeholder="今日感謝していること..." rows={3} />
                </Field>

                {/* Intentions */}
                <Field label="意図 / 次のアクション (Intentions)">
                  <MultilineInput value={val("intentions")} onChange={(v) => u({ intentions: v || undefined })} placeholder="明日・次にやること..." rows={3} />
                </Field>

                {/* Tags */}
                <Field label="タグ (Tags)">
                  <TextInput
                    value={(todayEntry?.tags || []).join(", ")}
                    onChange={(v) => u({ tags: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="tag1, tag2, tag3..."
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Linked Nodes */}
          {topics && (
            <div style={{ marginBottom: 14, borderTop: `1px solid ${VAR.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: VAR.textMuted, marginBottom: 8 }}>
                リンクノード ({linkedNodes.length})
              </div>
              <div style={{ position: "relative", marginBottom: 6 }}>
                <input
                  type="text"
                  value={nodeSearchQuery}
                  onChange={(e) => setNodeSearchQuery(e.target.value)}
                  placeholder="ノードを検索してリンク..."
                  style={inputStyle}
                />
                {searchResults.length > 0 && (
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    zIndex: 10,
                    marginTop: 2,
                    borderRadius: 6,
                    border: `1px solid ${VAR.border}`,
                    background: "var(--tw-bg-panel)",
                    maxHeight: 180,
                    overflowY: "auto",
                  }}>
                    {searchResults.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => addLinkedNode(n.id)}
                        style={{
                          width: "100%",
                          padding: "5px 10px",
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          color: VAR.textDim,
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                      >
                        {n.label}
                        <span style={{ marginLeft: 6, fontSize: 8, color: VAR.textMuted }}>({n.topicTitle})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {linkedNodes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {linkedNodes.map((n) => (
                    <div key={n.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 12,
                      border: `1px solid ${VAR.border}`,
                      background: VAR.bgCard,
                      padding: "2px 8px",
                      fontSize: 9,
                    }}>
                      <button
                        onClick={() => onSelectTopic?.(n.topicId, n.id)}
                        style={{ background: "none", border: "none", color: VAR.accent, cursor: "pointer", fontSize: 9, padding: 0 }}
                      >
                        {n.label}
                      </button>
                      <span style={{ fontSize: 8, color: VAR.textMuted }}>({n.topicTitle})</span>
                      <button
                        onClick={() => removeLinkedNode(n.id)}
                        style={{ background: "none", border: "none", color: VAR.danger, cursor: "pointer", fontSize: 10, padding: 0, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Topics */}
          {topics && topics.length > 0 && (
            <div style={{ marginBottom: 14, borderTop: `1px solid ${VAR.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: VAR.textMuted, marginBottom: 8 }}>
                リンク球体 ({linkedTopicIds.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {topics.map((t) => {
                  const linked = linkedTopicIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleLinkedTopic(t.id)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 12,
                        border: `1px solid ${linked ? VAR.accent : VAR.border}`,
                        background: linked ? `color-mix(in srgb, ${VAR.accent} 12%, transparent)` : VAR.bgCard,
                        color: linked ? VAR.accent : VAR.textMuted,
                        fontSize: 9,
                        cursor: "pointer",
                      }}
                    >
                      {t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: `1px solid ${VAR.border}` }}>
            {todayEntry ? (
              <span style={{ fontSize: 8, color: VAR.textMuted }}>
                作成: {new Date(todayEntry.createdAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                　更新: {new Date(todayEntry.updatedAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : (
              <span style={{ fontSize: 8, color: VAR.textMuted }}>まだ記録なし — 書き始めると自動保存されます</span>
            )}
            {todayEntry && (
              <button
                onClick={() => onDeleteEntry(selectedDate)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  border: `1px solid ${VAR.danger}`,
                  background: "transparent",
                  color: VAR.danger,
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                削除
              </button>
            )}
          </div>
        </div>

        {/* Recent entries */}
        {recentEntries.length > 0 && (
          <div>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: VAR.textMuted, marginBottom: 8 }}>
              過去のエントリ ({recentEntries.length})
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {recentEntries.map((entry) => {
                const isSelected = entry.date === selectedDate;
                return (
                  <button
                    key={entry.id}
                    onClick={() => onChangeDate(entry.date)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 7,
                      border: `1px solid ${isSelected ? VAR.accent : VAR.border}`,
                      background: isSelected ? `color-mix(in srgb, ${VAR.accent} 8%, transparent)` : VAR.bgCard,
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: isSelected ? VAR.accent : VAR.text, fontWeight: isSelected ? 600 : 400 }}>
                        {entry.date}
                      </span>
                      {entry.title && (
                        <span style={{ fontSize: 10, color: VAR.textDim, fontWeight: 500 }}>{entry.title}</span>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                        {entry.mood && <span style={{ fontSize: 9, color: VAR.textMuted }}>{entry.mood}</span>}
                        {entry.energy && <span style={{ fontSize: 8, color: VAR.textMuted }}>⚡{entry.energy}</span>}
                        {entry.linkedNodeIds && entry.linkedNodeIds.length > 0 && (
                          <span style={{ fontSize: 8, color: VAR.textMuted }}>{entry.linkedNodeIds.length} nodes</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: VAR.textMuted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {entry.body.substring(0, 120) || "(空)"}
                    </div>
                    {(entry.focus || (entry.tags && entry.tags.length > 0)) && (
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        {entry.focus && (
                          <span style={{ fontSize: 8, color: VAR.textMuted }}>◎ {entry.focus}</span>
                        )}
                        {entry.tags && entry.tags.slice(0, 5).map((tag, i) => (
                          <span key={i} style={{
                            fontSize: 7,
                            color: VAR.textMuted,
                            border: `1px solid ${VAR.border}`,
                            borderRadius: 8,
                            padding: "0 5px",
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
