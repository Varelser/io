import type { EdgeItem } from "../types";
import { CONTRADICTION_TYPES, TRANSFORM_OPS } from "../types";
import { newId } from "../utils/id";
import { canonicalizeRelationType } from "../utils/relation-model";

export function normalizeEdgeItem(edge: Partial<EdgeItem> | null | undefined): EdgeItem {
  return {
    id: edge?.id || newId("edge"),
    from: edge?.from || "",
    to: edge?.to || "",
    relation: canonicalizeRelationType(edge?.relation, "references"),
    meaning: edge?.meaning || "",
    weight: typeof edge?.weight === "number" ? edge.weight : 1,
    visible: typeof edge?.visible === "boolean" ? edge.visible : true,
    contradictionType: (CONTRADICTION_TYPES as readonly string[]).includes(edge?.contradictionType as string) ? edge!.contradictionType : undefined,
    transformOp: (TRANSFORM_OPS as readonly string[]).includes(edge?.transformOp as string) ? edge!.transformOp : undefined,
  };
}
