# Tracked Podcasts — Services, Filters, Actions & Components

This document describes the **Tracked Podcasts** (Manage Transcript) feature: services, API details, filters, action links, and internal components.

---

## 1. Route & Entry

| Item | Value |
|------|--------|
| **Route** | `/manage-transcript` |
| **Route name** | Tracked Podcasts |
| **Container** | `ManageTranscript` (`src/containers/ManageTranscript/index.js`) |
| **Nav** | Tracked Podcasts → `/manage-transcript` (`src/_nav.js`) |

---

## 2. Services & API

### 2.1 Get podcast transcript list (tracked podcasts)

| Method | Endpoint | Query params | Notes |
|--------|----------|--------------|--------|
| GET | `/api/v0/transcript/podcast/list` | `curationGroupId` (optional) | List of tracked podcasts (with prompt category and curation groups) |

- **Service**: `transcript.getPodcastTranscript(params)`  
- **File**: `src/services/transcript.js`  
- **Params**: `{ curationGroupId?: string }` — when set, only podcasts in that curation group are returned (or filtered client-side; see reducer payload `transcriptList`).

### 2.2 Add podcast (start tracking)

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/transcript/podcast` | See below | Add a podcast to tracked list |

**Body (object):**  
`podcastId?`, `podcastSlug?`, `podcastType?` ('internal' | 'external'), `aiClipSuggestionCategory?` (prompt category id).

- **Service**: `transcript.addPodcastTranscript(input)`  
- **Action**: `addPodcastTranscript(payload, cb)`  
- **File**: `src/services/transcript.js`, `src/actions/transcript.js`

### 2.3 Delete podcast (stop tracking)

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| DELETE | `/api/v0/transcript/podcast` | `{ podcastId: item }` | Remove podcast from tracked list |

- **Service**: `transcript.deletePodcastTranscript(item)`  
- **Action**: `deletePodcastTranscript(id, cb)`  
- **File**: `src/services/transcript.js`, `src/actions/transcript.js`

### 2.4 Edit podcast prompt category

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/dashboard/aiClipSuggestionCategories/edit` | `{ podcastId, aiClipSuggestionCategory }` | Update prompt category for a tracked podcast |

- **Service**: `transcript.editPodcastTranscript(podcastId, aiClipSuggestionCategory)`  
- **Action**: `editPodcastTranscript(podcastId, aiClipSuggestionCategory, cb)`  
- **File**: `src/services/transcript.js`, `src/actions/transcript.js`

### 2.5 Attach curation groups to podcast

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/dashboard/podcast/assign-curation-group` | `{ podcastId, curationGroupIds: string[] }` | Assign curation groups to a tracked podcast |

- **Service**: `curationsGroup.attachCurationGroupsToPodcast(payload)`  
- **Action**: `attachCurationGroupsToPodcast({ podcastId, curationGroupIds }, cb)`  
- **File**: `src/services/curationsGroup.js`, `src/actions/curationGroup.js`

### 2.6 Category clip suggestions (prompt categories)

| Method | Endpoint | Notes |
|--------|----------|--------|
| GET | `/api/v0/dashboard/clip/suggestion/aiClipSuggestionCategories` | List of AI clip suggestion categories for prompt category dropdown |

- **Service**: `transcript.getCategoryClipSuggestionsData()` (exported from transcript service; used via action).  
- **Action**: `getCategoryClipSuggestionsData`  
- **Stored in**: `state.transcript.categoryClipSuggestionsData`  
- **File**: `src/services/transcript.js` (as `getCategoryClipSuggestionsData`).

### 2.7 Curation groups list

| Method | Endpoint | Notes |
|--------|----------|--------|
| GET | `/api/v0/dashboard/curationGroups/all` | All curation groups for dropdown and attach modal |

- **Service**: `curationsGroup.fetchAllCurationGroup(options)`  
- **Action**: `fetchAllCurationGroup`  
- **State**: `state.curationsGroup.curationsGroupList`  
- **File**: `src/services/curationsGroup.js`

### 2.8 Podcast search (for Add Podcast)

- **Internal**: `fetchAllPodcast` (podcastTagging) for internal podcast search.  
- **External**: `searchPodcastList` (harkClips) for external podcast search.  
- Used by `SearchByKeyword` inside Add Podcast modal.

### 2.9 Episode detail page (Title link)

When the user clicks the **Title** (podcast name) in the table, the app navigates to the **Episode detail** page for that podcast. The flow uses:

- **fetchAllPodcastDetail(M._id)** — get podcast detail (including `href`).
- **podcastDetail(res.href)** (podcastClips) — load episode list for that podcast.
- **storeEpisodeDetails(response.data)** (episode) — store episode data in Redux for the detail page.
- **history.push(\`/episodes/details/${M._id}\`)** — navigate to episode detail. `M._id` is the podcast id; route is `/episodes/details/:podcastId`.

While this runs, the component sets `isLoading: true`. On error, `isLoading` is set back to false and the user stays on Tracked Podcasts.

---

## 3. Redux

### 3.1 Actions (ManageTranscript mapDispatchToProps)

| Action | Purpose |
|--------|--------|
| `getPodcastTranscript` | Fetch tracked podcast list (optional `curationGroupId`) |
| `getCategoryClipSuggestionsData` | Fetch prompt categories for dropdowns |
| `fetchAllCurationGroup` | Fetch curation groups |
| `attachCurationGroupsToPodcast` | Attach selected curation groups to a podcast |
| `addPodcastTranscript` | Add podcast to tracked list |
| `deletePodcastTranscript` | Remove podcast from tracked list |
| `editPodcastTranscript` | Update prompt category for a podcast |
| `searchinKeyword`, `transcriptDetail`, `clearTranscriptState` | Search/detail (if used) |
| `fetchAllPodcast`, `fetchAllPodcastDetail`, `podcastDetail`, `searchPodcastList` | Podcast/episode search and detail |
| `storeEpisodeDetails` | Store episode before navigating to episode detail |
| `logout` | User logout |

### 3.2 State (mapStateToProps)

- **transcript**: `transcriptList`, `categoryClipSuggestionsData`
- **curationsGroup**: `curationsGroupList`
- **user**, **episode** (for episode detail flow)

### 3.3 Constants (transcript)

- `GET_TRANSCRIPT`, `ADD_TRANSCRIPT`, `DELETE_TRANSCRIPT`, `EDIT_TRANSCRIPT`, `GET_CATEGORY_CLIP_SUGGESTIONS_DATA`, `LOADING`, `LOADED`, `TOASTR_ERROR`, `TOASTR_INFO`

---

## 4. Filters & URL

### 4.1 Filters

| Filter | Type | Description |
|--------|------|-------------|
| Curation group | Dropdown | Filter list to podcasts that belong to the selected curation group. Options: “All Curation Groups” or one of `curationsGroupList`. |
| Sort order | Toggle | Sort by podcast title: ascending/descending (`sortOrder`: 'asc' | 'desc'). Client-side sort on `title`. |

No URL params are read/written for Tracked Podcasts; filters are local state only.

### 4.2 Filter behavior

- **handleCurationGroupSelect(curationGroup)**: Sets `curationGroupId` / `curationGroup` in state and calls `getPodcastTranscript({ curationGroupId })`. Passing `null` clears filter.
- **toggleSortOrder**: Flips `sortOrder`; table is sorted by title in render.

---

## 5. Action Links & Navigation

| Action | Link / behavior |
|--------|------------------|
| **Title (podcast name)** | **Link to Episode detail page.** Clicking the Title cell calls `moveToEpisode(M)`: (1) `fetchAllPodcastDetail(M._id)`, (2) `podcastDetail(res.href)` to load episodes, (3) `storeEpisodeDetails(response.data)`, (4) `history.push(\`/episodes/details/${M._id}\`)`. Destination: **Episode detail** at `/episodes/details/:podcastId` (where `podcastId` is the tracked podcast `_id`). Rendered with `className='cursor-pointer linkStyle'`. |
| Attach curation groups | Opens modal; on “Attach”, `attachCurationGroupsToPodcast({ podcastId, curationGroupIds })` then `getPodcastTranscript()`. |
| Edit prompt category | Opens edit modal; on “Update”, `editPodcastTranscript(podcastId, derivedCategoryId)` then `getPodcastTranscript()`. |
| Delete podcast | Opens confirm modal; on “Delete”, `deletePodcastTranscript(podcastId)` then `getPodcastTranscript()`. |
| Add podcast | Opens Add Podcast modal; on “Submit”, `addPodcastTranscript(payload)` then `getPodcastTranscript()`. |

---

## 6. Internal Components & UI

### 6.1 Container

- **ManageTranscript** (`src/containers/ManageTranscript/index.js`)
  - Renders: `<TranscriptList {...this.props} />`
  - On mount: `getPodcastTranscript()`, `getCategoryClipSuggestionsData()`, `fetchAllCurationGroup()`.

### 6.2 Main presentational component

- **TranscriptList** (`src/components/TranscriptList.js`)
  - Class component with modals and table; uses reactstrap (Card, Table, Dropdown, Form, Button, etc.), `Modals`, `SearchByKeyword`, react-select `Select` for categories and curation multi-select.

### 6.3 Table columns

| Column | Content |
|--------|---------|
| Id | `M._id` |
| **Title** | **Podcast title — link to Episode detail page.** Rendered as clickable text (`className='cursor-pointer linkStyle'`). Click calls `moveToEpisode(M)`, which loads podcast/episode data then navigates to **Episode detail** at `/episodes/details/${M._id}`. See §2.9 and §5 for the full flow. |
| Prompt Category | Label from `categoryClipSuggestionsData` for `M.aiClipSuggestionCategory` |
| Curation Groups | Comma-separated names from `M.curationGroups` |
| Action | Icons: attach curation (opens modal), edit (edit category modal), delete (confirm modal) |

### 6.4 Modals

- **Attach Curation Groups**: Multi-select `Select` from `curationsGroupList`; Ok → `onAttachCurations()`.
- **Edit Transcript Prompt Category**: Single-select category; Update → `editPodcastTranscript`.
- **Confirmation (Delete)**: Confirm delete → `deletePodcastTranscript`.
- **Add Podcast**: Internal/External radio, `SearchByKeyword` for podcast, category `Select`, Submit → `addPodcastTranscript`.

### 6.5 Dependencies

- **Modals**: `src/components/Modals.js`
- **SearchByKeyword**: `src/components/SearchByKeyword.js`
- **react-select** (Select, custom Option/ValueContainer for multi-select)
- **config**: `configURL` (e.g. IMAGE_PATH) if used for images

---

## 7. Related flows

- **Episode detail page** (`/episodes/details/:podcastId`): Reached when the user clicks the **Title** in the Tracked Podcasts table. The app fetches podcast detail and episode data, stores it, then navigates. Full detail of the Episode Detail component is in **§8** below.
- **Curation Group** page: Lists curation groups; attaching groups here affects which podcasts appear when filtering by that group in Tracked Podcasts.
- **Clip Suggestions**: Can be filtered by `curationGroupId`; curation groups attached to podcasts here influence that flow.

---

## 8. Episode Detail component (destination of Title link)

When the user clicks the **Title** in the Tracked Podcasts table, they are taken to the **Episode Detail** page. This section documents that page: route, data flow, services, and UI.

### 8.1 Route & entry

| Item | Value |
|------|--------|
| **Routes** | `/episodes/details/:id`, `/episodes/details/:slug` (both render the same component) |
| **Route name** | Episode Details |
| **Container** | `EpisodeDetail` (`src/containers/EpisodeDetail/index.js`) |
| **Presentational** | `EpisodeDetailComponent` (`src/components/EpisodeDetailComponent.js`) |

The `:id` or `:slug` in the URL is the **podcast id** (e.g. the tracked podcast `_id` when coming from Tracked Podcasts).

### 8.2 Data flow

- **From Tracked Podcasts**: Before navigating, Tracked Podcasts calls `fetchAllPodcastDetail(M._id)` → `podcastDetail(res.href)` → `storeEpisodeDetails(response.data)` → `history.push(\`/episodes/details/${M._id}\`)`. So when the user lands on Episode Detail, `state.episode.episodeDetails` is already set with the podcast and its episodes.
- **Direct load / refetch**: If the user opens the URL directly or the page needs fresh data, the container can call **refetchEpisodeDetails**: it reads `podcastId` from `match.params.id` or `match.params.slug`, then runs the same flow: `fetchAllPodcastDetail(podcastId)` → `podcastDetail(res.href)` → `storeEpisodeDetails(response.data)`.

### 8.3 Services & API

| Purpose | Method | Endpoint | Notes |
|--------|--------|----------|--------|
| Get podcast metadata (incl. `href`) | GET | `/api/v0/podcasts/:id` | **Service**: `podcastTagging.fetchAllPodcastDetail(id)`. Returns podcast detail; `res.href` is used as the RSS URL for the next call. **File**: `src/services/podcastTagging.js`. |
| Get podcast episodes (parse RSS) | GET | `/api/v0/external/parse-podcast-rss?url={href}` | **Service**: `podcastClips.podcastDetail(href)`. Returns `response.data` with shape `{ title?, podcasts: episode[] }`. Stored in Redux as `episodeDetails`. **File**: `src/services/podcastClips.js`. |
| Download episodes to S3 | POST | `/api/v0/external/uploadMultipleEpisodeManually` | **Service**: `episode.downloadS3AudioUrl(episode)`. Body: object with episode selection (e.g. `{ ids: episode[] }` from component state). **Action**: `downloadS3AudioUrl(episodes, cb)`. After success, component can call `refetchEpisodeDetails()`. **File**: `src/services/episode.js`, `src/actions/episode.js`. |

### 8.4 Redux

- **State**: `state.episode.episodeDetails` — object with at least `title` (podcast title) and `podcasts` (array of episodes). Set by **storeEpisodeDetails** (action `STORE_EPISODE_DETAILS`). **Reducer**: `src/reducers/episode.js`.
- **Actions used by Episode Detail**: `fetchAllPodcastDetail`, `podcastDetail`, `storeEpisodeDetails`, `downloadS3AudioUrl`.

### 8.5 UI structure (EpisodeDetailComponent)

- **Header card**: Title “Podcasts: {episodeDetails.title}”, and a **Download Episode** button that calls `downloadS3AudioUrl(episodeDownload, callback)` then optionally `refetchEpisodeDetails()`.
- **Search**: “Search by name” text input; filters the episode table by episode name/title (client-side).
- **Episode table**: Columns — **Name**, **Description**, **Author**, **Download**, **Created Date**.
  - **Name**: Clickable (`linkStyle`). Click → **handleEpisodeClick(episode)** → `history.push(\`/transcript-detail/${episode.podcastSlug}/${episode.episodeSlug}\`)` (Transcript Detail page).
  - **Description**: Truncated to 100 chars with “…” if longer; fallback “No description available”.
  - **Author**: `episode.artistName`.
  - **Download**: Checkbox; checked and disabled when `episode.s3audioUrl` exists. Otherwise used to select episodes for the “Download Episode” action (selection stored in local state `episodeDownload`).
  - **Created Date**: `episode.createdAt` or `episode.pubDate`, formatted with `toLocaleDateString()`.
- **Empty state**: If no episodes match the search, table shows “No podcasts found matching your search”.

### 8.6 Action links from Episode Detail

| Action | Link / behavior |
|--------|------------------|
| **Episode name** | Navigate to **Transcript Detail**: `history.push(\`/transcript-detail/${episode.podcastSlug}/${episode.episodeSlug}\`)`. |
| **Download Episode** | Calls `downloadS3AudioUrl(episodeDownload, cb)`; after success, can call `refetchEpisodeDetails()` to refresh the list. |
| Episode checkboxes | Add/remove episode to/from local selection (`episodeDownload`) for the Download Episode action. |

### 8.7 Dependencies

- **reactstrap**: Card, CardHeader, CardBody, Row, Col, Table, Input, InputGroup, FormGroup, Label, Button, ListGroup, ListGroupItem.
- **React**: useState for `searchTerm` and `episodeDownload` (selected episodes for download).

---

*Document generated from Hark Dashboard codebase for Tracked Podcasts.*
