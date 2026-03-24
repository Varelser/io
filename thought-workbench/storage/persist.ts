import type { AppState } from "../types";
import { STORAGE_KEY, STORAGE_BACKUP_KEY } from "../constants/defaults";
import { normalizeState } from "../normalize/state";
import { createFallbackAppState } from "../normalize/state";
import { safeReadStorage, safeWriteStorage } from "./read-write";
import { createPersistEnvelope, parsePersistEnvelope } from "./envelope";

export function loadStateFromStorage(): AppState {
  const primary = parsePersistEnvelope(safeReadStorage(STORAGE_KEY));
  if (primary) return primary.state;

  const backup = parsePersistEnvelope(safeReadStorage(STORAGE_BACKUP_KEY));
  if (backup) return backup.state;

  const legacy = safeReadStorage(STORAGE_KEY);
  if (legacy) {
    try {
      return normalizeState(JSON.parse(legacy));
    } catch {}
  }

  return createFallbackAppState();
}

export function persistState(state: AppState): boolean {
  const next = JSON.stringify(createPersistEnvelope(state));
  const current = safeReadStorage(STORAGE_KEY);
  if (current) safeWriteStorage(STORAGE_BACKUP_KEY, current);
  return safeWriteStorage(STORAGE_KEY, next);
}
