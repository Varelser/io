export function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}
