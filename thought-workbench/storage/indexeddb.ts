import type { AppState } from "../types";
import { normalizeState } from "../normalize/state";
import { createFallbackAppState } from "../normalize/state";
import { createPersistEnvelope } from "./envelope";
import { parsePersistEnvelopeValue } from "./migration";

const DB_NAME = "thought-workbench";
const DB_VERSION = 1;
const STORE_NAME = "state";
const STATE_KEY = "app-state";
const BACKUP_KEY = "app-state-backup";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromStore(db: IDBDatabase, key: string): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function putToStore(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB が利用可能か判定 */
export function canUseIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

/** IndexedDB からアプリ状態を読み込む */
export async function loadStateFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await openDB();
    const raw = await getFromStore(db, STATE_KEY);
    db.close();
    const envelope = parsePersistEnvelopeValue(raw);
    if (envelope) {
      return envelope.state;
    }
    if (raw && typeof raw === "object") {
      return normalizeState(raw as AppState);
    }
    return null;
  } catch (e) {
    console.warn("[thought-workbench] IndexedDB load failed:", e);
    return null;
  }
}

/** IndexedDB にアプリ状態を保存する（バックアップ付き） */
export async function persistStateToIndexedDB(state: AppState): Promise<boolean> {
  try {
    const db = await openDB();
    // 現在の状態をバックアップとして保存
    const current = await getFromStore(db, STATE_KEY);
    if (current) {
      await putToStore(db, BACKUP_KEY, current);
    }
    await putToStore(db, STATE_KEY, createPersistEnvelope(state));
    db.close();
    return true;
  } catch (e) {
    console.warn("[thought-workbench] IndexedDB persist failed:", e);
    return false;
  }
}

/** IndexedDB のバックアップから復旧 */
export async function loadBackupFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await openDB();
    const raw = await getFromStore(db, BACKUP_KEY);
    db.close();
    const envelope = parsePersistEnvelopeValue(raw);
    if (envelope) {
      return envelope.state;
    }
    if (raw && typeof raw === "object") {
      return normalizeState(raw as AppState);
    }
    return null;
  } catch {
    return null;
  }
}

/** IndexedDB と localStorage の両方に保存するデュアルライトアダプタ */
export async function dualPersist(
  state: AppState,
  localStoragePersist: (state: AppState) => boolean,
): Promise<boolean> {
  // localStorage に書き込み（既存の同期パス）
  const lsOk = localStoragePersist(state);

  // IndexedDB に非同期書き込み（localStorage が容量超過でも IndexedDB は成功する可能性）
  if (canUseIndexedDB()) {
    const idbOk = await persistStateToIndexedDB(state);
    // どちらかが成功すれば OK
    return lsOk || idbOk;
  }

  return lsOk;
}

/** IndexedDB から PersistEnvelope ごと読み込む（savedAt 比較用） */
export async function loadEnvelopeFromIndexedDB(): Promise<import("../types").PersistEnvelope | null> {
  try {
    const db = await openDB();
    const raw = await getFromStore(db, STATE_KEY);
    db.close();
    return parsePersistEnvelopeValue(raw);
  } catch {
    return null;
  }
}

/** 起動時のローダー: IDB と localStorage の savedAt を比較して新しい方を使用 */
export async function loadStateWithFallback(
  localStorageLoader: () => AppState,
  localStorageEnvelopeLoader: () => import("../types").PersistEnvelope | null,
): Promise<AppState> {
  const lsEnvelope = localStorageEnvelopeLoader();

  if (canUseIndexedDB()) {
    const idbEnvelope = await loadEnvelopeFromIndexedDB();
    if (idbEnvelope) {
      // どちらも有効なら savedAt で新しい方を採用
      if (!lsEnvelope) return idbEnvelope.state;
      const idbTime = new Date(idbEnvelope.savedAt).getTime();
      const lsTime = new Date(lsEnvelope.savedAt).getTime();
      return idbTime >= lsTime ? idbEnvelope.state : lsEnvelope.state;
    }
  }

  return lsEnvelope ? lsEnvelope.state : localStorageLoader();
}
