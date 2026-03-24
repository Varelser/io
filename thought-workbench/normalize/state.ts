import type { AppState, JournalEntry, VocabTerm } from "../types";
import type { Material } from "../types/material";
import type { Snapshot } from "../types/snapshot";
import { MATERIAL_TYPES } from "../types/material";
import { MATERIAL_STATUSES } from "../types/node";
import { deepClone } from "../utils/clone";
import { INITIAL_STATE } from "../constants/initial-state";
import { normalizeTopicItem } from "./topic";
import { normalizeTopicLinks } from "./topic-links";
import { newId } from "../utils/id";

function normalizeJournalEntry(entry: Partial<JournalEntry> | null | undefined): JournalEntry | null {
  if (!entry || typeof entry.date !== "string") return null;
  const now = new Date().toISOString();
  return {
    id: entry.id || newId("journal"),
    date: entry.date,
    body: entry.body || "",
    linkedNodeIds: Array.isArray(entry.linkedNodeIds) ? entry.linkedNodeIds : [],
    linkedTopicIds: Array.isArray(entry.linkedTopicIds) ? entry.linkedTopicIds : [],
    mood: typeof entry.mood === "string" ? entry.mood : undefined,
    tags: Array.isArray(entry.tags) ? entry.tags.filter((t): t is string => typeof t === "string") : [],
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : now,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : now,
  };
}

function normalizeJournals(journals: unknown): JournalEntry[] {
  if (!Array.isArray(journals)) return [];
  return journals.map((e) => normalizeJournalEntry(e)).filter((e): e is JournalEntry => e !== null);
}

function normalizeVocabTerm(entry: unknown): VocabTerm | null {
  if (!entry || typeof (entry as any).label !== "string") return null;
  const e = entry as any;
  return {
    id: typeof e.id === "string" ? e.id : newId("vocab"),
    label: e.label,
    altLabels: Array.isArray(e.altLabels) ? e.altLabels.filter((s: unknown): s is string => typeof s === "string") : undefined,
    broader: Array.isArray(e.broader) ? e.broader.filter((s: unknown): s is string => typeof s === "string") : undefined,
    related: Array.isArray(e.related) ? e.related.filter((s: unknown): s is string => typeof s === "string") : undefined,
    scopeNote: typeof e.scopeNote === "string" ? e.scopeNote : undefined,
    classNumber: typeof e.classNumber === "string" ? e.classNumber : undefined,
  };
}

function normalizeMaterial(entry: unknown): Material | null {
  if (!entry || typeof (entry as any).label !== "string") return null;
  const e = entry as any;
  const now = new Date().toISOString();
  return {
    id: typeof e.id === "string" ? e.id : newId("mat"),
    label: e.label,
    type: MATERIAL_TYPES.includes(e.type) ? e.type : "other",
    status: MATERIAL_STATUSES.includes(e.status) ? e.status : "unread",
    url: typeof e.url === "string" ? e.url : undefined,
    note: typeof e.note === "string" ? e.note : undefined,
    linkedNodeIds: Array.isArray(e.linkedNodeIds) ? e.linkedNodeIds : undefined,
    topicId: typeof e.topicId === "string" ? e.topicId : undefined,
    createdAt: typeof e.createdAt === "string" ? e.createdAt : now,
    updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : undefined,
  };
}

function normalizeSnapshot(entry: unknown): Snapshot | null {
  if (!entry || typeof (entry as any).label !== "string" || typeof (entry as any).createdAt !== "string") return null;
  const e = entry as any;
  const SCOPES = ["topic", "workspace", "selection"] as const;
  const TRIGGERS = ["manual", "branch", "integrity", "import"] as const;
  return {
    id: typeof e.id === "string" ? e.id : newId("snap"),
    label: e.label,
    scope: SCOPES.includes(e.scope) ? e.scope : "workspace",
    triggeredBy: TRIGGERS.includes(e.triggeredBy) ? e.triggeredBy : "manual",
    topicId: typeof e.topicId === "string" ? e.topicId : undefined,
    selectionSetId: typeof e.selectionSetId === "string" ? e.selectionSetId : undefined,
    branchId: typeof e.branchId === "string" ? e.branchId : undefined,
    anchorEventId: typeof e.anchorEventId === "string" ? e.anchorEventId : undefined,
    stateHash: typeof e.stateHash === "string" ? e.stateHash : undefined,
    note: typeof e.note === "string" ? e.note : undefined,
    createdAt: e.createdAt,
  };
}

export function normalizeState(input: AppState | null | undefined): AppState {
  if (!input || !Array.isArray(input.topics)) {
    return createFallbackAppState();
  }

  const topicLinks = Array.isArray(input.topicLinks) ? input.topicLinks : [];
  const topics = input.topics.map((topic, index) => normalizeTopicItem(topic, index));
  const validTopicIds = new Set(topics.map((topic) => topic.id));
  const normalizedTopicLinks = normalizeTopicLinks(topicLinks, validTopicIds);
  const journals = normalizeJournals((input as any).journals);

  const managementMethods = Array.isArray((input as any).managementMethods) ? (input as any).managementMethods : undefined;
  const eventLog = Array.isArray((input as any).eventLog) ? (input as any).eventLog : undefined;

  const bookmarks = Array.isArray((input as any).bookmarks) ? (input as any).bookmarks : [];
  const layoutPresets = Array.isArray((input as any).layoutPresets) ? (input as any).layoutPresets : [];
  const smartFolders = Array.isArray((input as any).smartFolders) ? (input as any).smartFolders : undefined;
  const conversionQueue = Array.isArray((input as any).conversionQueue) ? (input as any).conversionQueue : undefined;
  const bundles = Array.isArray((input as any).bundles) ? (input as any).bundles : undefined;
  const scenarioBranches = Array.isArray((input as any).scenarioBranches) ? (input as any).scenarioBranches : [];
  const nodeSelectionSets = Array.isArray((input as any).nodeSelectionSets) ? (input as any).nodeSelectionSets : [];
  const urlRecords = Array.isArray((input as any).urlRecords) ? (input as any).urlRecords : undefined;
  const vocabulary = Array.isArray((input as any).vocabulary)
    ? (input as any).vocabulary.map(normalizeVocabTerm).filter((v: VocabTerm | null): v is VocabTerm => v !== null)
    : undefined;
  const materials = Array.isArray((input as any).materials)
    ? (input as any).materials.map(normalizeMaterial).filter((m: Material | null): m is Material => m !== null)
    : undefined;
  const snapshots = Array.isArray((input as any).snapshots)
    ? (input as any).snapshots.map(normalizeSnapshot).filter((s: Snapshot | null): s is Snapshot => s !== null)
    : undefined;
  const currentBundleId = typeof (input as any).currentBundleId === "string" ? (input as any).currentBundleId : undefined;
  const currentViewContext = (input as any).currentViewContext || undefined;

  return { topics, topicLinks: normalizedTopicLinks, journals, managementMethods, eventLog, bookmarks, layoutPresets, smartFolders, conversionQueue, bundles, scenarioBranches, nodeSelectionSets, urlRecords, vocabulary, materials, snapshots, currentBundleId, currentViewContext };
}

export function createFallbackAppState(): AppState {
  return deepClone(INITIAL_STATE);
}
