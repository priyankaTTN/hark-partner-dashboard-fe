# Episode Feed SXM — Services, Filters, Actions & Components

This document describes the **Episode Feed SXM** feature: services, API details, filters, action links, and internal components.

---

## 1. Route & Entry

| Item | Value |
|------|--------|
| **Route** | `/feed-sxm` |
| **Route name** | Feed SXM |
| **Container** | `EpisodeFeedSXM` (`src/containers/ManagePodcast/EpisodeFeedSXM.js`) |
| **Nav** | Episode Feed SXM → `/feed-sxm` (`src/_nav.js`) |

---

## 2. Services & API

### 2.1 SXM latest episodes (feed list)

| Method | Endpoint | Query params | Notes |
|--------|----------|--------------|--------|
| GET | `/api/v0/sxm/latestEpisode` | See below | Paginated SXM episode feed |

**Query parameters (all optional):**

| Param | Type | Description |
|-------|------|-------------|
| `qs` | string | Search by episode title |
| `podcastqs` | string | Search by podcast title |
| `daysOffset` | number | Pagination offset (days); used when no text filters |
| `offset` | number | Alias for `daysOffset` (sent for backend compatibility) |

- **Service**: `vanillaAudio.getSxmLatestPodcast(options)`  
- **File**: `src/services/vanillaAudio.js`  
- **Response**: Array of episodes **or** `{ episodes[], dateInfo?: { currentOffset, nextOffset, hasMore?, totalDatesAvailable? } }` or `{ data: { episodes[], dateInfo? } }`. Component normalizes all shapes to an `episodes` array and derives `hasMore` / `nextOffset` from `dateInfo`.

### 2.2 SXM episode details (single episode)

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/sxm/episodeDetails` | `{ podcastSlug, episodeSlug }` | Used when opening transcript detail for an SXM episode |

- **Service**: `sxmEpisode.getSxmEpisode(podcastSlug, episodeSlug)`  
- **File**: `src/services/sxmEpisode.js`  
- **Used by**: Transcript Detail (SXM route) and related flows (e.g. ClipSuggestionsSXM, AudioTrimmerComponent for `type === 'sxmEpisode'`).

### 2.3 Curation groups (for filter dropdown)

- **Service**: `curationsGroup.fetchAllCurationGroup(options)`  
- **Endpoint**: GET `/api/v0/dashboard/curationGroups/all`  
- **File**: `src/services/curationsGroup.js`  
- **Usage**: Episode Feed SXM loads curation groups on mount and supports optional filter by `curationGroupId` (dropdown is commented out in UI but URL/state logic remains).  
- **Redux**: `state.curationsGroup.curationsGroupList`.

---

## 3. Redux

### 3.1 Actions

| Action | Source | Purpose |
|--------|--------|---------|
| `getSxmLatestPodcast(options, cb)` | `actions/vanillaAudio.js` | Fetches SXM latest episodes; callback receives normalized response data |
| `fetchAllCurationGroup()` | `actions/curationGroup.js` | Fetches all curation groups for dropdown |

### 3.2 State (relevant slice)

- **vanillaAudio**: Used for latest podcast response; Episode Feed SXM keeps list in **local state** (`episodes`, `nextOffset`, `hasMore`, `isLoading`) and uses the action only to fetch, not to store in Redux for this screen.
- **curationsGroup**: `curationsGroupList` — list of curation groups for filter.

### 3.3 Constants

- `GET_SXM_LATEST_PODCAST` — dispatched by `getSxmLatestPodcast` (payload = API response data).

---

## 4. Filters & URL

### 4.1 Filters

| Filter | Type | URL param | Description |
|--------|------|-----------|-------------|
| Episode title search | text | `qs` | Search by episode title (debounced 500ms) |
| Podcast title search | text | `podcastqs` | Search by podcast title (debounced 500ms) |
| Curation group | dropdown | `curationGroupId` | Optional; dropdown currently commented out in UI |

When **any** of `qs`, `podcastqs`, or `curationGroupId` is set, the component does **not** use `daysOffset` (no “Load More” pagination); it fetches once with the filter and does client-side filter for display. When no filters are active, it uses `daysOffset` and “Load More” for pagination.

### 4.2 URL sync

- **Read**: On mount and when `location.search` changes, the component reads `qs`, `podcastqs`, `curationGroupId` from the URL and sets state, then fetches with those params.
- **Write**: `updateFiltersInUrl({ qs, podcastqs, curationGroupId })` updates the URL (replace) so that filters are shareable and back/forward work.

---

## 5. Action Links & Navigation

| Action | Link / behavior |
|--------|------------------|
| Open SXM episode (transcript detail) | `history.push(\`/transcript-detail/sxm/${episode.podcastSlug}/${episode.episodeSlug}\`)` |
| Load more | Button “Load More” — calls `fetchEpisodes` with `nextOffset` and `append: true` |

---

## 6. Internal Components & UI

### 6.1 Container

- **EpisodeFeedSXM** (`src/containers/ManagePodcast/EpisodeFeedSXM.js`)
  - Connects to Redux: `latestPodcast`, `curationsGroupList`.
  - Dispatches: `getSxmLatestPodcast`, `fetchAllCurationGroup`.
  - Uses `withRouter` for `history` and `location`.
  - Renders: Card header “Episode Feed”, filters row, table, Load More.

### 6.2 UI structure

- **Filters row**
  - Search by Episode Title: `<input>` bound to `searchText` → `handleSearchText` → debounced fetch and `updateFiltersInUrl`.
  - Search by Podcast Title: `<input>` bound to `podcastText` → `handlePodcastText` → same pattern.
  - Curation group dropdown (commented out): would call `handleCurationGroupSelect` and `updateFiltersInUrl` with `curationGroupId`.
- **Table** (reactstrap `Table`): columns Title, Description (tooltip icon), Podcast, Duration, Status, Published Date, Insertion Date.
- **Row click**: Title cell is clickable and navigates to `/transcript-detail/sxm/${podcastSlug}/${episodeSlug}`.
- **Description**: Info icon toggles a reactstrap `Tooltip` with `episode.description`.
- **Status**: Badge from `episode.generateTranscriptStatus` (e.g. ready / pending / secondary).
- **Load More**: Shown when `hasMore` and not loading; appends next page using `nextOffset`.

### 6.3 Helpers

- `formatTime`, `formattedDate` from `src/utils/formattedDate` for duration and dates.
- Styles: `./styles.css` (ManagePodcast).

---

## 7. Related flows

- **Transcript Detail SXM**: Route `/transcript-detail/sxm/:podcastSlug/:episodeSlug` uses `getSxmEpisode` and `saveSxmRedirectionData` (sxmEpisode actions) and can receive navigation from this feed.
- **Clip Suggestions SXM**: Can link to the same transcript detail URL for SXM episodes.
- **Audio trimmer**: When `type === 'sxmEpisode'`, uses `sxmEpisode` payload (e.g. clipChunksGetUrl, intro) for trimmer behavior.

---

*Document generated from Hark Dashboard codebase for Episode Feed SXM.*
