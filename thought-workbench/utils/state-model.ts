import type { NodeItem } from "../types";

export const REVIEW_STATES = ["none", "queued", "inReview", "reviewed", "needsFollowUp"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const PUBLICATION_STATES = ["private", "internal", "publishReady", "published", "deprecated"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const URL_STATES = ["unverified", "verified", "broken", "duplicated", "archived"] as const;
export type UrlState = (typeof URL_STATES)[number];
type Lang = "ja" | "en";

const INTAKE_ALIASES: Record<string, NonNullable<NodeItem["intakeStatus"]>> = {
  inbox: "inbox",
  staging: "staging",
  structured: "structured",
  placed: "structured",
  archive: "archive",
  archived: "archive",
};

const WORK_ALIASES: Record<string, NonNullable<NodeItem["workStatus"]>> = {
  active: "active",
  organizing: "active",
  review: "review",
  onhold: "onHold",
  hold: "onHold",
  "on-hold": "onHold",
  done: "done",
  // "published" は publicationState 層へ移管。旧データは "done" に正規化する。
  published: "done",
  frozen: "frozen",
  unprocessed: "unprocessed",
};

const VERSION_ALIASES: Record<string, NonNullable<NodeItem["versionState"]>> = {
  working: "working",
  draft: "working",
  snapshotted: "snapshotted",
  comparison: "snapshotted",
  versioned: "versioned",
  published: "versioned",
  archived: "archived",
  frozen: "archived",
};

const INTAKE_DISPLAY: Record<NonNullable<NodeItem["intakeStatus"]>, { canonical: string; label: Record<Lang, string> }> = {
  inbox: { canonical: "inbox", label: { ja: "インボックス", en: "Inbox" } },
  staging: { canonical: "staging", label: { ja: "ステージング", en: "Staging" } },
  structured: { canonical: "structured", label: { ja: "構造化済", en: "Structured" } },
  archive: { canonical: "archive", label: { ja: "アーカイブ", en: "Archive" } },
};

const WORK_DISPLAY: Record<NonNullable<NodeItem["workStatus"]>, { canonical: string; label: Record<Lang, string> }> = {
  unprocessed: { canonical: "unprocessed", label: { ja: "未処理", en: "Unprocessed" } },
  active: { canonical: "active", label: { ja: "アクティブ", en: "Active" } },
  review: { canonical: "review", label: { ja: "要レビュー", en: "Review" } },
  onHold: { canonical: "onHold", label: { ja: "保留", en: "On Hold" } },
  done: { canonical: "done", label: { ja: "完了", en: "Done" } },
  frozen: { canonical: "frozen", label: { ja: "凍結", en: "Frozen" } },
};

const VERSION_DISPLAY: Record<NonNullable<NodeItem["versionState"]>, { canonical: string; label: Record<Lang, string> }> = {
  working: { canonical: "working", label: { ja: "作業版", en: "Working" } },
  snapshotted: { canonical: "snapshotted", label: { ja: "スナップショット", en: "Snapshotted" } },
  versioned: { canonical: "versioned", label: { ja: "バージョン化", en: "Versioned" } },
  archived: { canonical: "archived", label: { ja: "アーカイブ版", en: "Archived" } },
};

const REVIEW_LABELS: Record<ReviewState, Record<Lang, string>> = {
  none: { ja: "なし", en: "None" },
  queued: { ja: "予定", en: "Queued" },
  inReview: { ja: "レビュー中", en: "In Review" },
  reviewed: { ja: "レビュー済", en: "Reviewed" },
  needsFollowUp: { ja: "要追跡", en: "Needs Follow-up" },
};

const PUBLICATION_LABELS: Record<PublicationState, Record<Lang, string>> = {
  private: { ja: "非公開", en: "Private" },
  internal: { ja: "内部", en: "Internal" },
  publishReady: { ja: "公開準備", en: "Publish Ready" },
  published: { ja: "公開済", en: "Published" },
  deprecated: { ja: "非推奨", en: "Deprecated" },
};

const URL_LABELS: Record<UrlState, Record<Lang, string>> = {
  unverified: { ja: "未確認", en: "Unverified" },
  verified: { ja: "確認済", en: "Verified" },
  broken: { ja: "リンク切れ", en: "Broken" },
  duplicated: { ja: "重複", en: "Duplicated" },
  archived: { ja: "アーカイブ", en: "Archived" },
};

export function normalizeIntakeStatus(value: unknown): NodeItem["intakeStatus"] | undefined {
  if (typeof value !== "string") return undefined;
  return INTAKE_ALIASES[value.trim().toLowerCase()] || undefined;
}

export function normalizeWorkStatus(value: unknown): NodeItem["workStatus"] | undefined {
  if (typeof value !== "string") return undefined;
  return WORK_ALIASES[value.trim().toLowerCase()] || undefined;
}

export function normalizeVersionState(value: unknown): NodeItem["versionState"] | undefined {
  if (typeof value !== "string") return undefined;
  return VERSION_ALIASES[value.trim().toLowerCase()] || undefined;
}

export function normalizeReviewState(value: unknown): ReviewState | undefined {
  if (typeof value !== "string") return undefined;
  return (REVIEW_STATES as readonly string[]).includes(value.trim()) ? value.trim() as ReviewState : undefined;
}

export function normalizePublicationState(value: unknown): PublicationState | undefined {
  if (typeof value !== "string") return undefined;
  return (PUBLICATION_STATES as readonly string[]).includes(value.trim()) ? value.trim() as PublicationState : undefined;
}

export function normalizeUrlState(value: unknown): UrlState | undefined {
  if (typeof value !== "string") return undefined;
  return (URL_STATES as readonly string[]).includes(value.trim()) ? value.trim() as UrlState : undefined;
}

export function derivePublicationState(node: Pick<NodeItem, "workStatus" | "versionState">): PublicationState | undefined {
  if (node.versionState === "versioned") return "published";
  return undefined;
}

export function getCanonicalIntakeStatus(value: unknown): string | undefined {
  const normalized = normalizeIntakeStatus(value);
  return normalized ? INTAKE_DISPLAY[normalized].canonical : undefined;
}

export function getCanonicalWorkStatus(value: unknown): string | undefined {
  const normalized = normalizeWorkStatus(value);
  return normalized ? WORK_DISPLAY[normalized].canonical : undefined;
}

export function getCanonicalVersionState(value: unknown): string | undefined {
  const normalized = normalizeVersionState(value);
  return normalized ? VERSION_DISPLAY[normalized].canonical : undefined;
}

export function getIntakeStatusLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizeIntakeStatus(value);
  return normalized ? INTAKE_DISPLAY[normalized].label[lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function getWorkStatusLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizeWorkStatus(value);
  return normalized ? WORK_DISPLAY[normalized].label[lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function getVersionStateLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizeVersionState(value);
  return normalized ? VERSION_DISPLAY[normalized].label[lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function getReviewStateLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizeReviewState(value);
  return normalized ? REVIEW_LABELS[normalized][lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function getPublicationStateLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizePublicationState(value);
  return normalized ? PUBLICATION_LABELS[normalized][lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function getUrlStateLabel(value: unknown, lang: Lang = "en"): string {
  const normalized = normalizeUrlState(value);
  return normalized ? URL_LABELS[normalized][lang] : typeof value === "string" && value.trim() ? value.trim() : "-";
}

export function matchesIntakeStatus(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeIntakeStatus(expected);
  if (!normalizedExpected) return false;
  return normalizeIntakeStatus(actual) === normalizedExpected;
}

export function matchesWorkStatus(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeWorkStatus(expected);
  if (!normalizedExpected) return false;
  return normalizeWorkStatus(actual) === normalizedExpected;
}

export function matchesVersionState(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeVersionState(expected);
  if (!normalizedExpected) return false;
  return normalizeVersionState(actual) === normalizedExpected;
}

export function matchesReviewState(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeReviewState(expected);
  if (!normalizedExpected) return false;
  return normalizeReviewState(actual) === normalizedExpected;
}

export function matchesPublicationState(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizePublicationState(expected);
  if (!normalizedExpected) return false;
  return normalizePublicationState(actual) === normalizedExpected;
}

export function matchesUrlState(actual: unknown, expected: unknown): boolean {
  const normalizedExpected = normalizeUrlState(expected);
  if (!normalizedExpected) return false;
  return normalizeUrlState(actual) === normalizedExpected;
}
