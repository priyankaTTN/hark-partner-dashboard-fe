/**
 * Transcript Detail category and model JSON per TRANSCRIPT_DETAIL_COMPONENT_SPEC.
 * Category ID ranges: V1 (0–8), V2 (100–108), V3 (200–208), V4 (300–308), VTest (400–408).
 */

export type CategoryGroupId = "V1" | "V2" | "V3" | "V4" | "VTest"

export type CategoryItem = { _id: number; label: string }
export type ModelItem = { _id: string; label: string }

export const TRANSCRIPT_CATEGORY_GROUPS: Record<CategoryGroupId, CategoryItem[]> = {
  V1: [
    { _id: 0, label: "News Analysis V1" },
    { _id: 1, label: "Serious Interview V1" },
    { _id: 2, label: "Comedic Interview V1" },
    { _id: 3, label: "Cultural Commentary V1" },
    { _id: 4, label: "Sports Talk V1" },
    { _id: 5, label: "Narrative Nonfiction V1" },
    { _id: 6, label: "Wellness Advice V1" },
    { _id: 7, label: "Political Commentary V1" },
    { _id: 8, label: "General Category V1" },
  ],
  V2: [
    { _id: 100, label: "News Analysis V2" },
    { _id: 101, label: "Serious Interview V2" },
    { _id: 102, label: "Comedic Interview V2" },
    { _id: 103, label: "Cultural Commentary V2" },
    { _id: 104, label: "Sports Talk V2" },
    { _id: 105, label: "Narrative Nonfiction V2" },
    { _id: 106, label: "Wellness Advice V2" },
    { _id: 107, label: "Political Commentary V2" },
    { _id: 108, label: "General Category V2" },
  ],
  V3: [
    { _id: 208, label: "General Category V3" },
  ],
  V4: [
    { _id: 300, label: "News Analysis V4" },
    { _id: 301, label: "Serious Interview V4" },
    { _id: 302, label: "Comedic Interview V4" },
    { _id: 303, label: "Cultural Commentary V4" },
    { _id: 304, label: "Sports Talk V4" },
    { _id: 305, label: "Narrative Nonfiction V4" },
    { _id: 306, label: "Wellness Advice V4" },
    { _id: 307, label: "Political Commentary V4" },
    { _id: 308, label: "General Category V4" },
  ],
  VTest: [
    { _id: 400, label: "News Analysis VTest" },
    { _id: 401, label: "Serious Interview VTest" },
    { _id: 402, label: "Comedic Interview VTest" },
    { _id: 403, label: "Cultural Commentary VTest" },
    { _id: 404, label: "Sports Talk VTest" },
    { _id: 405, label: "Narrative Nonfiction VTest" },
    { _id: 406, label: "Wellness Advice VTest" },
    { _id: 407, label: "Political Commentary VTest" },
    { _id: 408, label: "General Category VTest" },
  ],
}

export const TRANSCRIPT_MODELS: ModelItem[] = [
  { _id: "gpt", label: "GPT" },
  { _id: "claude", label: "Claude" },
  { _id: "nova_lite", label: "Nova Lite" },
  { _id: "nova_pro", label: "Nova Pro" },
]

/** Map category_id to API version for analytics (spec: getApiVersionForCategoryId). */
export function getApiVersionForCategoryId(categoryId: number): CategoryGroupId | undefined {
  if (categoryId >= 0 && categoryId <= 8) return "V1"
  if (categoryId >= 100 && categoryId <= 108) return "V2"
  if (categoryId >= 200 && categoryId <= 208) return "V3"
  if (categoryId >= 300 && categoryId <= 308) return "V4"
  if (categoryId >= 400 && categoryId <= 408) return "VTest"
  return undefined
}
