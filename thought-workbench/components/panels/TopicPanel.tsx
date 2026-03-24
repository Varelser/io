import React, { useMemo, useState } from "react";
import type { TopicItem, NodeItem, CanvasRegion, TopicLinkItem } from "../../types";
import { newId } from "../../utils/id";
import { PARA_BUCKETS } from "../../constants/presets";
import { normalizeSourceFilename } from "../../utils/slug";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";
import { Section } from "../ui/Section";
import { MANDALA_SLOT_IDS, buildMandalaSlots, applyMandalaSlotLayout, createMandalaLayoutWithCenter, type MandalaSlotId } from "../../utils/mandala";
import { buildSemanticLayerSummary } from "../../utils/semantic-assist";
import { buildStrataLayerEntries, buildTopicLayerStyles } from "../../utils/strata";
import { applyTopicFramework, buildTopicMoc } from "../../utils/thinking-frameworks";
import { BUILTIN_METHODS } from "../../constants/builtin-methods";
import type { ManagementMethod } from "../../types";

export function TopicPanel({
  topic,
  selectedNode,
  onDuplicateTopic,
  onDeleteTopic,
  onUpdateTopic,
  onToggleMustOne,
  onApplyParaToSubtree,
  onSelectMustOneHistory,
  topics = [],
  topicLinks = [],
  lang = "ja",
  allMethods,
}: {
  topic: TopicItem;
  selectedNode: NodeItem | null;
  onDuplicateTopic: () => void;
  onDeleteTopic: () => void;
  onUpdateTopic: (patch: Partial<TopicItem>) => void;
  onToggleMustOne: () => void;
  onApplyParaToSubtree?: (category: string) => void;
  onSelectMustOneHistory?: (nodeId: string) => void;
  topics?: TopicItem[];
  topicLinks?: TopicLinkItem[];
  lang?: "ja" | "en";
  allMethods?: ManagementMethod[];
}) {
  const mandalaSlots = buildMandalaSlots(topic);
  const semanticLayers = buildSemanticLayerSummary(topic.nodes);
  const strataLayers = buildStrataLayerEntries(topic);
  const moc = useMemo(() => buildTopicMoc(topic, topics, topicLinks, lang), [topic, topics, topicLinks, lang]);
  const selectedNodeInMandala = !!selectedNode && topic.nodes.some((node) => node.id === selectedNode.id);
  const updateMandalaSlot = (slotId: MandalaSlotId, nodeId: string) => {
    const nextAssignments: Partial<Record<MandalaSlotId, string | null>> = {};
    mandalaSlots.forEach((slot) => {
      nextAssignments[slot.id] = slot.nodeId;
      if (slot.nodeId === nodeId) nextAssignments[slot.id] = null;
    });
    nextAssignments[slotId] = nodeId || null;
    onUpdateTopic({ nodes: applyMandalaSlotLayout(topic, nextAssignments) });
  };
  const updateLayerStyle = (layer: string, patch: Partial<{ visible: boolean; color: string }>) => {
    const current = buildTopicLayerStyles(topic);
    onUpdateTopic({
      layerStyles: {
        ...current,
        [layer]: {
          ...current[layer],
          ...patch,
        },
      },
    });
  };
  const appendMocDescription = () => {
    const next = topic.description.includes(moc.markdown)
      ? topic.description
      : `${topic.description.trim()}${topic.description.trim() ? "\n\n" : ""}${moc.markdown}`;
    onUpdateTopic({ description: next });
  };
  const applyFramework = (kind: "issue_tree" | "cynefin") => {
    onUpdateTopic(applyTopicFramework(topic, kind, lang));
  };

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      <div className="flex items-center justify-between gap-2"><div className="text-[9px] text-white/92">{lang === "ja" ? "トピック" : "Topic"}</div><div className="flex gap-1"><Button onClick={onDuplicateTopic}>{lang === "ja" ? "複製" : "Copy"}</Button><Button danger onClick={onDeleteTopic}>{lang === "ja" ? "削除" : "Delete"}</Button></div></div>
      <div className="mt-1.5"><FieldLabel>{lang === "ja" ? "タイトル" : "Title"}</FieldLabel><Input value={topic.title} onChange={(e) => onUpdateTopic({ title: e.target.value, sourceFile: normalizeSourceFilename(e.target.value) })} /></div>
      <div className="mt-1.5"><FieldLabel>{lang === "ja" ? "分野 / Domain" : "Domain"}</FieldLabel><Input value={topic.domain || ""} onChange={(e) => onUpdateTopic({ domain: e.target.value || undefined })} placeholder={lang === "ja" ? "例: 音楽理論, 認知科学" : "e.g. music theory, cognitive science"} /></div>
      <div className="mt-1.5"><FieldLabel>{lang === "ja" ? "フォルダ" : "Folder"}</FieldLabel><Input value={topic.folder} onChange={(e) => onUpdateTopic({ folder: e.target.value })} /></div>
      <div className="mt-1.5"><FieldLabel>{lang === "ja" ? "説明" : "Description"}</FieldLabel><TextArea rows={2} value={topic.description} onChange={(e) => onUpdateTopic({ description: e.target.value })} /></div>
      <div className="mt-1.5"><FieldLabel>PARA</FieldLabel><Select value={topic.paraCategory} onChange={(e) => onUpdateTopic({ paraCategory: e.target.value, folder: e.target.value })}>{PARA_BUCKETS.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {PARA_BUCKETS.map((value) => (
          <Button key={`para-${value}`} active={topic.paraCategory === value} onClick={() => onApplyParaToSubtree?.(value)} className="w-full">
            {lang === "ja" ? `${value} 配下へ` : `Move to ${value}`}
          </Button>
        ))}
      </div>
      <div className="mt-1 text-[7px] text-white/28">
        {lang === "ja"
          ? "選択 topic と子球体をまとめて PARA カテゴリ配下へ移動"
          : "Move the selected topic and its descendants into one PARA category"}
      </div>
      <div className="mt-1.5">
        <FieldLabel>{lang === "ja" ? "親トピック" : "Parent Topic"}</FieldLabel>
        <Select value={topic.parentTopicId || ""} onChange={(e) => onUpdateTopic({ parentTopicId: e.target.value || null })}>
          <option value="">-</option>
          {topics.filter((t) => t.id !== topic.id).map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </Select>
      </div>
      {topic.nodes.length > 0 && (
        <div className="mt-1.5">
          <FieldLabel>{lang === "ja" ? "球体外ノード" : "Outside Nodes"}</FieldLabel>
          <div className="mt-0.5 rounded-md border border-white/8 bg-black/20 p-1.5 space-y-0.5 max-h-24 overflow-y-auto">
            {topic.nodes.map((node) => {
              const isOutside = (topic.outsideNodeIds || []).includes(node.id);
              return (
                <label key={node.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOutside}
                    onChange={() => {
                      const current = topic.outsideNodeIds || [];
                      const next = isOutside
                        ? current.filter((id) => id !== node.id)
                        : [...current, node.id];
                      onUpdateTopic({ outsideNodeIds: next.length > 0 ? next : undefined });
                    }}
                    className="accent-[var(--tw-accent)]"
                  />
                  <span className="text-[8px] text-white/60 truncate">{node.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-1.5"><FieldLabel>{lang === "ja" ? "ソースファイル" : "Source File"}</FieldLabel><div className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/66">{topic.sourceFile}</div></div>
      <div className="mt-1.5"><FieldLabel>Must One</FieldLabel><div className="grid grid-cols-[1fr_auto] gap-1.5"><div className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/66">{topic.nodes.find((node) => node.id === topic.mustOneNodeId)?.label || "-"}</div><Button onClick={onToggleMustOne}>{topic.mustOneNodeId === selectedNode?.id ? (lang === "ja" ? "解除" : "Clear") : (lang === "ja" ? "設定" : "Set")}</Button></div></div>
      <div className="mt-1.5 grid grid-cols-[1fr_120px] gap-1.5">
        <div>
          <FieldLabel>{lang === "ja" ? "Must One 日付" : "Must One Date"}</FieldLabel>
          <Input
            type="date"
            value={topic.mustOneDate || ""}
            onChange={(e) => onUpdateTopic({ mustOneDate: e.target.value || null })}
          />
        </div>
        <div>
          <FieldLabel>{lang === "ja" ? "履歴数" : "History"}</FieldLabel>
          <div className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[9px] text-white/66">
            {(topic.mustOneHistory || []).length}
          </div>
        </div>
      </div>
      {(topic.mustOneHistory || []).length > 0 && (
        <div className="mt-1.5 rounded-md border border-white/8 bg-black/20 p-2">
          <div className="text-[8px] uppercase tracking-wider text-white/34">
            {lang === "ja" ? "Must One History" : "Must One History"}
          </div>
          <div className="mt-1 space-y-1">
            {(topic.mustOneHistory || []).slice(0, 6).map((entry) => (
              <button
                key={`${entry.date}-${entry.nodeId}`}
                className="flex w-full items-center justify-between rounded-md border border-white/8 bg-white/[0.02] px-2 py-1 text-left text-[8px] text-white/68"
                onClick={() => onSelectMustOneHistory?.(entry.nodeId)}
              >
                <span className="truncate">{entry.label}</span>
                <span className="shrink-0 text-white/28">{entry.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Section title={lang === "ja" ? "MOC / Frameworks" : "MOC / Frameworks"} className="mt-1.5">
        <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5 text-[8px] text-white/52">
          {lang === "ja"
            ? "Map of Content の索引と、Issue Tree / Cynefin の scaffold を topic に追加できます。"
            : "Generate a Map of Content index and add Issue Tree / Cynefin scaffolds to this topic."}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <Button onClick={appendMocDescription} className="w-full">{lang === "ja" ? "MOC追記" : "Append MOC"}</Button>
          <Button onClick={() => applyFramework("issue_tree")} className="w-full">{lang === "ja" ? "Issue Tree" : "Issue Tree"}</Button>
          <Button onClick={() => applyFramework("cynefin")} className="w-full">{lang === "ja" ? "Cynefin" : "Cynefin"}</Button>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[8px] text-white/58">
          <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
            <div className="text-white/76">{lang === "ja" ? "親" : "Parent"}</div>
            <div className="mt-0.5">{moc.parentTitle || "-"}</div>
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
            <div className="text-white/76">{lang === "ja" ? "Must One" : "Must One"}</div>
            <div className="mt-0.5">{moc.mustOneLabel || "-"}</div>
          </div>
        </div>
        <div className="mt-1.5 space-y-1">
          <div className="text-[8px] uppercase tracking-wider text-white/34">{lang === "ja" ? "Child Topics" : "Child Topics"}</div>
          <div className="flex flex-wrap gap-1">
            {(moc.childTitles.length ? moc.childTitles : ["-"]).map((label) => (
              <span key={`child-${label}`} className="rounded-full border px-1.5 py-0.5 text-[7px]" style={{ borderColor: "var(--tw-border)", color: "var(--tw-text-muted)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wider text-white/34">{lang === "ja" ? "Outgoing" : "Outgoing"}</div>
            <div className="mt-1 space-y-1 text-[7px] text-white/58">
              {(moc.outgoingLinks.length ? moc.outgoingLinks : [{ title: "-", relation: "-" }]).map((item) => (
                <div key={`out-${item.title}-${item.relation}`}>{item.title} / {item.relation}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-wider text-white/34">{lang === "ja" ? "Incoming" : "Incoming"}</div>
            <div className="mt-1 space-y-1 text-[7px] text-white/58">
              {(moc.incomingLinks.length ? moc.incomingLinks : [{ title: "-", relation: "-" }]).map((item) => (
                <div key={`in-${item.title}-${item.relation}`}>{item.title} / {item.relation}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-1.5 rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
          <div className="text-[8px] uppercase tracking-wider text-white/34">{lang === "ja" ? "MOC Preview" : "MOC Preview"}</div>
          <pre className="mt-1 whitespace-pre-wrap text-[7px] leading-4 text-white/58">{moc.markdown}</pre>
        </div>
      </Section>
      <Section title={lang === "ja" ? "Strata" : "Strata"} className="mt-1.5">
        <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5 text-[8px] text-white/52">
          {lang === "ja"
            ? "layer ごとの可視性 / 色を調整し、作成日・更新日から時間堆積も確認できます。"
            : "Tune visibility and color per layer, and inspect time sediment from created/updated dates."}
        </div>
        <div className="mt-1.5 space-y-1.5">
          {strataLayers.map((layer) => (
            <div key={layer.layer} className="rounded-md border border-white/8 bg-white/[0.02] p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => updateLayerStyle(layer.layer, { color: e.target.value })}
                    className="h-5 w-5 rounded border border-white/10 bg-transparent p-0"
                  />
                  <div>
                    <div className="text-[8px] uppercase tracking-wider text-white/76">{layer.layer}</div>
                    <div className="text-[7px] text-white/30">{layer.examples.join(" / ") || (lang === "ja" ? "例なし" : "No examples")}</div>
                  </div>
                </div>
                <Button active={layer.visible} onClick={() => updateLayerStyle(layer.layer, { visible: !layer.visible })}>
                  {layer.visible ? (lang === "ja" ? "表示" : "Visible") : (lang === "ja" ? "非表示" : "Hidden")}
                </Button>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[7px] text-white/34">
                <div>{layer.count} {lang === "ja" ? "nodes" : "nodes"}</div>
                <div>{layer.oldestDate ? layer.oldestDate.slice(0, 10) : "-"}</div>
                <div>{layer.newestDate ? layer.newestDate.slice(0, 10) : "-"}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={lang === "ja" ? "Semantic Hierarchy" : "Semantic Hierarchy"} className="mt-1.5">
        <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5 text-[8px] text-white/52">
          {lang === "ja"
            ? "layer ごとのまとまりを見て、抽象から具体への流れを確認できます。"
            : "Review layer groups to inspect the path from abstract concepts to concrete examples."}
        </div>
        <div className="mt-1.5 space-y-1.5">
          {semanticLayers.map((layer) => (
            <div key={layer.layer} className="rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[8px] uppercase tracking-wider text-white/72">{layer.layer}</div>
                <div className="text-[7px] text-white/28">{layer.count} {lang === "ja" ? "nodes" : "nodes"}</div>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.04]">
                <div className="h-full rounded-full bg-sky-400/55" style={{ width: `${Math.max(12, Math.min(100, (layer.count / Math.max(topic.nodes.length, 1)) * 100))}%` }} />
              </div>
              <div className="mt-1 text-[7px] text-white/34">
                {layer.examples.length > 0 ? layer.examples.join(" / ") : (lang === "ja" ? "例なし" : "No examples")}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={lang === "ja" ? "Mandala" : "Mandala"} className="mt-1.5">
        <div className="rounded-md border border-white/8 bg-black/20 px-2 py-1.5 text-[8px] text-white/52">
          {lang === "ja"
            ? "9マス専用の再配置 UI。center を変えると周辺 8 マスも自動で詰め直します。"
            : "Dedicated 3x3 editor. Changing the center automatically reflows the 8 surrounding cells."}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {MANDALA_SLOT_IDS.map((slotId) => {
            const slot = mandalaSlots.find((item) => item.id === slotId);
            return (
              <div key={slotId} className={`rounded-md border px-1.5 py-1 ${slotId === "center" ? "border-amber-400/30 bg-amber-400/5" : "border-white/8 bg-white/[0.02]"}`}>
                <div className="mb-1 text-[7px] uppercase tracking-wider text-white/34">{slotId}</div>
                <Select value={slot?.nodeId || ""} onChange={(e) => updateMandalaSlot(slotId, e.target.value)}>
                  <option value="">{lang === "ja" ? "空き" : "Empty"}</option>
                  {topic.nodes.map((node) => (
                    <option key={`${slotId}-${node.id}`} value={node.id}>{node.label}</option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Button
            onClick={() => selectedNode && onUpdateTopic({ nodes: createMandalaLayoutWithCenter(topic, selectedNode.id) })}
            active={selectedNodeInMandala}
            className="w-full"
          >
            {lang === "ja" ? "選択ノードを center" : "Set Selected as Center"}
          </Button>
          <Button
            onClick={() => onUpdateTopic({ nodes: applyMandalaSlotLayout(topic, Object.fromEntries(mandalaSlots.map((slot) => [slot.id, slot.nodeId])) as Partial<Record<MandalaSlotId, string | null>>) })}
            className="w-full"
          >
            {lang === "ja" ? "3x3 に再整列" : "Reflow 3x3"}
          </Button>
        </div>
      </Section>
      {(topic.activeMethods || []).length > 0 && (
        <Section title={lang === "ja" ? "有効な管理法" : "Active Methods"} className="mt-1.5">
          <div className="flex flex-wrap gap-1">
            {(topic.activeMethods || []).map((methodId) => {
              const method = (allMethods ?? BUILTIN_METHODS).find((m) => m.id === methodId);
              const label = method ? (lang === "ja" ? method.name.ja : method.name.en) : methodId;
              const cat = method?.category || "custom";
              const catColors: Record<string, string> = {
                standard: "#6b7280", library: "#14b8a6", pkm: "#22c55e",
                task: "#3b82f6", research: "#a855f7", assessment: "#f97316", custom: "#eab308",
              };
              const color = catColors[cat] || "#6b7280";
              return (
                <span
                  key={methodId}
                  className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[7px] leading-none"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                  title={method ? (lang === "ja" ? method.description.ja : method.description.en) : methodId}
                >
                  {label}
                </span>
              );
            })}
          </div>
          {(() => {
            const preferred = (topic.activeMethods || [])
              .flatMap((id) => (allMethods ?? BUILTIN_METHODS).find((m) => m.id === id)?.preferredRelations || [])
              .filter((v, i, a) => a.indexOf(v) === i);
            return preferred.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-[7px] text-white/34 mr-0.5">{lang === "ja" ? "推奨関係:" : "Relations:"}</span>
                {preferred.map((rel) => (
                  <span key={rel} className="text-[7px] text-white/50 rounded border border-white/10 px-1 py-0">{rel}</span>
                ))}
              </div>
            ) : null;
          })()}
        </Section>
      )}
      <Section title={lang === "ja" ? "座標軸ラベル" : "Axis Labels"} className="mt-1.5">
        <div className="mt-1.5"><FieldLabel>X {lang === "ja" ? "軸" : "Axis"}</FieldLabel><Input value={topic.axisPreset?.x || ""} placeholder={lang === "ja" ? "例: 自己 ↔ 外界" : "e.g. Self ↔ World"} onChange={(e) => onUpdateTopic({ axisPreset: { ...(topic.axisPreset || { x: "", y: "", z: "" }), x: e.target.value } })} /></div>
        <div className="mt-1.5"><FieldLabel>Y {lang === "ja" ? "軸" : "Axis"}</FieldLabel><Input value={topic.axisPreset?.y || ""} placeholder={lang === "ja" ? "例: 過去 ↔ 未来" : "e.g. Past ↔ Future"} onChange={(e) => onUpdateTopic({ axisPreset: { ...(topic.axisPreset || { x: "", y: "", z: "" }), y: e.target.value } })} /></div>
        <div className="mt-1.5"><FieldLabel>Z {lang === "ja" ? "軸" : "Axis"}</FieldLabel><Input value={topic.axisPreset?.z || ""} placeholder={lang === "ja" ? "例: 暗黙 ↔ 明示" : "e.g. Tacit ↔ Explicit"} onChange={(e) => onUpdateTopic({ axisPreset: { ...(topic.axisPreset || { x: "", y: "", z: "" }), z: e.target.value } })} /></div>
      </Section>
      <Section title={lang === "ja" ? "球体設定" : "Sphere Settings"} className="mt-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div><FieldLabel>{lang === "ja" ? "球体サイズ" : "Sphere Size"}</FieldLabel><Input type="range" min="72" max="180" step="1" value={topic.workspace.size} onChange={(e) => onUpdateTopic({ workspace: { ...topic.workspace, size: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "球体透明度" : "Sphere Opacity"}</FieldLabel><Input type="range" min="0.04" max="0.5" step="0.01" value={topic.style.sphereOpacity} onChange={(e) => onUpdateTopic({ style: { ...topic.style, sphereOpacity: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "エッジ透明度" : "Edge Opacity"}</FieldLabel><Input type="range" min="0.08" max="1" step="0.01" value={topic.style.edgeOpacity} onChange={(e) => onUpdateTopic({ style: { ...topic.style, edgeOpacity: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "グリッド透明度" : "Grid Opacity"}</FieldLabel><Input type="range" min="0" max="0.5" step="0.01" value={topic.style.gridOpacity} onChange={(e) => onUpdateTopic({ style: { ...topic.style, gridOpacity: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "ノード倍率" : "Node Scale"}</FieldLabel><Input type="range" min="0.35" max="2.2" step="0.01" value={topic.style.nodeScale} onChange={(e) => onUpdateTopic({ style: { ...topic.style, nodeScale: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "ラベル倍率" : "Label Scale"}</FieldLabel><Input type="range" min="0.45" max="1.8" step="0.01" value={topic.style.labelScale} onChange={(e) => onUpdateTopic({ style: { ...topic.style, labelScale: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "遠近感" : "Perspective"}</FieldLabel><Input type="range" min="0.02" max="0.24" step="0.01" value={topic.style.perspective} onChange={(e) => onUpdateTopic({ style: { ...topic.style, perspective: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "ラベル表示" : "Labels"}</FieldLabel><Button active={topic.style.showLabels} onClick={() => onUpdateTopic({ style: { ...topic.style, showLabels: !topic.style.showLabels } })} className="w-full">{topic.style.showLabels ? (lang === "ja" ? "オン" : "On") : (lang === "ja" ? "オフ" : "Off")}</Button></div>
          <div><FieldLabel>{lang === "ja" ? "中心 X" : "Center X"}</FieldLabel><Input type="range" min="-260" max="260" step="1" value={topic.style.centerOffsetX || 0} onChange={(e) => onUpdateTopic({ style: { ...topic.style, centerOffsetX: Number(e.target.value) } })} /></div>
          <div><FieldLabel>{lang === "ja" ? "中心 Y" : "Center Y"}</FieldLabel><Input type="range" min="-260" max="260" step="1" value={topic.style.centerOffsetY || 0} onChange={(e) => onUpdateTopic({ style: { ...topic.style, centerOffsetY: Number(e.target.value) } })} /></div>
          <div><FieldLabel>X</FieldLabel><Input type="number" step="1" value={topic.style.centerOffsetX || 0} onChange={(e) => onUpdateTopic({ style: { ...topic.style, centerOffsetX: Number(e.target.value) } })} /></div>
          <div><FieldLabel>Y</FieldLabel><Input type="number" step="1" value={topic.style.centerOffsetY || 0} onChange={(e) => onUpdateTopic({ style: { ...topic.style, centerOffsetY: Number(e.target.value) } })} /></div>
        </div>
      </Section>
      <CanvasRegionsEditor regions={topic.canvasRegions || []} onUpdate={(regions) => onUpdateTopic({ canvasRegions: regions.length > 0 ? regions : undefined })} lang={lang} />
    </div>
  );
}

const REGION_COLORS = ["rgba(59,130,246,0.5)", "rgba(234,179,8,0.5)", "rgba(168,85,247,0.5)", "rgba(34,197,94,0.5)", "rgba(239,68,68,0.5)", "rgba(6,182,212,0.5)"];

function colorToHex(color: string): string {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `#${Number(m[1]).toString(16).padStart(2, "0")}${Number(m[2]).toString(16).padStart(2, "0")}${Number(m[3]).toString(16).padStart(2, "0")}`;
  return color.startsWith("#") ? color.slice(0, 7) : "#888888";
}

function colorToAlpha(color: string): number {
  const m = color.match(/rgba?\(\d+,\s*\d+,\s*\d+,?\s*([\d.]+)?\)/);
  return m && m[1] ? parseFloat(m[1]) : 1;
}

function hexAlphaToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function CanvasRegionsEditor({ regions, onUpdate, lang = "ja" }: { regions: CanvasRegion[]; onUpdate: (regions: CanvasRegion[]) => void; lang?: "ja" | "en" }) {
  const [newLabel, setNewLabel] = useState("");

  const addRegion = () => {
    if (!newLabel.trim()) return;
    const region: CanvasRegion = {
      id: newId("region"),
      label: newLabel.trim(),
      bounds: { x: 5, y: 5, w: 20, h: 15 },
      color: REGION_COLORS[regions.length % REGION_COLORS.length],
    };
    onUpdate([...regions, region]);
    setNewLabel("");
  };

  const removeRegion = (id: string) => onUpdate(regions.filter((r) => r.id !== id));

  const updateRegion = (id: string, patch: Partial<CanvasRegion>) => {
    onUpdate(regions.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  return (
    <Section title={lang === "ja" ? "キャンバス領域" : "Canvas Regions"} className="mt-1.5">
      <div className="flex gap-1 mb-1.5">
        <Input value={newLabel} placeholder={lang === "ja" ? "領域名" : "Region name"} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && addRegion()} />
        <Button onClick={addRegion}>+</Button>
      </div>
      {regions.map((r) => (
        <div key={r.id} className="mb-1 rounded border border-white/8 bg-black/20 p-1">
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={colorToHex(r.color)}
              onChange={(e) => updateRegion(r.id, { color: hexAlphaToRgba(e.target.value, colorToAlpha(r.color)) })}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent p-0"
              title={lang === "ja" ? "領域カラー" : "Region color"}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={colorToAlpha(r.color)}
              onChange={(e) => updateRegion(r.id, { color: hexAlphaToRgba(colorToHex(r.color), Number(e.target.value)) })}
              className="w-10 shrink-0"
              title={lang === "ja" ? "不透明度" : "Opacity"}
            />
            <Input value={r.label} onChange={(e) => updateRegion(r.id, { label: e.target.value })} />
            <button onClick={() => removeRegion(r.id)} className="text-[8px] text-red-400/60 hover:text-red-400">×</button>
          </div>
          <div className="mt-0.5 grid grid-cols-4 gap-0.5">
            <div><FieldLabel>X</FieldLabel><Input type="number" step="1" value={r.bounds.x} onChange={(e) => updateRegion(r.id, { bounds: { ...r.bounds, x: Number(e.target.value) } })} /></div>
            <div><FieldLabel>Y</FieldLabel><Input type="number" step="1" value={r.bounds.y} onChange={(e) => updateRegion(r.id, { bounds: { ...r.bounds, y: Number(e.target.value) } })} /></div>
            <div><FieldLabel>W</FieldLabel><Input type="number" step="1" value={r.bounds.w} onChange={(e) => updateRegion(r.id, { bounds: { ...r.bounds, w: Number(e.target.value) } })} /></div>
            <div><FieldLabel>H</FieldLabel><Input type="number" step="1" value={r.bounds.h} onChange={(e) => updateRegion(r.id, { bounds: { ...r.bounds, h: Number(e.target.value) } })} /></div>
          </div>
        </div>
      ))}
    </Section>
  );
}
