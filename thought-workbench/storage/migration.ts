import type { AppState, PersistEnvelope } from "../types";
import { APP_VERSION } from "../constants/defaults";
import { normalizeState } from "../normalize/state";
import { deepClone } from "../utils/clone";
import { canonicalizeRelationType } from "../utils/relation-model";
import {
  derivePublicationState,
  getCanonicalIntakeStatus,
  getCanonicalVersionState,
  getCanonicalWorkStatus,
  normalizePublicationState,
  normalizeReviewState,
  normalizeUrlState,
} from "../utils/state-model";

export const CURRENT_PERSIST_VERSION = APP_VERSION;

function migrateNodeRecord(node: Record<string, unknown>) {
  const next = { ...node };

  if (typeof next.intakeStatus === "string") {
    next.intakeStatus = getCanonicalIntakeStatus(next.intakeStatus) ?? next.intakeStatus;
  }
  if (typeof next.workStatus === "string") {
    next.workStatus = getCanonicalWorkStatus(next.workStatus) ?? next.workStatus;
  }
  if (typeof next.versionState === "string") {
    next.versionState = getCanonicalVersionState(next.versionState) ?? next.versionState;
  }
  if (typeof next.reviewState === "string") {
    next.reviewState = normalizeReviewState(next.reviewState) ?? next.reviewState;
  }
  if (typeof next.publicationState === "string") {
    next.publicationState = normalizePublicationState(next.publicationState) ?? next.publicationState;
  }
  if (typeof next.urlState === "string") {
    next.urlState = normalizeUrlState(next.urlState) ?? next.urlState;
  }
  if (!next.publicationState) {
    const derived = derivePublicationState({
      workStatus: typeof next.workStatus === "string" ? next.workStatus as any : undefined,
      versionState: typeof next.versionState === "string" ? next.versionState as any : undefined,
    });
    if (derived) next.publicationState = derived;
  }

  return next;
}

function migrateStateShape(input: Record<string, unknown>) {
  const next = { ...input };

  if (Array.isArray(next.topics)) {
    next.topics = next.topics.map((topic) => {
      if (!topic || typeof topic !== "object") return topic;
      const topicRecord = { ...(topic as Record<string, unknown>) };
      if (Array.isArray(topicRecord.nodes)) {
        topicRecord.nodes = topicRecord.nodes.map((node) => {
          if (!node || typeof node !== "object") return node;
          return migrateNodeRecord(node as Record<string, unknown>);
        });
      }
      if (Array.isArray(topicRecord.edges)) {
        topicRecord.edges = topicRecord.edges.map((edge) => {
          if (!edge || typeof edge !== "object") return edge;
          const edgeRecord = { ...(edge as Record<string, unknown>) };
          edgeRecord.relation = canonicalizeRelationType(edgeRecord.relation, "references");
          return edgeRecord;
        });
      }
      if (Array.isArray(topicRecord.unresolvedTopicLinks)) {
        topicRecord.unresolvedTopicLinks = topicRecord.unresolvedTopicLinks.map((link) => {
          if (!link || typeof link !== "object") return link;
          const linkRecord = { ...(link as Record<string, unknown>) };
          if ("relation" in linkRecord) {
            linkRecord.relation = canonicalizeRelationType(linkRecord.relation, "relatedTo");
          }
          return linkRecord;
        });
      }
      return topicRecord;
    });
  }

  if (Array.isArray(next.topicLinks)) {
    next.topicLinks = next.topicLinks.map((link) => {
      if (!link || typeof link !== "object") return link;
      const linkRecord = { ...(link as Record<string, unknown>) };
      linkRecord.relation = canonicalizeRelationType(linkRecord.relation, "relatedTo");
      return linkRecord;
    });
  }

  if (Array.isArray(next.smartFolders)) {
    next.smartFolders = next.smartFolders.map((folder) => {
      if (!folder || typeof folder !== "object") return folder;
      const folderRecord = { ...(folder as Record<string, unknown>) };
      if (folderRecord.filter && typeof folderRecord.filter === "object" && !Array.isArray(folderRecord.filter)) {
        const filter = { ...(folderRecord.filter as Record<string, unknown>) };
        if (typeof filter.intakeStatus === "string") {
          filter.intakeStatus = getCanonicalIntakeStatus(filter.intakeStatus) ?? filter.intakeStatus;
        }
        if (typeof filter.workStatus === "string") {
          filter.workStatus = getCanonicalWorkStatus(filter.workStatus) ?? filter.workStatus;
        }
        if (typeof filter.versionState === "string") {
          filter.versionState = getCanonicalVersionState(filter.versionState) ?? filter.versionState;
        }
        if (typeof filter.reviewState === "string") {
          filter.reviewState = normalizeReviewState(filter.reviewState) ?? filter.reviewState;
        }
        if (typeof filter.publicationState === "string") {
          filter.publicationState = normalizePublicationState(filter.publicationState) ?? filter.publicationState;
        }
        if (typeof filter.urlState === "string") {
          filter.urlState = normalizeUrlState(filter.urlState) ?? filter.urlState;
        }
        folderRecord.filter = filter;
      }
      return folderRecord;
    });
  }

  return next;
}

export function prepareStateForPersistence(state: AppState): AppState {
  return migrateStateShape(deepClone(state) as Record<string, unknown>) as AppState;
}

export function migratePersistedState(state: unknown, version = 0): AppState {
  if (!state || typeof state !== "object") {
    return normalizeState(null);
  }

  let working = deepClone(state as Record<string, unknown>) as Record<string, unknown>;
  if (version < CURRENT_PERSIST_VERSION) {
    working = migrateStateShape(working);
  }
  return normalizeState(working as AppState);
}

export function parsePersistEnvelopeValue(raw: unknown): PersistEnvelope | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  if (!("state" in parsed)) return null;

  const version = typeof parsed.version === "number" ? parsed.version : 0;
  const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : "";
  const state = migratePersistedState(parsed.state, version);

  return {
    version: CURRENT_PERSIST_VERSION,
    savedAt,
    state,
  };
}
