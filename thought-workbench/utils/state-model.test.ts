import { describe, expect, it } from "vitest";
import {
  derivePublicationState,
  getCanonicalIntakeStatus,
  getCanonicalVersionState,
  getCanonicalWorkStatus,
  getIntakeStatusLabel,
  getWorkStatusLabel,
  matchesIntakeStatus,
  matchesWorkStatus,
  normalizeIntakeStatus,
  normalizeVersionState,
  normalizeWorkStatus,
} from "./state-model";

describe("state-model", () => {
  it("canonical and legacy aliases normalize to canonical runtime values", () => {
    expect(normalizeIntakeStatus("structured")).toBe("structured");
    expect(normalizeIntakeStatus("placed")).toBe("structured");
    expect(normalizeWorkStatus("active")).toBe("active");
    expect(normalizeWorkStatus("organizing")).toBe("active");
    expect(normalizeWorkStatus("onHold")).toBe("onHold");
    expect(normalizeWorkStatus("hold")).toBe("onHold");
    expect(normalizeVersionState("working")).toBe("working");
    expect(normalizeVersionState("draft")).toBe("working");
    expect(normalizeVersionState("snapshotted")).toBe("snapshotted");
    expect(normalizeVersionState("comparison")).toBe("snapshotted");
  });

  it("returns canonical display values for legacy runtime states", () => {
    expect(getCanonicalIntakeStatus("placed")).toBe("structured");
    expect(getCanonicalWorkStatus("organizing")).toBe("active");
    expect(getCanonicalVersionState("comparison")).toBe("snapshotted");
  });

  it("matches smart-folder filters across canonical and legacy aliases", () => {
    expect(matchesIntakeStatus("placed", "structured")).toBe(true);
    expect(matchesWorkStatus("organizing", "active")).toBe(true);
    expect(matchesWorkStatus("hold", "onHold")).toBe(true);
  });

  it("produces localized labels for canonical states", () => {
    expect(getIntakeStatusLabel("structured", "ja")).toBe("構造化済");
    expect(getWorkStatusLabel("active", "en")).toBe("Active");
  });

  it("derives publication state from the version field (published moved to publicationState layer)", () => {
    expect(derivePublicationState({ workStatus: "done", versionState: "versioned" })).toBe("published");
    expect(derivePublicationState({ workStatus: "done", versionState: "working" })).toBeUndefined();
    expect(derivePublicationState({ workStatus: "frozen", versionState: undefined })).toBeUndefined();
  });
});
