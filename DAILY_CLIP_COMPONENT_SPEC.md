# Daily Clips (Voice Hark) — Component Spec

This document describes the **Daily Clips** screen: the component that lists and manages Voice Hark clips grouped by category. Users can reorder clips within categories, move clips between categories, and remove clips from Daily Clips. Use this spec to reimplement or maintain the same behavior.

**Entry point**: Nav item "Daily Clips" → `/daily-clips`. Route name: Daily Clips (`src/routes.js`).

---

## 1. Purpose and routes

- **Purpose**: Display all clips that have been added to Daily Clips (Voice Hark), grouped by category. Support reordering within a category, moving a clip to another category, and removing a clip from Daily Clips.
- **Route**: `/daily-clips` (exact).
- **Route name**: Daily Clips. Component: `VoiceHarkList` (container), presentational: `VoiceHarklist`.

---

## 2. Components and files

| Role | Component | File |
|------|-----------|------|
| Container | `VoiceHarkListContainer` | `src/containers/VoiceHarkList/index.js` |
| Presentational | `VoiceHarklist` | `src/components/VoiceHarklist.js` |

The container connects to Redux and passes `voiceHark`, `user`, `fetchAllVoiceHarkClip`, `updateVoiceHarkClip`, `reorderVoiceHarkClip`, and `getHarkVoiceCategories` to the presentational component. It also passes `history` (React Router) for navigation.

---

## 3. Data loading

On mount the **container** calls `fetchAllVoiceHarkClip()` with no options.

The **presentational** component passes a callback: `fetchAllVoiceHarkClip({}, res => { ... })`. The callback receives the API response body (see §5). The component stores it in local state as `apiData` and builds `accordionOpen` so all category sections start expanded.

**Expected API response shape** (from GET `/api/v0/voicehark/clips`): an **object** whose keys are **category names** (strings) and values are **arrays of clip objects**. Each clip has at least: `_id`, `title`, `href`, `audioUrl`, `creationDate`, `question` (with `title`, `hidden`), `tags` (array of `{ _id, name }`).

Example:

```json
{
  "First Clips": [ { "_id": 1, "title": "...", "href": "...", ... } ],
  "Sports": [ { "_id": 2, "title": "...", ... } ]
}
```

Category order in the UI: "First Clips" first, then remaining categories sorted alphabetically (case-insensitive).

---

## 4. Services and API

| Purpose | Method | Endpoint | Service / action | File |
|--------|--------|----------|------------------|------|
| List Daily Clips by category | GET | `/api/v0/voicehark/clips?from=&limit=&sort=&status=&userId=` | `voiceHark.getVoiceHarkClips(options)` | `src/services/voiceHark.js` |
| Add/remove clip or change category | POST | `/api/v0/voicehark/clip/:id` | `voiceHark.updateVoiceHarkClip(id, isVoiceHark, category)`; action `updateVoiceHarkClip(id, isVoiceHark, categoryId, cb)` | `src/services/voiceHark.js`, `src/actions/voiceHark.js` |
| Reorder clips | POST | `/api/v0/voicehark/clips/reorder` | `voiceHark.reorderVoiceHarkClips(clipIds)`; action `reorderVoiceHarkClip(clipIds, cb)` | Same |
| Get categories (for Move dropdown) | GET | `/api/v0/answers/getHarkVoiceCategories` | `voiceHark.getHarkVoiceCategories()`; action `getHarkVoiceCategories(cb)` | Same |

**List API query params** (all optional): `from`, `limit`, `sort`, `status`, `userId`.

**Update clip body**: `{ voiceHark: boolean, harkVoiceCategory: categoryId | null }`. Add to Daily Clips: `voiceHark: true`, `harkVoiceCategory: categoryId`. Remove: `voiceHark: false`, `harkVoiceCategory: null`. Move: `voiceHark: true`, `harkVoiceCategory: newCategoryId`.

**Reorder body**: `{ clipIds: string[] }` — order of clip IDs within a category (or global, depending on backend).

---

## 5. Redux

- **State**: `state.voiceHark` — `list`, `currentPage`, `pageSize`, `hasMore`, `totalClips`, `sort`, `qs`, `fromDate`, `toDate`, `loading`, `error`, `categories`, `suggestions`. **Reducer**: `src/reducers/voiceHark.js`.
- **Actions used by Daily Clips**:
  - `fetchAllVoiceHarkClip(options, cb)` — fetches clips; callback receives response data (category-keyed object).
  - `updateVoiceHarkClip(id, isVoiceHark, categoryId, cb)` — add/remove/move clip.
  - `reorderVoiceHarkClip(clipIds, cb)` — reorder clips.
  - `getHarkVoiceCategories(cb)` — load categories for Move-to-Category dropdown.

**Note**: The list API response is passed to the component callback and stored in component state as `apiData`; Redux `voiceHark.list` is also updated (action stores `res.data` in payload; if API returns an object, `list` may be that object). The UI reads from `this.state.apiData` for the accordion.

---

## 6. UI structure (VoiceHarklist)

### 6.1 Props

| Prop | Type | Source | Purpose |
|------|------|--------|---------|
| `voiceHark` | object | Redux `state.voiceHark` | `list`, `currentPage`, `pageSize`, `hasMore`, `totalClips`, `loading`, `categories` (for Move modal). |
| `fetchAllVoiceHarkClip` | function | Action | Fetch clips; optional second arg is callback with response data. |
| `updateVoiceHarkClip` | function | Action | `(id, isVoiceHark, categoryId, cb)`. |
| `reorderVoiceHarkClip` | function | Action | `(clipIds, cb)`. |
| `getHarkVoiceCategories` | function | Action | Load categories (for Move modal). |
| `history` | object | React Router | Navigation. |
| `updateQueryString` | function | (optional) | Not wired in current container; used for search if provided. |
| `clipsFilterByDate` | function | (optional) | Not wired in current container; used for date filter if provided. |
| `changeSort` | function | (optional) | Not wired in current container; used for sort if provided. |
| `cleanUp` | function | (optional) | Not wired in current container; used for Clear All if provided. |

### 6.2 Local state

- `apiData`: object — category names as keys, arrays of clips as values (from fetch callback).
- `accordionOpen`: object — category name → boolean (section expanded/collapsed).
- `selectedClips`: array — currently unused for main accordion UI; kept in sync with `voiceHark.list`.
- `categoryReorderState`: object — category → boolean (reorder mode on/off).
- `categoryChanges`: object — category → boolean (unsaved reorder changes).
- `moveModal`: boolean — Move Clip to Category modal visible.
- `selectedMoveClip`: object | null — clip being moved.
- `selectedMoveCategory`: option | null — selected category in Move modal (`{ value, label }`).
- `date`: `{ FROM, TO }` — date filter (optional; not wired in container).
- `qs`: string — search text (optional).
- `sortState`: string — e.g. `'recent'`, `'popular'`, `'episode'`.
- `currentPage`, `pageSize`, etc. — for pagination (optional).

### 6.3 Layout

1. **Accordion per category**: One **Card** per category. Categories sorted: "First Clips" first, then rest alphabetically.
2. **Card header** (per category):
   - Category name (clickable to toggle section).
   - Chevron (up/down) to expand/collapse.
   - **Save Order** button — enabled only when `categoryChanges[category]` is true; on click calls `onSaveCategoryOrder(category)`.
3. **Card body**: Collapsible (reactstrap `Collapse`). Inside: a **Table** of clips for that category.

### 6.4 Table columns (per clip)

| Column | Content | Behavior |
|--------|---------|----------|
| ID | Drag handle (fa-bars) + `item._id` | Row is draggable; drag reorders within category and sets `categoryChanges[category] = true`. |
| Clip Title | Link to `/#/clip/detail/${item._id}` + `item.title` | Navigate to clip detail. S3 badge if `item.audioUrl` starts with `configURL.STAGE_URL`. |
| View on Web | Icon (fa-external-link) | `window.open(\`${configURL.WEB_URL}/${item.href}\`, '_blank')`. |
| Hidden | `item.question.hidden` (string or empty) | Read-only. |
| Harklist | `(item.question || {}).title` | Read-only. |
| Date | `formattedDate(item.creationDate, true)` | Read-only. |
| Tags | Badges per tag; click → `/tags/detail/${tag._id}` | — |
| Action | Move icon (fa-arrows), Delete icon (fa-trash) | **Move**: opens Move modal; on confirm calls `updateVoiceHarkClip(item._id, true, selectedMoveCategory.value, cb)` then refetches. **Delete**: `updateVoiceHarkClip(item._id, false, null, cb)` then refetch; scroll position preserved. |

### 6.5 Drag and drop (within category)

- `onCategoryDragStart(e, category, index)` — set `draggedItem`, `draggedCategory`.
- `onCategoryDragOver(category, index)` — reorder within same category; update `apiData[category]` and `categoryChanges[category] = true`.
- `onCategoryDragEnd()` — clear dragged refs.
- **Save Order** sends `apiData[category].map(c => c._id)` to `reorderVoiceHarkClip(clipIds, cb)`; in callback, `fetchAllVoiceHarkClip({}, res => ...)` and set `apiData`, clear `categoryChanges[category]`, preserve accordion and scroll position.

### 6.6 Move Clip to Category modal

- **Title**: "Move Clip to Category".
- **Body**: Text "Move clip \"{selectedMoveClip.title}\" to a different category:" and a **Select** (react-select) with options from `voiceHark.categories` mapped to `{ value: category._id, label: category.title }`. Value: `selectedMoveCategory`.
- **Buttons**: "Move", "Cancel". On Move: `updateVoiceHarkClip(selectedMoveClip._id, true, selectedMoveCategory.value, cb)` then refetch and close modal; scroll position preserved.

### 6.7 Remove from Daily Clips (Delete)

- Trash icon on row → `updateVoiceHarkClip(item._id, false, null, cb)`. Callback refetches with `fetchAllVoiceHarkClip({}, res => ...)` and preserves accordion state and scroll position.

### 6.8 Empty state

If a category has no clips: single table row with `colSpan="8"` and `<EmptyCard cardMessage={\`No ${category} Clips Available\`} />`.

---

## 7. Filter bar (optional / not wired)

The component has local state and handlers for **search** (`handleSearchText` → `updateQueryString`), **date range** (`handleChangeDate` → `clipsFilterByDate`), **sort** (`changeSortHandler` → `changeSort`), and **Clear All** (`clearFilter` → `cleanUp` then `fetchAllVoiceHarkClip`). The **VoiceHarkList** container does not pass `updateQueryString`, `clipsFilterByDate`, `changeSort`, or `cleanUp`, so these controls are currently no-ops on the Daily Clips page. The service `getVoiceHarkClips` accepts `from`, `limit`, `sort`, `status`, `userId` for future use.

---

## 8. Config

- **configURL.BASE_URL**: API base.
- **configURL.WEB_URL**: Used for "View on Web" link: `${configURL.WEB_URL}/${item.href}`.
- **configURL.STAGE_URL**: Used to show S3 badge when `item.audioUrl` starts with this value.

---

## 9. Dependencies

- **reactstrap**: Card, CardBody, CardHeader, Table, Button, Collapse, Badge, Col.
- **rc-pagination**: Pagination (imported; pagination UI not rendered in current accordion-only layout).
- **react-select**: Select (Move modal).
- **moment**: Date state formatting.
- **DateComponent**: DatePicker (for optional date filter).
- **EmptyCard**, **Modals**: App components.
- **formattedDate**: `src/utils/formattedDate`.

---

## 10. Related docs

- **Answer List (Clips List)**: [ANSWER_LIST_COMPONENT_SPEC.md](./ANSWER_LIST_COMPONENT_SPEC.md) — Daily Clips add/remove in the clips table (§ Daily Clips (Voice Hark)), same APIs and categories.
- **Answer Detail**: [ANSWER_DETAIL_COMPONENT_SPEC.md](./ANSWER_DETAIL_COMPONENT_SPEC.md) — Daily Clips (Voice Hark) section; add/remove from clip detail.
- **Services**: [SERVICES_AND_API_REFERENCE.md](./SERVICES_AND_API_REFERENCE.md) for full endpoint details.

---

*Document generated from Hark Dashboard codebase for the Daily Clips (Voice Hark) page.*
