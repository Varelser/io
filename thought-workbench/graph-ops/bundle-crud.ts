import type { AppState } from "../types";
import type { BundleItem, BundleStatus } from "../types/bundle";
import { newId } from "../utils/id";

export function createBundle(title: string, bundleType: BundleItem["bundleType"] = "custom"): BundleItem {
  const now = new Date().toISOString();
  return {
    id: newId("bundle"),
    title,
    bundleType,
    description: "",
    memberNodeIds: [],
    memberTopicIds: [],
    status: "active",
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addBundleToState(state: AppState, bundle: BundleItem): AppState {
  return { ...state, bundles: [bundle, ...(state.bundles || [])] };
}

export function removeBundleFromState(state: AppState, bundleId: string): AppState {
  return { ...state, bundles: (state.bundles || []).filter((b) => b.id !== bundleId) };
}

export function updateBundleInState(state: AppState, bundleId: string, patch: Partial<BundleItem>): AppState {
  const now = new Date().toISOString();
  return {
    ...state,
    bundles: (state.bundles || []).map((b) =>
      b.id === bundleId ? { ...b, ...patch, updatedAt: now } : b
    ),
  };
}

export function addNodeToBundle(state: AppState, bundleId: string, nodeId: string): AppState {
  return {
    ...state,
    bundles: (state.bundles || []).map((b) =>
      b.id === bundleId && !b.memberNodeIds.includes(nodeId)
        ? { ...b, memberNodeIds: [...b.memberNodeIds, nodeId], updatedAt: new Date().toISOString() }
        : b
    ),
  };
}

export function removeNodeFromBundle(state: AppState, bundleId: string, nodeId: string): AppState {
  return {
    ...state,
    bundles: (state.bundles || []).map((b) =>
      b.id === bundleId
        ? { ...b, memberNodeIds: b.memberNodeIds.filter((id) => id !== nodeId), updatedAt: new Date().toISOString() }
        : b
    ),
  };
}

export function addTopicToBundle(state: AppState, bundleId: string, topicId: string): AppState {
  return {
    ...state,
    bundles: (state.bundles || []).map((b) =>
      b.id === bundleId && !b.memberTopicIds.includes(topicId)
        ? { ...b, memberTopicIds: [...b.memberTopicIds, topicId], updatedAt: new Date().toISOString() }
        : b
    ),
  };
}

export function removeTopicFromBundle(state: AppState, bundleId: string, topicId: string): AppState {
  return {
    ...state,
    bundles: (state.bundles || []).map((b) =>
      b.id === bundleId
        ? { ...b, memberTopicIds: b.memberTopicIds.filter((id) => id !== topicId), updatedAt: new Date().toISOString() }
        : b
    ),
  };
}

export function updateBundleStatus(state: AppState, bundleId: string, status: BundleStatus): AppState {
  return updateBundleInState(state, bundleId, { status });
}
