export const CANONICAL_RELATION_TYPES = [
  "supports",
  "contradicts",
  "elaborates",
  "questions",
  "references",
  "contains",
  "belongsTo",
  "derivedFrom",
  "comparesWith",
  "causedBy",
  "leadsTo",
  "versionOf",
  "attachedTo",
  "relatedTo",
] as const;

const RELATION_ALIASES: Record<string, (typeof CANONICAL_RELATION_TYPES)[number]> = {
  supports: "supports",
  support: "supports",
  supportsnode: "supports",
  contradicts: "contradicts",
  contradict: "contradicts",
  反証: "contradicts",
  elaborates: "elaborates",
  elaboration: "elaborates",
  詳細化: "elaborates",
  questions: "questions",
  question: "questions",
  問い: "questions",
  references: "references",
  reference: "references",
  ref: "references",
  参照: "references",
  contains: "contains",
  contain: "contains",
  parent: "contains",
  belongsTo: "belongsTo",
  belongsto: "belongsTo",
  derivedFrom: "derivedFrom",
  derivedfrom: "derivedFrom",
  splitfrom: "derivedFrom",
  mergedfrom: "derivedFrom",
  comparesWith: "comparesWith",
  compareswith: "comparesWith",
  compare: "comparesWith",
  causedBy: "causedBy",
  causedby: "causedBy",
  leadsTo: "leadsTo",
  leadsto: "leadsTo",
  影響: "leadsTo",
  versionOf: "versionOf",
  versionof: "versionOf",
  attachedTo: "attachedTo",
  attachedto: "attachedTo",
  relatedTo: "relatedTo",
  relatedto: "relatedTo",
  relation: "relatedTo",
  調整: "relatedTo",
  関連: "relatedTo",
};

function normalizeRelationKey(value: string): string {
  return value.trim().replace(/\s+/g, "").replace(/[-_]/g, "").toLowerCase();
}

export function canonicalizeRelationType(value: unknown, fallback: (typeof CANONICAL_RELATION_TYPES)[number] = "relatedTo"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const key = normalizeRelationKey(trimmed);
  return RELATION_ALIASES[key] || trimmed;
}
