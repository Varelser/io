import React, { useState } from "react";
import type { TopicItem, TopicLinkItem, UnresolvedTopicLink } from "../../types";
import { RELATIONS } from "../../constants/relations";
import { CONTRADICTION_TYPES, TRANSFORM_OPS } from "../../types/edge";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";
import { Select } from "../ui/Select";
import { FieldLabel } from "../ui/FieldLabel";

function UnresolvedRefItem({
  unresolvedRef,
  index,
  topics,
  selectedTopicId,
  resolveLabel,
  lang,
  onResolveUnresolved,
}: {
  unresolvedRef: UnresolvedTopicLink;
  index: number;
  topics: TopicItem[];
  selectedTopicId: string;
  resolveLabel: string;
  lang?: "ja" | "en";
  onResolveUnresolved: (index: number, targetId: string) => void;
}) {
  const [pendingTargetId, setPendingTargetId] = useState("");
  return (
    <div className="rounded border border-white/10 px-2 py-1.5">
      <div className="text-[8px] text-white/48">
        {unresolvedRef.targetTitle || unresolvedRef.targetFile || unresolvedRef.targetId || "unknown"} / {unresolvedRef.relation}
      </div>
      <div className="mt-1 flex gap-1">
        <Select value={pendingTargetId} onChange={(e) => setPendingTargetId(e.target.value)}>
          <option value="">{resolveLabel}</option>
          {topics
            .filter((topic) => topic.id !== selectedTopicId)
            .map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.title}</option>
            ))}
        </Select>
        <Button
          disabled={!pendingTargetId}
          onClick={() => { if (pendingTargetId) onResolveUnresolved(index, pendingTargetId); }}
        >
          {lang === "ja" ? "解決" : "Resolve"}
        </Button>
      </div>
    </div>
  );
}

export function TopicLinksPanel({
  title,
  topics,
  selectedTopicId,
  links,
  unresolvedRefs,
  resolveLabel,
  targetLabel,
  relationLabel,
  meaningLabel,
  newTarget,
  onChangeNewTarget,
  newRelation,
  onChangeNewRelation,
  newMeaning,
  onChangeNewMeaning,
  onAddLink,
  onDeleteLink,
  onResolveUnresolved,
  onResolveAllUnresolved,
  onUpdateLink,
  lang,
}: {
  title: string;
  topics: TopicItem[];
  selectedTopicId: string;
  links: TopicLinkItem[];
  unresolvedRefs: UnresolvedTopicLink[];
  resolveLabel: string;
  targetLabel: string;
  relationLabel: string;
  meaningLabel: string;
  newTarget: string;
  onChangeNewTarget: (value: string) => void;
  newRelation: string;
  onChangeNewRelation: (value: string) => void;
  newMeaning: string;
  onChangeNewMeaning: (value: string) => void;
  onAddLink: () => void;
  onDeleteLink: (topicLinkId: string) => void;
  onResolveUnresolved: (index: number, targetId: string) => void;
  onResolveAllUnresolved?: () => void;
  onUpdateLink?: (linkId: string, patch: Partial<TopicLinkItem>) => void;
  lang?: "ja" | "en";
}) {
  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      <div className="text-[9px] text-white/92">{title}</div>
      <div className="mt-1.5 space-y-1.5">
        {links.map((link) => {
          const otherId = link.from === selectedTopicId ? link.to : link.from;
          const otherTopic = topics.find((topic) => topic.id === otherId);
          return (
            <div key={link.id} className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5">
              <div className="flex items-center justify-between gap-1.5 text-[9px] text-white/74">
                <span>{otherTopic?.title ?? "-"}</span>
                <span className="text-white/32">{link.relation}</span>
              </div>
              <div className="mt-0.5 text-[8px] leading-4 text-white/54">{link.meaning}</div>
              <div className="mt-0.5 text-[8px] text-white/34">{otherTopic?.sourceFile || "-"}</div>
              {onUpdateLink && (
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <div>
                    <FieldLabel>{lang === "ja" ? "矛盾タイプ" : "Contradiction"}</FieldLabel>
                    <Select
                      value={link.contradictionType || ""}
                      onChange={(e) => onUpdateLink(link.id, { contradictionType: e.target.value || undefined })}
                    >
                      <option value="">-</option>
                      {CONTRADICTION_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>{lang === "ja" ? "変換操作" : "Transform"}</FieldLabel>
                    <Select
                      value={link.transformOp || ""}
                      onChange={(e) => onUpdateLink(link.id, { transformOp: e.target.value || undefined })}
                    >
                      <option value="">-</option>
                      {TRANSFORM_OPS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
              <div className="mt-1">
                <Button danger onClick={() => onDeleteLink(link.id)} className="w-full">✕</Button>
              </div>
            </div>
          );
        })}

        {unresolvedRefs.length > 0 && (
          <div className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[9px] text-white/72">unresolved ({unresolvedRefs.length})</div>
              {onResolveAllUnresolved && (
                <Button onClick={onResolveAllUnresolved} className="text-[7px]">
                  {lang === "ja" ? "一括解決" : "Resolve all"}
                </Button>
              )}
            </div>
            <div className="mt-1 space-y-1.5">
              {unresolvedRefs.map((ref, index) => (
                <UnresolvedRefItem
                  key={`${ref.targetTitle || ref.targetFile || ref.targetId || "unknown"}-${index}`}
                  unresolvedRef={ref}
                  index={index}
                  topics={topics}
                  selectedTopicId={selectedTopicId}
                  resolveLabel={resolveLabel}
                  lang={lang}
                  onResolveUnresolved={onResolveUnresolved}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <FieldLabel>{targetLabel}</FieldLabel>
          <Select value={newTarget} onChange={(e) => onChangeNewTarget(e.target.value)}>
            <option value="">select</option>
            {topics
              .filter((topic) => topic.id !== selectedTopicId)
              .map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.title}</option>
              ))}
          </Select>
        </div>
        <div>
          <FieldLabel>{relationLabel}</FieldLabel>
          <Select value={newRelation} onChange={(e) => onChangeNewRelation(e.target.value)}>
            {RELATIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>{meaningLabel}</FieldLabel>
          <TextArea rows={2} value={newMeaning} onChange={(e) => onChangeNewMeaning(e.target.value)} />
        </div>
        <Button onClick={onAddLink} className="w-full">＋ link</Button>
      </div>
    </div>
  );
}
