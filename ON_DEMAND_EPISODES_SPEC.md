# On Demand Episodes — Services, Filters, Actions & Components

This document describes the **On Demand Episodes** feature: services, API details, filters, action links, and internal components.

---

## 1. Route & Entry

| Item | Value |
|------|--------|
| **Route** | `/episode-transcript/page/:pageIndex` |
| **Route name** | On Demand Episodes |
| **Container** | `EpisodeTranscript` (`src/containers/ManageTranscript/EpisodeTranscript.js`) |
| **Nav** | On Demand Episodes → `/episode-transcript/page/:pageIndex` (typically page 1) (`src/_nav.js`) |

---

## 2. Services & API

### 2.1 Get episode transcript list (paginated)

| Method | Endpoint | Query params | Notes |
|--------|----------|--------------|--------|
| GET | `/api/v0/transcript/episode/list` | `page`, `limit`, `qs?`, `podcastqs?`, `userNameqs?` | Paginated list of on-demand episode transcripts |

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Current page (1-based) |
| `limit` | number | Items per page (e.g. 20) |
| `qs` | string | Search by episode title |
| `podcastqs` | string | Search by podcast title |
| `userNameqs` | string | Search by user who requested transcript |

- **Service**: `transcript.getEpisodeTranscript(currentPage, itemsPerPage, options)`  
- **File**: `src/services/transcript.js`  
- **Response shape**: `{ data: { data: episodeRow[], pagination: { total, totalPages } } }` (component expects `res.data.data` and `res.data.pagination.total` / `totalPages`).

### 2.2 Request episode transcript (add)

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/transcript/episode` | `{ episode: { ...episodeFields }, regenerateTranscript? }` | Request transcript for an episode (on-demand) |

**Body:**  
`episode`: e.g. `podcast_name`, `name`, `_id`, `artistName`, `audioUrl`, `podcastSlug`, `episodeSlug`, `s3audioUrl`, optional `podcastType`.  
`regenerateTranscript`: optional; set when regenerating.

- **Service**: `transcript.episodeTranscript(transcriptOption, regenerateTranscript)`  
- **Action**: `episodeTranscript(option, regenerateTranscript, cb)`  
- **File**: `src/services/transcript.js`, `src/actions/transcript.js`

### 2.3 Delete episode transcript

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| DELETE | `/api/v0/transcript/episode` | `{ _id: id }` | Remove episode from on-demand list |

- **Service**: `episode.deleteEpisodeTranscript(id)`  
- **Action**: `deleteEpisodeTranscript(id, cb)`  
- **File**: `src/services/episode.js`, `src/actions/episode.js`

### 2.4 Podcast / episode search (for Request Transcript modal)

- **Internal**: `fetchAllPodcast`, `fetchAllPodcastDetail` (podcastTagging); **podcastDetail** (podcastClips) to load episodes for selected podcast.  
- **External**: `searchPodcastList` (harkClips).  
- **SearchByKeyword** used for podcast search; then a **Select** of episodes for chosen podcast. Selection provides the `episode` object passed to `episodeTranscript`.

---

## 3. Redux

### 3.1 Actions (EpisodeTranscript mapDispatchToProps)

| Action | Purpose |
|--------|--------|
| `getEpisodeTranscript(currentPage, itemsPerPage, options)` | Fetch paginated episode list with optional qs, podcastqs, userNameqs |
| `episodeTranscript(option, regenerateTranscript, cb)` | Request transcript for selected episode |
| `deleteEpisodeTranscript(id, cb)` | Delete episode transcript and refresh list |
| `fetchAllPodcast`, `fetchAllPodcastDetail`, `podcastDetail` | Internal podcast/episode search for modal |
| `searchPodcastList`, `changePodcastText` | External podcast search |
| `storeEpisodeDetails` | Store episode for downstream use |
| `getPodcastTranscript`, `transcriptDetail`, `clearTranscriptState`, `addPodcastTranscript`, `deletePodcastTranscript` | From transcript module (some used by child) |
| `logout` | User logout |

### 3.2 State (mapStateToProps)

- **transcript**: `episodeList`, `totalItems` (from GET_EPISODE_TRANSCRIPT payload: `episodeList`, `totalItems`, `totalPages`).
- **podcastTagging**, **podcastClips**, **harkClips**: For podcast/episode search in modal.

### 3.3 Constants

- **transcript**: `GET_EPISODE_TRANSCRIPT`, `ADD_EPISODE_TRANSCRIPT`, etc.  
- **episode**: `DELETE_EPISODE_TRANSCRIPT`, `LOADING`, `LOADED`, `TOASTR_ERROR`.

---

## 4. Filters & URL

### 4.1 Filters

| Filter | Type | State key | Description |
|--------|------|-----------|-------------|
| Episode title | text | `episodeQuery` | Search by episode title (debounced 500ms) |
| Podcast title | text | `podcastQuery` | Search by podcast title (debounced 500ms) |
| User name | text | `userNameQuery` | Search by user who requested transcript |

Filters are passed to `getEpisodeTranscript` as `options`: `{ qs: episodeQuery, podcastqs: podcastQuery, userNameqs: userNameQuery }`.  
Additional client-side filtering in render ensures displayed rows match active filters when API response is not filtered.

### 4.2 URL (pagination only)

- **Path**: `/episode-transcript/page/:pageIndex` — page index is in the route.
- **Read**: On mount, `pageIndex` from `match.params` sets `currentPage` and triggers `fetchEpisodeTranscripts()`.
- **Write**: `handlePageChange(pageNumber)` updates state and `history.push({ pathname: \`/episode-transcript/page/${pageNumber}\` })`.

---

## 5. Action Links & Navigation

| Action | Link / behavior |
|--------|------------------|
| Open transcript detail (regular episode) | `moveToEpisode(M)` → `history.push(\`/transcript-detail/${M.podcastSlug}/${M.episodeSlug}\`)` |
| Request transcript | Opens modal; Internal/External, podcast search, episode select; “Transcript” → `episodeTranscript(transcript, null, cb)` then `fetchEpisodeTranscripts()`. |
| Delete transcript | Trash icon → `deleteEpisodeTranscript(M._id, cb)` then `fetchEpisodeTranscripts()`. |
| Pagination | `handlePageChange(pageNumber)` → update state, push URL, `fetchEpisodeTranscripts()`. |

---

## 6. Internal Components & UI

### 6.1 Container

- **EpisodeTranscript** (`src/containers/ManageTranscript/EpisodeTranscript.js`)
  - Renders: `<EpisodeTranscriptList {...this.props} />`
  - No initial fetch in container; child handles fetch and filters.

### 6.2 Main presentational component

- **EpisodeTranscriptList** (`src/components/EpisodeTranscriptList.js`)
  - Class component with table, filters, pagination, Request Transcript modal, and optional polling.

### 6.3 Table columns

| Column | Content |
|--------|---------|
| Image | `M.image` (with fallback on error) |
| Title | Episode name; clickable → `moveToEpisode(M)` |
| Description | Info icon + Tooltip with `M.description` |
| Podcast | `M.podcast_name` |
| Duration | `formatTime(M.duration)` (Badge) |
| Requested Date | `formattedDate(M.transcriptRequestDateTime)` |
| Requested By | `M.transcriptRequestedBy` |
| Status | Badge from `M.generateTranscriptStatus` (e.g. ready / pending) |
| Action | Trash icon → `deleteTranscript(M)` |

### 6.4 Polling

- When any of the top 3 items has `generateTranscriptStatus !== 'ready'`, component starts polling every 30s with current page and filters. Stops when top 3 are all “ready” or on filter change/unmount.

### 6.5 Modals

- **Request Transcript (Episode Transcript)**: Internal/External radio, `SearchByKeyword` for podcast, episode `Select`, “Transcript” / “Cancel”. On Ok: `episodeTranscript(transcript, null, cb)` then refresh list.

### 6.6 Dependencies

- **Modals**: `src/components/Modals.js`
- **SearchByKeyword**: `src/components/SearchByKeyword.js`
- **Pagination**: `rc-pagination` (Pagination)
- **formatTime**, **formattedDate**: `src/utils/formattedDate.js`
- **episode** service: used for episode list in modal (via podcastDetail / store).

---

## 7. Related flows

- **Transcript Detail**: `/transcript-detail/:podcastSlug/:episodeSlug` — opened when clicking an episode title (regular episode, not SXM).
- **Tracked Podcasts**: Different list (tracked podcasts vs on-demand episodes); both use transcript-related services.
- **Episode Feed SXM**: SXM-specific feed; On Demand Episodes is for non-SXM on-demand transcript requests.

---

*Document generated from Hark Dashboard codebase for On Demand Episodes.*
