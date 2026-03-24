import type { NodeItem, TopicItem } from "../types";
import {
  getCanonicalIntakeStatus,
  getCanonicalVersionState,
  getCanonicalWorkStatus,
  matchesIntakeStatus,
  matchesPublicationState,
  matchesReviewState,
  matchesUrlState,
  matchesVersionState,
  matchesWorkStatus,
} from "./state-model";

/**
 * Simple query DSL for cross-topic node search.
 *
 * Syntax:
 *   type:concept                → node.type === "concept"
 *   layer:d1                   → node.layer === "d1"
 *   group:core                 → node.group === "core"
 *   tag:important              → node.tags includes "important"
 *   tense:現在                  → node.tense === "現在"
 *   intake:structured           → canonical intake status
 *   work:active                 → canonical work status
 *   version:working             → canonical version state
 *   review:inReview             → review state
 *   publication:published       → publication state
 *   url:verified                → URL verification state
 *   confidence:>0.5            → node.confidence > 0.5
 *   size:>0.3                  → node.size > 0.3
 *   has:note                   → node.note is non-empty
 *   has:edges                  → node has edges (requires topic context)
 *   has:urls                   → node.linkedUrls is non-empty
 *   has:task                   → node.task exists
 *   task:todo                  → node.task?.status === "todo"
 *   created:>2024-01-01        → createdAt after date
 *   updated:<2024-06-01        → updatedAt before date
 *   topic:球体名               → only in matching topic
 *   ext:methodId.key=value     → extensions match
 *   hypothesis:supported       → node.extensions.*.hypothesisStage === "supported"
 *   phase:externalization      → node.extensions.*.knowledgePhase === "externalization"
 *   member:active              → node.extensions.*.membershipStatus === "active"
 *   observer:role_value        → node.extensions.*.observer.role contains value
 *   "free text"                → label or note contains text (case-insensitive)
 *   -type:concept              → NOT type:concept
 *   term1 AND term2            → both match
 *   term1 OR term2             → either matches
 *   (default is AND)
 */

export type QueryResult = {
  topicId: string;
  topicTitle: string;
  node: NodeItem;
  matchReasons: string[];
};

type Predicate = (node: NodeItem, topic: TopicItem) => string | null; // returns match reason or null

function parseComparison(op: string): { operator: ">" | "<" | ">=" | "<=" | "="; value: number } | null {
  const m = op.match(/^([><]=?|=)?(.+)$/);
  if (!m) return null;
  const operator = (m[1] || "=") as ">" | "<" | ">=" | "<=" | "=";
  const value = parseFloat(m[2]);
  if (isNaN(value)) return null;
  return { operator, value };
}

function compareTo(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case ">": return actual > target;
    case "<": return actual < target;
    case ">=": return actual >= target;
    case "<=": return actual <= target;
    case "=": return actual === target;
    default: return false;
  }
}

function parseDateComparison(op: string): { operator: ">" | "<"; date: string } | null {
  const m = op.match(/^([><])(.+)$/);
  if (!m) return null;
  return { operator: m[1] as ">" | "<", date: m[2] };
}

function parseToken(raw: string): { negate: boolean; predicate: Predicate } {
  let token = raw.trim();
  let negate = false;
  if (token.startsWith("-")) {
    negate = true;
    token = token.slice(1);
  }

  // Remove quotes for free-text
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    const text = token.slice(1, -1).toLowerCase();
    return {
      negate,
      predicate: (n) => {
        if (n.label.toLowerCase().includes(text)) return `label contains "${text}"`;
        if (n.note?.toLowerCase().includes(text)) return `note contains "${text}"`;
        return null;
      },
    };
  }

  const colonIdx = token.indexOf(":");
  if (colonIdx === -1) {
    // Free text search
    const text = token.toLowerCase();
    return {
      negate,
      predicate: (n) => {
        if (n.label.toLowerCase().includes(text)) return `label contains "${text}"`;
        if (n.note?.toLowerCase().includes(text)) return `note contains "${text}"`;
        if (n.tags?.some((t) => t.toLowerCase().includes(text))) return `tag matches "${text}"`;
        return null;
      },
    };
  }

  const key = token.slice(0, colonIdx).toLowerCase();
  const val = token.slice(colonIdx + 1);

  switch (key) {
    case "type":
      return { negate, predicate: (n) => n.type === val ? `type=${val}` : null };
    case "layer":
      return { negate, predicate: (n) => n.layer === val ? `layer=${val}` : null };
    case "group":
      return { negate, predicate: (n) => n.group === val ? `group=${val}` : null };
    case "tense":
      return { negate, predicate: (n) => n.tense === val ? `tense=${val}` : null };
    case "intake":
      return { negate, predicate: (n) => matchesIntakeStatus(n.intakeStatus, val) ? `intake=${getCanonicalIntakeStatus(n.intakeStatus) || val}` : null };
    case "work":
      return { negate, predicate: (n) => matchesWorkStatus(n.workStatus, val) ? `work=${getCanonicalWorkStatus(n.workStatus) || val}` : null };
    case "version":
      return { negate, predicate: (n) => matchesVersionState(n.versionState, val) ? `version=${getCanonicalVersionState(n.versionState) || val}` : null };
    case "review":
      return { negate, predicate: (n) => matchesReviewState(n.reviewState, val) ? `review=${val}` : null };
    case "publication":
      return { negate, predicate: (n) => matchesPublicationState(n.publicationState, val) ? `publication=${val}` : null };
    case "url":
      return { negate, predicate: (n) => matchesUrlState(n.urlState, val) ? `url=${val}` : null };
    case "tag":
      return { negate, predicate: (n) => n.tags?.includes(val) ? `tag=${val}` : null };
    case "confidence": {
      const cmp = parseComparison(val);
      if (!cmp) return { negate, predicate: () => null };
      return { negate, predicate: (n) => compareTo(n.confidence ?? 0, cmp.operator, cmp.value) ? `confidence${cmp.operator}${cmp.value}` : null };
    }
    case "size": {
      const cmp = parseComparison(val);
      if (!cmp) return { negate, predicate: () => null };
      return { negate, predicate: (n) => compareTo(n.size ?? 0, cmp.operator, cmp.value) ? `size${cmp.operator}${cmp.value}` : null };
    }
    case "has":
      switch (val) {
        case "note": return { negate, predicate: (n) => n.note && n.note.trim().length > 0 ? "has note" : null };
        case "urls": return { negate, predicate: (n) => n.linkedUrls && n.linkedUrls.length > 0 ? "has urls" : null };
        case "task": return { negate, predicate: (n) => n.task ? "has task" : null };
        case "tags": return { negate, predicate: (n) => n.tags && n.tags.length > 0 ? "has tags" : null };
        case "edges": return { negate, predicate: (n, t) => t.edges.some((e) => e.from === n.id || e.to === n.id) ? "has edges" : null };
        case "extensions": return { negate, predicate: (n) => n.extensions && Object.keys(n.extensions).length > 0 ? "has extensions" : null };
        default: return { negate, predicate: () => null };
      }
    case "task":
      return { negate, predicate: (n) => n.task?.status === val ? `task.status=${val}` : null };
    case "created": {
      const dc = parseDateComparison(val);
      if (!dc) return { negate, predicate: () => null };
      return {
        negate,
        predicate: (n) => {
          if (!n.createdAt) return null;
          const cmp = dc.operator === ">" ? n.createdAt > dc.date : n.createdAt < dc.date;
          return cmp ? `created${dc.operator}${dc.date}` : null;
        },
      };
    }
    case "updated": {
      const dc = parseDateComparison(val);
      if (!dc) return { negate, predicate: () => null };
      return {
        negate,
        predicate: (n) => {
          if (!n.updatedAt) return null;
          const cmp = dc.operator === ">" ? n.updatedAt > dc.date : n.updatedAt < dc.date;
          return cmp ? `updated${dc.operator}${dc.date}` : null;
        },
      };
    }
    case "topic":
      return { negate, predicate: (_n, t) => t.title.includes(val) ? `topic="${t.title}"` : null };
    case "domain":
      return { negate, predicate: (_n, t) => t.domain?.toLowerCase().includes(val.toLowerCase()) ? `domain="${t.domain}"` : null };
    case "ext": {
      // ext:methodId.key=value
      const dotIdx = val.indexOf(".");
      if (dotIdx === -1) return { negate, predicate: () => null };
      const methodId = val.slice(0, dotIdx);
      const rest = val.slice(dotIdx + 1);
      const eqIdx = rest.indexOf("=");
      if (eqIdx === -1) {
        // Just check key exists
        return { negate, predicate: (n) => {
          const ext = n.extensions?.[methodId];
          return ext && rest in ext ? `ext.${methodId}.${rest} exists` : null;
        }};
      }
      const extKey = rest.slice(0, eqIdx);
      const extVal = rest.slice(eqIdx + 1);
      return { negate, predicate: (n) => {
        const ext = n.extensions?.[methodId];
        return ext && String(ext[extKey]) === extVal ? `ext.${methodId}.${extKey}=${extVal}` : null;
      }};
    }
    case "hypothesis": {
      // Search across all extensions for hypothesisStage
      return { negate, predicate: (n) => {
        const exts = n.extensions || {};
        for (const ext of Object.values(exts)) {
          if (ext && typeof ext === "object" && (ext as Record<string, unknown>).hypothesisStage === val) return `hypothesis=${val}`;
        }
        return null;
      }};
    }
    case "phase": {
      // Search across all extensions for knowledgePhase
      return { negate, predicate: (n) => {
        const exts = n.extensions || {};
        for (const ext of Object.values(exts)) {
          if (ext && typeof ext === "object" && (ext as Record<string, unknown>).knowledgePhase === val) return `phase=${val}`;
        }
        return null;
      }};
    }
    case "member": {
      // Search across all extensions for membershipStatus
      return { negate, predicate: (n) => {
        const exts = n.extensions || {};
        for (const ext of Object.values(exts)) {
          if (ext && typeof ext === "object" && (ext as Record<string, unknown>).membershipStatus === val) return `member=${val}`;
        }
        return null;
      }};
    }
    case "observer": {
      // Search across all extensions for observer.role containing val
      return { negate, predicate: (n) => {
        const exts = n.extensions || {};
        for (const ext of Object.values(exts)) {
          if (ext && typeof ext === "object") {
            const obs = (ext as Record<string, unknown>).observer;
            if (obs && typeof obs === "object") {
              const role = String((obs as Record<string, unknown>).role || "").toLowerCase();
              if (role.includes(val.toLowerCase())) return `observer.role contains "${val}"`;
            }
          }
        }
        return null;
      }};
    }
    default:
      // Unknown key, treat as free text
      return { negate, predicate: (n) => n.label.toLowerCase().includes(token.toLowerCase()) ? `contains "${token}"` : null };
  }
}

type Clause = { type: "pred"; negate: boolean; predicate: Predicate } | { type: "or"; left: Clause; right: Clause };

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  for (const ch of query) {
    if (inQuote) {
      current += ch;
      if (ch === quoteChar) {
        inQuote = false;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === " ") {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function parseQuery(query: string): Clause[] {
  const tokens = tokenize(query);
  const clauses: Clause[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].toUpperCase() === "OR" && clauses.length > 0 && i + 1 < tokens.length) {
      const left = clauses.pop()!;
      i++;
      const { negate, predicate } = parseToken(tokens[i]);
      const right: Clause = { type: "pred", negate, predicate };
      clauses.push({ type: "or", left, right });
    } else if (tokens[i].toUpperCase() === "AND") {
      // Skip, AND is default
    } else {
      const { negate, predicate } = parseToken(tokens[i]);
      clauses.push({ type: "pred", negate, predicate });
    }
    i++;
  }
  return clauses;
}

function evaluateClause(clause: Clause, node: NodeItem, topic: TopicItem): string | null {
  if (clause.type === "pred") {
    const result = clause.predicate(node, topic);
    if (clause.negate) return result === null ? "negated match" : null;
    return result;
  }
  // OR
  const leftResult = evaluateClause(clause.left, node, topic);
  if (leftResult) return leftResult;
  return evaluateClause(clause.right, node, topic);
}

export function executeQuery(query: string, topics: TopicItem[], asOf?: string): QueryResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const clauses = parseQuery(trimmed);
  if (clauses.length === 0) return [];

  const results: QueryResult[] = [];

  for (const topic of topics) {
    for (const node of topic.nodes) {
      // asOf: 過去時点再評価 — createdAt がその時点以降のノードを除外
      if (asOf && node.createdAt && node.createdAt > asOf) continue;

      const matchReasons: string[] = [];
      let allMatch = true;

      for (const clause of clauses) {
        const reason = evaluateClause(clause, node, topic);
        if (reason) {
          matchReasons.push(reason);
        } else {
          allMatch = false;
          break;
        }
      }

      if (allMatch && matchReasons.length > 0) {
        results.push({
          topicId: topic.id,
          topicTitle: topic.title,
          node,
          matchReasons,
        });
      }
    }
  }

  return results;
}

/** Query syntax help text */
export const QUERY_HELP = {
  ja: [
    "type:概念  — ノードタイプで検索",
    "layer:d1  — レイヤーで検索",
    "tag:重要  — タグで検索",
    "has:note  — メモありを検索",
    "has:task  — タスクありを検索",
    "has:urls  — URL付きを検索",
    "task:todo — タスク状態で検索",
    "confidence:>0.5 — 確信度で検索",
    "created:>2024-01 — 作成日で検索",
    "topic:球体名 — 球体名で絞込",
    "domain:音楽理論 — 分野で絞込",
    "ext:method.key=val — 拡張で検索",
    "hypothesis:supported — 仮説ステージで検索",
    "phase:externalization — SECI フェーズで検索",
    "member:active — メンバーシップ状態で検索",
    "observer:研究者 — 観測者ロールで検索",
    "-type:概念 — 除外検索（NOT）",
    "A OR B — いずれか一致",
    '"自由文" — ラベル/メモ全文検索',
  ],
  en: [
    "type:concept — search by type",
    "layer:d1 — search by layer",
    "tag:important — search by tag",
    "has:note — has note content",
    "has:task — has task",
    "has:urls — has URLs",
    "task:todo — search task status",
    "confidence:>0.5 — by confidence",
    "created:>2024-01 — by created date",
    "topic:name — filter by topic",
    "domain:music — filter by domain",
    "ext:method.key=val — by extension",
    "hypothesis:supported — by hypothesis stage",
    "phase:externalization — by SECI phase",
    "member:active — by membership status",
    "observer:researcher — by observer role",
    "-type:concept — NOT (exclude)",
    "A OR B — either matches",
    '"free text" — full text search',
  ],
};
