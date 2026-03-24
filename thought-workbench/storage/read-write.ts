import { canUseStorage } from "./can-use";

export function safeReadStorage(key: string) {
  try {
    return canUseStorage() ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeWriteStorage(key: string, value: string): boolean {
  try {
    if (canUseStorage()) {
      window.localStorage.setItem(key, value);
      return true;
    }
    return false;
  } catch (e: unknown) {
    const isQuotaExceeded =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22);
    if (isQuotaExceeded) {
      console.warn(
        "[thought-workbench] localStorage quota exceeded. key=%s, valueLength=%d",
        key,
        value.length,
      );
      window.dispatchEvent(new CustomEvent("storage-quota-exceeded"));
    } else {
      console.warn("[thought-workbench] safeWriteStorage failed:", e);
    }
    return false;
  }
}
