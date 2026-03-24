import type { NodeItem, SmartFolder, TopicItem, VocabTerm } from "../types";
import {
  matchesIntakeStatus,
  matchesPublicationState,
  matchesReviewState,
  matchesUrlState,
  matchesVersionState,
  matchesWorkStatus,
} from "./state-model";

export function sanitizeSmartFolderFilter(filter: SmartFolder["filter"]): SmartFolder["filter"] {
  const next: SmartFolder["filter"] = {};

  if (typeof filter.intakeStatus === "string" && filter.intakeStatus.trim()) next.intakeStatus = filter.intakeStatus.trim();
  if (typeof filter.workStatus === "string" && filter.workStatus.trim()) next.workStatus = filter.workStatus.trim();
  if (typeof filter.versionState === "string" && filter.versionState.trim()) next.versionState = filter.versionState.trim();
  if (typeof filter.reviewState === "string" && filter.reviewState.trim()) next.reviewState = filter.reviewState.trim();
  if (typeof filter.publicationState === "string" && filter.publicationState.trim()) next.publicationState = filter.publicationState.trim();
  if (typeof filter.urlState === "string" && filter.urlState.trim()) next.urlState = filter.urlState.trim();
  if (typeof filter.type === "string" && filter.type.trim()) next.type = filter.type.trim();
  if (typeof filter.evidenceBasis === "string" && filter.evidenceBasis.trim()) next.evidenceBasis = filter.evidenceBasis.trim();
  if (typeof filter.textMatch === "string" && filter.textMatch.trim()) next.textMatch = filter.textMatch.trim();
  if (typeof filter.subjectTermId === "string" && filter.subjectTermId.trim()) next.subjectTermId = filter.subjectTermId.trim();
  if (typeof filter.usesBroaderMatch === "boolean") next.usesBroaderMatch = filter.usesBroaderMatch;
  if (typeof filter.tags === "string" && filter.tags.trim()) next.tags = filter.tags.trim();
  if (typeof filter.hypothesisStage === "string" && filter.hypothesisStage.trim()) next.hypothesisStage = filter.hypothesisStage.trim();
  if (typeof filter.knowledgePhase === "string" && filter.knowledgePhase.trim()) next.knowledgePhase = filter.knowledgePhase.trim();
  if (typeof filter.membershipStatus === "string" && filter.membershipStatus.trim()) next.membershipStatus = filter.membershipStatus.trim();
  if (typeof filter.createdAfter === "string" && filter.createdAfter.trim()) next.createdAfter = filter.createdAfter.trim();
  if (typeof filter.createdBefore === "string" && filter.createdBefore.trim()) next.createdBefore = filter.createdBefore.trim();
  if (typeof filter.updatedAfter === "string" && filter.updatedAfter.trim()) next.updatedAfter = filter.updatedAfter.trim();
  if (typeof filter.updatedBefore === "string" && filter.updatedBefore.trim()) next.updatedBefore = filter.updatedBefore.trim();
  if (typeof filter.hasEdges === "boolean") next.hasEdges = filter.hasEdges;
  if (typeof filter.hasExtensions === "boolean") next.hasExtensions = filter.hasExtensions;
  if (typeof filter.staleDays === "number" && Number.isFinite(filter.staleDays) && filter.staleDays >= 0) next.staleDays = filter.staleDays;
  if (typeof filter.lowConfidence === "number" && Number.isFinite(filter.lowConfidence)) {
    next.lowConfidence = Math.max(0, Math.min(1, filter.lowConfidence));
  }
  if (typeof filter.topicDomain === "string" && filter.topicDomain.trim()) next.topicDomain = filter.topicDomain.trim();

  return next;
}

/** 指定タームIDの上位語ID群を再帰的に収集する */
export function collectBroaderIds(termId: string, vocabulary: VocabTerm[]): Set<string> {
  const result = new Set<string>();
  const queue = [termId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    const term = vocabulary.find((t) => t.id === current);
    if (term?.broader) {
      for (const bid of term.broader) {
        if (!result.has(bid)) queue.push(bid);
      }
    }
  }
  return result;
}

/** 指定タームIDの下位語ID群を再帰的に収集する */
export function collectNarrowerIds(termId: string, vocabulary: VocabTerm[]): Set<string> {
  const result = new Set<string>();
  const queue = [termId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const term of vocabulary) {
      if (term.broader?.includes(current) && !result.has(term.id)) {
        queue.push(term.id);
      }
    }
  }
  return result;
}

export function matchesSmartFolderFilter(node: NodeItem, topic: TopicItem, filter: SmartFolder["filter"], vocabulary?: VocabTerm[]): boolean {
  if (filter.intakeStatus && !matchesIntakeStatus(node.intakeStatus, filter.intakeStatus)) return false;
  if (filter.workStatus && !matchesWorkStatus(node.workStatus, filter.workStatus)) return false;
  if (filter.versionState && !matchesVersionState(node.versionState, filter.versionState)) return false;
  if (filter.reviewState && !matchesReviewState(node.reviewState, filter.reviewState)) return false;
  if (filter.publicationState && !matchesPublicationState(node.publicationState, filter.publicationState)) return false;
  if (filter.urlState && !matchesUrlState(node.urlState, filter.urlState)) return false;
  if (filter.type && node.type !== filter.type) return false;
  if (filter.hasEdges === true) {
    const hasEdge = topic.edges.some((edge) => edge.from === node.id || edge.to === node.id);
    if (!hasEdge) return false;
  }
  if (filter.hasEdges === false) {
    const hasEdge = topic.edges.some((edge) => edge.from === node.id || edge.to === node.id);
    if (hasEdge) return false;
  }
  if (filter.lowConfidence != null && (node.confidence ?? 1) > filter.lowConfidence) return false;
  if (filter.evidenceBasis && node.evidenceBasis !== filter.evidenceBasis) return false;
  if (filter.staleDays != null) {
    const updated = new Date(node.updatedAt || node.createdAt || "").getTime();
    if (Number.isNaN(updated)) return false;
    const daysAgo = (Date.now() - updated) / 86400000;
    if (daysAgo > filter.staleDays) return false;
  }
  if (filter.textMatch) {
    const needle = filter.textMatch.toLowerCase();
    const haystack = [node.label, node.note, node.type, node.group, node.layer, topic.title].join(" ").toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (filter.hasExtensions === true) {
    if (!node.extensions || Object.keys(node.extensions).length === 0) return false;
  }
  if (filter.hasExtensions === false) {
    if (node.extensions && Object.keys(node.extensions).length > 0) return false;
  }
  if (filter.subjectTermId && vocabulary) {
    const matchIds = filter.usesBroaderMatch
      ? collectBroaderIds(filter.subjectTermId, vocabulary)
      : collectNarrowerIds(filter.subjectTermId, vocabulary);
    const nodeTerms = node.subjectTermIds || [];
    if (!nodeTerms.some((id) => matchIds.has(id))) return false;
  }
  if (filter.tags) {
    const needle = filter.tags.toLowerCase();
    if (!node.tags?.some((t) => t.toLowerCase().includes(needle))) return false;
  }
  if (filter.hypothesisStage && node.hypothesisStage !== filter.hypothesisStage) return false;
  if (filter.knowledgePhase && node.knowledgePhase !== filter.knowledgePhase) return false;
  if (filter.membershipStatus && node.membershipStatus !== filter.membershipStatus) return false;
  if (filter.createdAfter && node.createdAt && node.createdAt < filter.createdAfter) return false;
  if (filter.createdBefore && node.createdAt && node.createdAt > filter.createdBefore) return false;
  if (filter.updatedAfter) {
    const ts = node.updatedAt || node.createdAt;
    if (!ts || ts < filter.updatedAfter) return false;
  }
  if (filter.updatedBefore) {
    const ts = node.updatedAt || node.createdAt;
    if (!ts || ts > filter.updatedBefore) return false;
  }
  if (filter.topicDomain) {
    const needle = filter.topicDomain.toLowerCase();
    if (!topic.domain?.toLowerCase().includes(needle)) return false;
  }
  return true;
}

export function countSmartFolderMatches(topics: TopicItem[], filter: SmartFolder["filter"]): number {
  let count = 0;
  for (const topic of topics) {
    for (const node of topic.nodes) {
      if (matchesSmartFolderFilter(node, topic, filter)) count += 1;
    }
  }
  return count;
}

export function findFirstSmartFolderMatch(topics: TopicItem[], filter: SmartFolder["filter"]): { topicId: string; nodeId: string } | null {
  for (const topic of topics) {
    for (const node of topic.nodes) {
      if (matchesSmartFolderFilter(node, topic, filter)) {
        return { topicId: topic.id, nodeId: node.id };
      }
    }
  }
  return null;
}
