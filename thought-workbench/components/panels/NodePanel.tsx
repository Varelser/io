import React, { useMemo, useState } from "react";
import type { NodeItem, NodeTask, ConfidenceLogEntry, VocabTerm } from "../../types";
import { HYPOTHESIS_STAGES, KNOWLEDGE_PHASES, MEMBERSHIP_STATUSES, EVIDENCE_BASES, MATERIAL_STATUSES } from "../../types";
import { NODE_TYPES, TENSES } from "../../constants/node-types";
import { HYPOTHESIS_STAGE_LABELS, KNOWLEDGE_PHASE_LABELS, MEMBERSHIP_STATUS_LABELS } from "../../constants/theory-fields";
import type { UiText } from "../../constants/ui-text";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { Section } from "../ui/Section";
import { ExtensionsEditor } from "./ExtensionsEditor";
import { WikilinkText } from "../ui/WikilinkText";
import { UrlPanel } from "./UrlPanel";
import { getNamingTemplate } from "../../constants/naming-templates";
import { collectZettelkastenNodeContext } from "../../utils/zettelkasten-node";
import { applyNodeReasoningPreset, getReasoningPresetMeta } from "../../utils/thinking-frameworks";
import {
  getCanonicalIntakeStatus,
  getCanonicalVersionState,
  getCanonicalWorkStatus,
  getIntakeStatusLabel,
  getPublicationStateLabel,
  getReviewStateLabel,
  getUrlStateLabel,
  getVersionStateLabel,
  getWorkStatusLabel,
  normalizeIntakeStatus,
  normalizeVersionState,
  normalizeWorkStatus,
} from "../../utils/state-model";

const TASK_STATUSES: NodeTask["status"][] = ["todo", "doing", "done", "archived"];

export function NodePanel({ ui, node, lang, activeMethods, topics, vocabulary, currentNodeColor, allMethods, onDuplicateNode, onDeleteNode, onUpdateNode, onSnapToSphere, onNavigateNode }: { ui: UiText; node: NodeItem; lang?: "ja" | "en"; activeMethods?: string[]; topics?: import("../../types").TopicItem[]; vocabulary?: VocabTerm[]; currentNodeColor?: string; allMethods?: import("../../types").ManagementMethod[]; onDuplicateNode: () => void; onDeleteNode: () => void; onUpdateNode: (patch: Partial<NodeItem>) => void; onSnapToSphere: () => void; onNavigateNode?: (topicId: string, nodeId: string | null) => void }) {
  const l = lang || "ja";
  const hasTask = !!node.task;
  const tagsStr = (node.tags || []).join(", ");
  const [logReason, setLogReason] = useState("");
  const zettelkastenContext = useMemo(
    () => (topics ? collectZettelkastenNodeContext(topics, node.id) : null),
    [topics, node.id]
  );

  const addConfidenceLog = () => {
    const entry: ConfidenceLogEntry = {
      date: new Date().toISOString(),
      value: node.confidence ?? 0.5,
      reason: logReason || "update",
    };
    const prev = node.confidenceLog || [];
    onUpdateNode({ confidenceLog: [entry, ...prev] });
    setLogReason("");
  };
  const reasoningPresets = ["claim", "grounds", "warrant", "backing", "rebuttal", "qualifier", "question", "option"] as const;

  const appendZettelkastenTemplate = (body: string) => {
    if (node.note.includes(body.trim())) return;
    const next = node.note.trim().length > 0 ? `${node.note.trimEnd()}\n\n${body}` : body;
    onUpdateNode({ note: next });
  };

  const ConnectionList = ({
    title,
    items,
    showMeta = false,
  }: {
    title: string;
    items: NonNullable<typeof zettelkastenContext>["forwardLinks"];
    showMeta?: boolean;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--tw-text-muted)" }}>{title}</div>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={`${title}-${item.topicId}-${item.nodeId}-${item.kind}`}
              className="w-full rounded-md border px-2 py-1 text-left text-[8px]"
              style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-dim)" }}
              onClick={() => onNavigateNode?.(item.topicId, item.nodeId)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" style={{ color: "var(--tw-text)" }}>{item.label}</span>
                {item.topicTitle !== zettelkastenContext?.topicTitle ? (
                  <span className="text-[7px]" style={{ color: "var(--tw-text-muted)" }}>{item.topicTitle}</span>
                ) : null}
              </div>
              {showMeta && (item.relation || item.meaning) ? (
                <div className="mt-0.5 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                  {[item.relation, item.meaning].filter(Boolean).join(" / ")}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-1.5 rounded-lg border p-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="text-[9px]" style={{ color: "var(--tw-text)" }}>{ui.node}</div>
          {(node.color || currentNodeColor) && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/20"
              style={{ background: node.color || currentNodeColor }}
              title={node.color ? (l === "ja" ? "カスタムカラー設定済み" : "Custom color set") : (l === "ja" ? "管理法 colorBy による色" : "Color from method colorBy")}
            />
          )}
        </div>
        <div className="flex gap-1"><Button onClick={onDuplicateNode}>{l === "ja" ? "複製" : "Copy"}</Button><Button danger onClick={onDeleteNode}>{l === "ja" ? "削除" : "Delete"}</Button></div>
      </div>
      <div className="mt-1.5">
        <FieldLabel>{l === "ja" ? "ラベル" : "Label"}</FieldLabel>
        <Input
          value={node.label}
          onChange={(e) => onUpdateNode({ label: e.target.value })}
          maxLength={200}
          style={node.label.length === 0 ? { borderColor: "#ef4444" } : node.label.length >= 180 ? { borderColor: "#f59e0b" } : undefined}
        />
        <div className="mt-0.5 flex items-center justify-between text-[7px]" style={{ color: node.label.length >= 180 ? "#f59e0b" : "var(--tw-text-muted)" }}>
          {node.label.length === 0
            ? <span style={{ color: "#ef4444" }}>{l === "ja" ? "ラベルは必須です" : "Label is required"}</span>
            : <span />}
          <span>{node.label.length}/200</span>
        </div>
      </div>
      {(() => { const tpl = getNamingTemplate(node.type); return tpl ? (
        <div className="mt-0.5 rounded border border-white/5 bg-white/[0.02] px-1.5 py-1 text-[7px] text-white/35">
          <div>{tpl[l]}</div>
          <div className="mt-0.5 text-white/20">{tpl.examples.slice(0, 2).join(" / ")}</div>
        </div>
      ) : null; })()}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5"><div><FieldLabel>{l === "ja" ? "タイプ" : "Type"}</FieldLabel><Select value={node.type} onChange={(e) => onUpdateNode({ type: e.target.value })}>{NODE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div><div><FieldLabel>{l === "ja" ? "時制" : "Tense"}</FieldLabel><Select value={node.tense} onChange={(e) => onUpdateNode({ tense: e.target.value })}>{TENSES.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div></div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5"><div><FieldLabel>{ui.layer}</FieldLabel><Input value={node.layer} onChange={(e) => onUpdateNode({ layer: e.target.value })} /></div><div><FieldLabel>{ui.group}</FieldLabel><Input value={node.group} onChange={(e) => onUpdateNode({ group: e.target.value })} /></div></div>
      <div className="mt-1.5">
        <FieldLabel>{l === "ja" ? "カスタムカラー" : "Custom Color"}</FieldLabel>
        <div className="mt-0.5 flex items-center gap-2">
          <input
            type="color"
            value={node.color || "#888888"}
            onChange={(e) => onUpdateNode({ color: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0"
            title={l === "ja" ? "ノード固有カラー" : "Per-node color"}
          />
          {node.color && (
            <button
              onClick={() => onUpdateNode({ color: undefined })}
              className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70"
              title={l === "ja" ? "カラーをリセット（レイヤーカラーに戻す）" : "Reset to layer color"}
            >
              {l === "ja" ? "リセット" : "Reset"}
            </button>
          )}
          {currentNodeColor && (
            <div className="flex items-center gap-1 text-[7px] text-white/30">
              <div className="w-2 h-2 rounded-full" style={{ background: currentNodeColor }} />
              <span>{l === "ja" ? "管理法" : "method"}</span>
            </div>
          )}
          {!node.color && !currentNodeColor && (
            <span className="text-[7px] text-white/25">{l === "ja" ? "レイヤーカラーを継承" : "inherits layer color"}</span>
          )}
        </div>
      </div>
      {/* ── Work Status / Intake / Evidence / Version ── */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div>
          <FieldLabel>{l === "ja" ? "作業状態" : "WORK STATUS"}</FieldLabel>
          <Select
            value={getCanonicalWorkStatus(node.workStatus) || ""}
            onChange={(e) => onUpdateNode({ workStatus: normalizeWorkStatus(e.target.value) })}
          >
            <option value="">-</option>
            {["unprocessed", "active", "review", "onHold", "done", "published", "frozen"].map((s) => (
              <option key={s} value={s}>{getWorkStatusLabel(s, l)}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>{l === "ja" ? "流入状態" : "INTAKE"}</FieldLabel>
          <Select
            value={getCanonicalIntakeStatus(node.intakeStatus) || ""}
            onChange={(e) => onUpdateNode({ intakeStatus: normalizeIntakeStatus(e.target.value) })}
          >
            <option value="">-</option>
            {["inbox", "staging", "structured", "archive"].map((s) => (
              <option key={s} value={s}>{getIntakeStatusLabel(s, l)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div><FieldLabel>{l === "ja" ? "根拠種別" : "EVIDENCE"}</FieldLabel><Select value={node.evidenceBasis || ""} onChange={(e) => onUpdateNode({ evidenceBasis: (e.target.value || undefined) as NodeItem["evidenceBasis"] })}><option value="">-</option>{EVIDENCE_BASES.map((s) => <option key={s} value={s}>{{ experience: "体験", observation: "観察", literature: "文献", inference: "推論", secondary: "二次引用", unverified: "未検証" }[s]}</option>)}</Select></div>
        <div>
          <FieldLabel>{l === "ja" ? "版状態" : "VERSION"}</FieldLabel>
          <Select
            value={getCanonicalVersionState(node.versionState) || ""}
            onChange={(e) => onUpdateNode({ versionState: normalizeVersionState(e.target.value) })}
          >
            <option value="">-</option>
            {["working", "snapshotted", "versioned", "archived"].map((s) => (
              <option key={s} value={s}>{getVersionStateLabel(s, l)}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div><FieldLabel>{l === "ja" ? "資料状態" : "MATERIAL"}</FieldLabel><Select value={node.materialStatus || ""} onChange={(e) => onUpdateNode({ materialStatus: (e.target.value || undefined) as NodeItem["materialStatus"] })}><option value="">-</option>{MATERIAL_STATUSES.map((s) => <option key={s} value={s}>{{ unread: "未読", skimmed: "斜め読み", reading: "読書中", summarized: "要約済", cited: "引用済" }[s]}</option>)}</Select></div>
        <div><FieldLabel>{l === "ja" ? "レビュー状態" : "REVIEW"}</FieldLabel><Select value={node.reviewState || ""} onChange={(e) => onUpdateNode({ reviewState: (e.target.value || undefined) as NodeItem["reviewState"] })}><option value="">-</option>{["none", "queued", "inReview", "reviewed", "needsFollowUp"].map((s) => <option key={s} value={s}>{getReviewStateLabel(s, l)}</option>)}</Select></div>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div><FieldLabel>{l === "ja" ? "公開状態" : "PUBLICATION"}</FieldLabel><Select value={node.publicationState || ""} onChange={(e) => onUpdateNode({ publicationState: (e.target.value || undefined) as NodeItem["publicationState"] })}><option value="">-</option>{["private", "internal", "publishReady", "published", "deprecated"].map((s) => <option key={s} value={s}>{getPublicationStateLabel(s, l)}</option>)}</Select></div>
        <div><FieldLabel>{l === "ja" ? "URL状態" : "URL"}</FieldLabel><Select value={node.urlState || ""} onChange={(e) => onUpdateNode({ urlState: (e.target.value || undefined) as NodeItem["urlState"] })}><option value="">-</option>{["unverified", "verified", "broken", "duplicated", "archived"].map((s) => <option key={s} value={s}>{getUrlStateLabel(s, l)}</option>)}</Select></div>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5"><div><FieldLabel>{ui.x}</FieldLabel><Input type="number" step="0.1" value={node.position[0]} onChange={(e) => onUpdateNode({ position: [Number(e.target.value), node.position[1], node.position[2]] })} /></div><div><FieldLabel>{ui.y}</FieldLabel><Input type="number" step="0.1" value={node.position[1]} onChange={(e) => onUpdateNode({ position: [node.position[0], Number(e.target.value), node.position[2]] })} /></div><div><FieldLabel>{ui.z}</FieldLabel><Input type="number" step="0.1" value={node.position[2]} onChange={(e) => onUpdateNode({ position: [node.position[0], node.position[1], Number(e.target.value)] })} /></div></div>
      <div className="mt-1.5 grid grid-cols-[1fr_76px] gap-1.5"><div><FieldLabel>{l === "ja" ? "ノードサイズ" : "Node Size"}</FieldLabel><Input type="range" min="0.05" max="2.4" step="0.01" value={node.size} onChange={(e) => onUpdateNode({ size: Number(e.target.value) })} /></div><div><FieldLabel>{l === "ja" ? "値" : "Size"}</FieldLabel><Input type="number" min="0.05" max="2.4" step="0.01" value={node.size} onChange={(e) => onUpdateNode({ size: Number(e.target.value) })} /></div></div>
      <div className="mt-1.5 grid grid-cols-[1fr_76px] gap-1.5"><div><FieldLabel>{l === "ja" ? "フレームサイズ" : "Frame Size"}</FieldLabel><Input type="range" min="0.3" max="2.6" step="0.01" value={node.frameScale ?? 1} onChange={(e) => onUpdateNode({ frameScale: Number(e.target.value) })} /></div><div><FieldLabel>{l === "ja" ? "値" : "Frame"}</FieldLabel><Input type="number" min="0.3" max="2.6" step="0.01" value={node.frameScale ?? 1} onChange={(e) => onUpdateNode({ frameScale: Number(e.target.value) })} /></div></div>
      <div className="mt-1.5"><Button onClick={onSnapToSphere} className="w-full">{ui.snapSphere}</Button></div>
      <div className="mt-1.5"><FieldLabel>{l === "ja" ? "ノート" : "Note"}</FieldLabel><TextArea rows={3} value={node.note} onChange={(e) => onUpdateNode({ note: e.target.value })} placeholder={l === "ja" ? "[[ノード名]] でリンク" : "Use [[Node Name]] to link"} /></div>
      {/* Wikilink preview */}
      {node.note && node.note.includes("[[") && topics && (
        <div className="mt-0.5 text-[8px] leading-relaxed" style={{ color: "var(--tw-text-dim)" }}>
          <WikilinkText text={node.note} topics={topics} onNavigate={onNavigateNode} />
        </div>
      )}
      {zettelkastenContext && (
        <Section title={l === "ja" ? "Zettelkasten" : "Zettelkasten"} className="mt-1.5">
          <div className="rounded border px-2 py-1 text-[8px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-dim)" }}>
            <div style={{ color: "var(--tw-text)" }}>
              {zettelkastenContext.zettelkastenCompatible
                ? (l === "ja" ? "リンク前提のノートとして検出" : "Detected as a link-first note")
                : (l === "ja" ? "wikilink 由来の接続候補あり" : "Wikilink-driven connections detected")}
            </div>
            <div className="mt-0.5">
              {l === "ja"
                ? `${zettelkastenContext.forwardLinks.length} forward / ${zettelkastenContext.backlinks.length} backlink / ${zettelkastenContext.orphanCandidates.length} orphan`
                : `${zettelkastenContext.forwardLinks.length} forward / ${zettelkastenContext.backlinks.length} backlinks / ${zettelkastenContext.orphanCandidates.length} orphan`}
            </div>
          </div>
          <div className="mt-1.5 grid gap-1.5">
            <ConnectionList title={l === "ja" ? "Forward Links" : "Forward Links"} items={zettelkastenContext.forwardLinks} />
            <ConnectionList title={l === "ja" ? "Backlinks" : "Backlinks"} items={zettelkastenContext.backlinks} />
            <ConnectionList title={l === "ja" ? "Edge Links" : "Edge Links"} items={zettelkastenContext.edgeLinks} showMeta />
            <ConnectionList title={l === "ja" ? "Orphan 候補" : "Orphan Candidates"} items={zettelkastenContext.orphanCandidates} />
          </div>
          {zettelkastenContext.templates.length > 0 && (
            <div className="mt-1.5">
              <div className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "var(--tw-text-muted)" }}>
                {l === "ja" ? "接続理由テンプレート" : "Link Reason Templates"}
              </div>
              <div className="mt-1 space-y-1">
                {zettelkastenContext.templates.map((template) => (
                  <div key={template.id} className="rounded-md border px-2 py-1.5" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="truncate text-left text-[8px]"
                        style={{ color: "var(--tw-text)" }}
                        onClick={() => onNavigateNode?.(template.targetTopicId, template.targetNodeId)}
                      >
                        {template.label}
                      </button>
                      <Button onClick={() => appendZettelkastenTemplate(template.body)}>
                        {l === "ja" ? "ノートへ追加" : "Add"}
                      </Button>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                      {template.body}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}
      <Section title={l === "ja" ? "Reasoning Frames" : "Reasoning Frames"} className="mt-1.5">
        <div className="rounded border px-2 py-1 text-[8px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-dim)" }}>
          {l === "ja"
            ? "Toulmin と Issue Tree の役割を node に一発適用します。type / layer / group / tag を揃えます。"
            : "Apply Toulmin and Issue Tree roles in one step. This aligns type, layer, group, and tags."}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {reasoningPresets.map((preset) => {
            const meta = getReasoningPresetMeta(preset);
            return (
              <Button key={preset} onClick={() => onUpdateNode(applyNodeReasoningPreset(node, preset, l))} className="w-full">
                {meta.label[l]}
              </Button>
            );
          })}
        </div>
        <div className="mt-1.5 space-y-1 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          <div>{l === "ja" ? "Claim / Grounds / Warrant / Backing / Rebuttal / Qualifier" : "Claim / Grounds / Warrant / Backing / Rebuttal / Qualifier"}</div>
          <div>{l === "ja" ? "Question / Option は Issue Tree 用の下書きです。" : "Question / Option are quick presets for issue trees."}</div>
        </div>
      </Section>

      {/* ── Depth / Confidence ── */}
      <Section title="Depth / Confidence" className="mt-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div><FieldLabel>Depth (0-10)</FieldLabel><Input type="range" min="0" max="10" step="1" value={node.depth ?? 0} onChange={(e) => onUpdateNode({ depth: Number(e.target.value) })} /></div>
          <div><FieldLabel>{node.depth ?? 0}</FieldLabel><Input type="number" min="0" max="10" step="1" value={node.depth ?? 0} onChange={(e) => onUpdateNode({ depth: Number(e.target.value) })} /></div>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div><FieldLabel>Confidence</FieldLabel><Input type="range" min="0" max="1" step="0.05" value={node.confidence ?? 0.5} onChange={(e) => onUpdateNode({ confidence: Number(e.target.value) })} /></div>
          <div><FieldLabel>{(node.confidence ?? 0.5).toFixed(2)}</FieldLabel><Input type="number" min="0" max="1" step="0.05" value={node.confidence ?? 0.5} onChange={(e) => onUpdateNode({ confidence: Number(e.target.value) })} /></div>
        </div>
        {/* Confidence Log */}
        <div className="mt-1.5">
          <div className="flex items-center gap-1">
            <Input value={logReason} placeholder="reason for update..." onChange={(e) => setLogReason(e.target.value)} />
            <Button onClick={addConfidenceLog}>+ log</Button>
          </div>
          {node.confidenceLog && node.confidenceLog.length > 0 && (
            <div className="mt-1 space-y-0.5 max-h-[80px] overflow-auto">
              {node.confidenceLog.slice(0, 8).map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
                  <span style={{ color: "var(--tw-text-dim)" }}>{entry.value.toFixed(2)}</span>
                  <span className="truncate flex-1">{entry.reason}</span>
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Observer (二階のサイバネティクス) ── */}
      <Section title="Observer" className="mt-1.5">
        <div><FieldLabel>{l === "ja" ? "視点" : "Viewpoint"}</FieldLabel><Input value={node.observer?.viewpoint || ""} placeholder={l === "ja" ? "観測者の視点・立場" : "Observer viewpoint"} onChange={(e) => onUpdateNode({ observer: { ...node.observer, viewpoint: e.target.value || undefined } })} /></div>
        <div className="mt-1"><FieldLabel>{l === "ja" ? "役割" : "Role"}</FieldLabel><Input value={node.observer?.role || ""} placeholder={l === "ja" ? "観測時の役割" : "Role at time of observation"} onChange={(e) => onUpdateNode({ observer: { ...node.observer, role: e.target.value || undefined } })} /></div>
        <div className="mt-1"><FieldLabel>{l === "ja" ? "再評価" : "Re-evaluation"}</FieldLabel><TextArea rows={2} value={node.observer?.reEvaluation || ""} placeholder={l === "ja" ? "当時の解釈 vs 現在の解釈" : "Then vs now"} onChange={(e) => onUpdateNode({ observer: { ...node.observer, reEvaluation: e.target.value || undefined } })} /></div>
      </Section>

      {/* ── Hypothesis Stage (アブダクション) ── */}
      <Section title="Hypothesis" className="mt-1.5">
        <FieldLabel>{l === "ja" ? "仮説段階" : "Stage"}</FieldLabel>
        <Select value={node.hypothesisStage || ""} onChange={(e) => onUpdateNode({ hypothesisStage: (e.target.value || undefined) as NodeItem["hypothesisStage"] })}>
          <option value="">-</option>
          {HYPOTHESIS_STAGES.map((s) => <option key={s} value={s}>{HYPOTHESIS_STAGE_LABELS[s][l]}</option>)}
        </Select>
      </Section>

      {/* ── SECI Phase (知識創造) ── */}
      <Section title="SECI Phase" className="mt-1.5">
        <FieldLabel>{l === "ja" ? "知識フェーズ" : "Knowledge Phase"}</FieldLabel>
        <Select value={node.knowledgePhase || ""} onChange={(e) => onUpdateNode({ knowledgePhase: (e.target.value || undefined) as NodeItem["knowledgePhase"] })}>
          <option value="">-</option>
          {KNOWLEDGE_PHASES.map((p) => <option key={p} value={p}>{KNOWLEDGE_PHASE_LABELS[p][l]}</option>)}
        </Select>
      </Section>

      {/* ── Membership (境界思考) ── */}
      <Section title="Membership" className="mt-1.5">
        <FieldLabel>{l === "ja" ? "所属状態" : "Status"}</FieldLabel>
        <Select value={node.membershipStatus || ""} onChange={(e) => onUpdateNode({ membershipStatus: (e.target.value || undefined) as NodeItem["membershipStatus"] })}>
          <option value="">-</option>
          {MEMBERSHIP_STATUSES.map((m) => <option key={m} value={m}>{MEMBERSHIP_STATUS_LABELS[m][l]}</option>)}
        </Select>
      </Section>

      {/* ── Extensions (Management Method Layer) ── */}
      {activeMethods && activeMethods.length > 0 && (
        <ExtensionsEditor
          activeMethods={activeMethods}
          extensions={node.extensions || {}}
          lang={l}
          allMethods={allMethods}
          onUpdateExtensions={(next) => onUpdateNode({ extensions: Object.keys(next).length > 0 ? next : undefined })}
        />
      )}

      {/* ── Tags ── */}
      <Section title="Tags" className="mt-1.5">
        <Input value={tagsStr} placeholder="tag1, tag2, tag3" onChange={(e) => onUpdateNode({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        {node.tags && node.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {node.tags.map((tag, i) => (
              <span key={i} className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "var(--tw-border)", background: "var(--tw-bg-card)", color: "var(--tw-text-dim)" }}>{tag}</span>
            ))}
          </div>
        )}
      </Section>

      {/* ── Subject Terms (統制語彙) ── */}
      {vocabulary && vocabulary.length > 0 && (
        <Section title={l === "ja" ? "主題標目" : "Subject Terms"} className="mt-1.5">
          <div className="space-y-1">
            {vocabulary.map((term) => {
              const assigned = (node.subjectTermIds || []).includes(term.id);
              return (
                <button
                  key={term.id}
                  onClick={() => {
                    const prev = node.subjectTermIds || [];
                    onUpdateNode({ subjectTermIds: assigned ? prev.filter((id) => id !== term.id) : [...prev, term.id] });
                  }}
                  className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[8px] transition-colors"
                  style={{
                    background: assigned ? "color-mix(in srgb, var(--tw-accent) 16%, transparent)" : "transparent",
                    borderRadius: 4,
                    color: assigned ? "var(--tw-text)" : "var(--tw-text-muted)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: assigned ? "var(--tw-accent)" : "var(--tw-border)" }}
                  />
                  {term.classNumber && (
                    <span className="text-[7px] shrink-0" style={{ color: "var(--tw-text-muted)" }}>{term.classNumber}</span>
                  )}
                  <span className="truncate">{term.label}</span>
                </button>
              );
            })}
          </div>
          {(node.subjectTermIds || []).length > 0 && (
            <button
              className="mt-1 text-[7px]"
              style={{ color: "var(--tw-text-muted)" }}
              onClick={() => onUpdateNode({ subjectTermIds: undefined })}
            >
              {l === "ja" ? "全解除" : "Clear all"}
            </button>
          )}
        </Section>
      )}

      {/* ── Task ── */}
      <Section title="Task" className="mt-1.5">
        {!hasTask ? (
          <Button onClick={() => onUpdateNode({ task: { status: "todo" } })} className="w-full">Make Task</Button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <div><FieldLabel>Status</FieldLabel><Select value={node.task!.status} onChange={(e) => onUpdateNode({ task: { ...node.task!, status: e.target.value as NodeTask["status"] } })}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></div>
              <div><FieldLabel>Priority</FieldLabel><Input type="number" min="0" max="10" step="1" value={node.task!.priority ?? 0} onChange={(e) => onUpdateNode({ task: { ...node.task!, priority: Number(e.target.value) } })} /></div>
            </div>
            <div className="mt-1.5"><FieldLabel>Deadline</FieldLabel><Input type="date" value={node.task!.deadline || ""} onChange={(e) => onUpdateNode({ task: { ...node.task!, deadline: e.target.value || undefined } })} /></div>
            <div className="mt-1.5"><Button danger onClick={() => onUpdateNode({ task: undefined })} className="w-full">Remove Task</Button></div>
          </>
        )}
      </Section>

      {/* ── URLs ── */}
      <Section title="URLs" className="mt-1.5">
        <UrlPanel urls={node.linkedUrls || []} onUpdateUrls={(urls) => onUpdateNode({ linkedUrls: urls.length > 0 ? urls : undefined })} lang={l} />
      </Section>

      {/* ── Shared ID / Counter Arguments ── */}
      <Section title={l === "ja" ? "共有 / 反対意見" : "Shared / Counter Arguments"} className="mt-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <FieldLabel>{l === "ja" ? "共有ID" : "Shared ID"}</FieldLabel>
            <Input value={node.sharedId || ""} onChange={(e) => onUpdateNode({ sharedId: e.target.value || undefined })} />
          </div>
          <div>
            <FieldLabel>{l === "ja" ? "反対意見ノード" : "Counter Arguments"}</FieldLabel>
            <Input value={(node.counterArgumentNodeIds || []).join(", ")} placeholder={l === "ja" ? "ノードID（カンマ区切り）" : "Node IDs (comma separated)"} onChange={(e) => onUpdateNode({ counterArgumentNodeIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>
      </Section>

      {node.createdAt && (
        <div className="mt-1.5 text-[7px]" style={{ color: "var(--tw-text-muted)" }}>
          created: {new Date(node.createdAt).toLocaleDateString()} / updated: {node.updatedAt ? new Date(node.updatedAt).toLocaleDateString() : "-"}
        </div>
      )}
    </div>
  );
}
