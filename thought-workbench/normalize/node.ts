import type { NodeItem, NodeTask, ObserverMeta, ConfidenceLogEntry } from "../types";
import { HYPOTHESIS_STAGES, KNOWLEDGE_PHASES, MEMBERSHIP_STATUSES, EVIDENCE_BASES, MATERIAL_STATUSES } from "../types";
import { newId } from "../utils/id";
import { derivePublicationState, normalizeIntakeStatus, normalizePublicationState, normalizeReviewState, normalizeUrlState, normalizeVersionState, normalizeWorkStatus } from "../utils/state-model";

function normalizeNodeTask(task: Partial<NodeTask> | null | undefined): NodeTask | undefined {
  if (!task) return undefined;
  const status = ["todo", "doing", "done", "archived"].includes(task.status as string) ? task.status as NodeTask["status"] : "todo";
  return {
    status,
    deadline: typeof task.deadline === "string" ? task.deadline : undefined,
    priority: typeof task.priority === "number" ? task.priority : undefined,
  };
}

function normalizeObserverMeta(obs: Partial<ObserverMeta> | null | undefined): ObserverMeta | undefined {
  if (!obs || typeof obs !== "object") return undefined;
  const viewpoint = typeof obs.viewpoint === "string" ? obs.viewpoint : undefined;
  const role = typeof obs.role === "string" ? obs.role : undefined;
  const reEvaluation = typeof obs.reEvaluation === "string" ? obs.reEvaluation : undefined;
  if (!viewpoint && !role && !reEvaluation) return undefined;
  return { viewpoint, role, reEvaluation };
}

function isValidConfidenceLogEntry(entry: unknown): entry is ConfidenceLogEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  return typeof e.date === "string" && typeof e.value === "number" && typeof e.reason === "string";
}

function normalizeConfidenceLog(log: unknown): ConfidenceLogEntry[] | undefined {
  if (!Array.isArray(log)) return undefined;
  const filtered = log.filter(isValidConfidenceLogEntry);
  return filtered.length > 0 ? filtered : undefined;
}

function normalizeExtensions(ext: unknown): Record<string, Record<string, unknown>> | undefined {
  if (!ext || typeof ext !== "object" || Array.isArray(ext)) return undefined;
  // Shallow validation: ensure it's an object of objects
  const result: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(ext as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = value as Record<string, unknown>;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeNodeItem(node: Partial<NodeItem> | null | undefined, nodeIndex: number): NodeItem {
  const now = new Date().toISOString();
  return {
    id: node?.id || newId("node"),
    label: node?.label || `node ${nodeIndex + 1}`,
    type: node?.type || "主張",
    tense: node?.tense || "現在",
    position: Array.isArray(node?.position) && node.position.length === 3 ? node.position as [number, number, number] : [0, 0, 0],
    note: node?.note || "",
    size: typeof node?.size === "number" ? node.size : 0.6,
    frameScale: typeof node?.frameScale === "number" ? node.frameScale : 1,
    group: node?.group || "default",
    layer: node?.layer || "default",
    depth: typeof node?.depth === "number" ? node.depth : undefined,
    confidence: typeof node?.confidence === "number" ? node.confidence : undefined,
    tags: Array.isArray(node?.tags) ? node.tags.filter((t): t is string => typeof t === "string") : undefined,
    sharedId: typeof node?.sharedId === "string" ? node.sharedId : undefined,
    counterArgumentNodeIds: Array.isArray(node?.counterArgumentNodeIds)
      ? node.counterArgumentNodeIds.filter((id): id is string => typeof id === "string")
      : undefined,
    linkedUrls: Array.isArray(node?.linkedUrls) ? node.linkedUrls : undefined,
    task: normalizeNodeTask(node?.task),
    createdAt: typeof node?.createdAt === "string" ? node.createdAt : now,
    updatedAt: typeof node?.updatedAt === "string" ? node.updatedAt : now,

    // Theory-derived properties
    observer: normalizeObserverMeta(node?.observer),
    hypothesisStage: (HYPOTHESIS_STAGES as readonly string[]).includes(node?.hypothesisStage as string) ? node!.hypothesisStage : undefined,
    confidenceLog: normalizeConfidenceLog(node?.confidenceLog),
    knowledgePhase: (KNOWLEDGE_PHASES as readonly string[]).includes(node?.knowledgePhase as string) ? node!.knowledgePhase : undefined,
    membershipStatus: (MEMBERSHIP_STATUSES as readonly string[]).includes(node?.membershipStatus as string) ? node!.membershipStatus : undefined,

    // Intake / Workflow Layer
    intakeStatus: normalizeIntakeStatus(node?.intakeStatus),
    workStatus: normalizeWorkStatus(node?.workStatus),
    evidenceBasis: (EVIDENCE_BASES as readonly string[]).includes(node?.evidenceBasis as string) ? node!.evidenceBasis : undefined,
    versionState: normalizeVersionState(node?.versionState),
    materialStatus: (MATERIAL_STATUSES as readonly string[]).includes(node?.materialStatus as string) ? node!.materialStatus : undefined,
    reviewState: normalizeReviewState((node as Partial<NodeItem>)?.reviewState),
    publicationState: normalizePublicationState((node as Partial<NodeItem>)?.publicationState)
      ?? derivePublicationState({
        workStatus: normalizeWorkStatus(node?.workStatus),
        versionState: normalizeVersionState(node?.versionState),
      }),
    urlState: normalizeUrlState((node as Partial<NodeItem>)?.urlState),

    // Management Method Layer
    extensions: normalizeExtensions(node?.extensions),
  };
}
