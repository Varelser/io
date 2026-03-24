import type { AppState, PersistEnvelope } from "../types";
import { CURRENT_PERSIST_VERSION, parsePersistEnvelopeValue, prepareStateForPersistence } from "./migration";

export function createPersistEnvelope(state: AppState): PersistEnvelope {
  return {
    version: CURRENT_PERSIST_VERSION,
    savedAt: new Date().toISOString(),
    state: prepareStateForPersistence(state),
  };
}

export function parsePersistEnvelope(raw: string | null): PersistEnvelope | null {
  if (!raw) return null;
  try {
    return parsePersistEnvelopeValue(JSON.parse(raw));
  } catch {
    return null;
  }
}
