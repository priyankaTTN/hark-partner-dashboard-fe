# Episode Detail — Component Spec (Tracked Podcast Title destination)

This document describes the **Episode Detail** screen: the component that opens when the user clicks the **Tracked Podcast title** in the Tracked Podcasts table. It shows the podcast name and a list of episodes; each episode name links to Transcript Detail. Use this spec to reimplement or maintain the same behavior.

**Entry point**: Tracked Podcasts (`/manage-transcript`) → user clicks the **Title** (podcast name) in a row → app navigates to Episode Detail. See **[TRACKED_PODCASTS_SPEC.md](./TRACKED_PODCASTS_SPEC.md)** for the Tracked Podcasts flow and §8 there for a shorter summary.

---

## 1. Purpose and routes

- **Purpose**: Show one podcast’s episode list (from RSS). User can search by episode name, select episodes for S3 download, and open **Transcript Detail** by clicking an episode name.
- **Routes**: `/episodes/details/:id`, `/episodes/details/:slug` (both render the same component). Param `:id` or `:slug` is the **podcast id** (e.g. tracked podcast `_id` when coming from Tracked Podcasts).
- **Route name**: Episode Details (`src/routes.js`).

---

## 2. Components and files

| Role | Component | File |
|------|-----------|------|
| Container | `EpisodeDetail` | `src/containers/EpisodeDetail/index.js` |
| Presentational | `EpisodeDetailComponent` | `src/components/EpisodeDetailComponent.js` |

The container connects to Redux and passes `episodeDetails`, `downloadS3AudioUrl`, `history`, and `refetchEpisodeDetails` to the presentational component.

---

## 3. Link from Tracked Podcast title

In **Tracked Podcasts** (`TranscriptList.js`), the table **Title** cell is clickable:

- **UI**: `<td className='cursor-pointer linkStyle' onClick={() => this.moveToEpisode(M)}>{M.title}</td>`
- **Handler**: `moveToEpisode(M)`:
  1. `this.setState({ isLoading: true })`
  2. `fetchAllPodcastDetail(M._id, (res) => { ... })`
  3. Inside callback: `podcastDetail(res.href, (response) => { storeEpisodeDetails(response.data); history.push(\`/episodes/details/${M._id}\`); })`
  4. On error: `setState({ isLoading: false })`

So when the user lands on Episode Detail, `state.episode.episodeDetails` is already set. The Episode Detail component reads it from Redux and renders the list.

---

## 4. Data loading and refetch

- **Initial data (from Tracked Podcasts)**: No extra fetch on Episode Detail mount; data was stored before navigation. Container reads `episodeDetails` from `state.episode.episodeDetails`.
- **Direct URL / refetch**: If the page is opened directly (e.g. `/episodes/details/abc123`) or after an action (e.g. download), the container can call **refetchEpisodeDetails**:
  - Reads `podcastId` from `match.params.id` or `match.params.slug`.
  - Calls `fetchAllPodcastDetail(podcastId, (res) => { podcastDetail(res.href, (response) => { storeEpisodeDetails(response.data); }); })`.

**Expected `episodeDetails` shape** (from `podcastDetail` response stored by `storeEpisodeDetails`):

- `title`: string (podcast title), shown in the header as “Podcasts: {title}”.
- `podcasts`: array of episode objects. Each episode has at least: `name` or `title`, `description`, `artistName`, `podcastSlug`, `episodeSlug`, `s3audioUrl` (optional), `createdAt` or `pubDate`, `_id`.

---

## 5. Services and API

| Purpose | Method | Endpoint | Service / action | File |
|--------|--------|----------|------------------|------|
| Get podcast metadata (incl. `href`) | GET | `/api/v0/podcasts/:id` | `podcastTagging.fetchAllPodcastDetail(id)` | `src/services/podcastTagging.js` |
| Get podcast episodes (parse RSS) | GET | `/api/v0/external/parse-podcast-rss?url={href}` | `podcastClips.podcastDetail(href)` | `src/services/podcastClips.js` |
| Download episodes to S3 | POST | `/api/v0/external/uploadMultipleEpisodeManually` | `episode.downloadS3AudioUrl(payload)`; action `downloadS3AudioUrl(episodes, cb)` | `src/services/episode.js`, `src/actions/episode.js` |

- **storeEpisodeDetails**: Redux action; stores `response.data` from `podcastDetail` in `state.episode.episodeDetails` (reducer `STORE_EPISODE_DETAILS`). No API call in the Episode Detail container itself; data is passed from the Tracked Podcasts flow or from refetch.

---

## 6. Redux

- **State**: `state.episode.episodeDetails` — object with `title` and `podcasts[]`. **Reducer**: `src/reducers/episode.js` (case `STORE_EPISODE_DETAILS`).
- **Actions used by Episode Detail**:
  - `fetchAllPodcastDetail` (podcastTagging)
  - `podcastDetail` (podcastClips)
  - `storeEpisodeDetails` (episode)
  - `downloadS3AudioUrl` (episode)

---

## 7. UI structure (EpisodeDetailComponent)

### 7.1 Props

| Prop | Type | Source | Purpose |
|------|------|--------|---------|
| `episodeDetails` | object \| null | Redux `state.episode.episodeDetails` | Podcast title and `podcasts` array. If null, component shows “No episode details available”. |
| `downloadS3AudioUrl` | function | Action `episode.downloadS3AudioUrl` | Called with selection payload and callback (e.g. refetch). |
| `history` | object | React Router | Used for `history.push()` to Transcript Detail. |
| `refetchEpisodeDetails` | function | Container method | Refetch podcast + episodes and update Redux; optional after download. |

### 7.2 Local state

- `searchTerm`: string — filters the episode table by episode name/title (client-side).
- `episodeDownload`: object used as selection for “Download Episode”; in code it stores `{ ids: episode[] }` (episodes selected for download). Checkbox logic: checked and disabled when `episode.s3audioUrl` exists; otherwise checkbox adds/removes episode from this selection.

### 7.3 Layout

1. **Outer wrapper**: `<div className="animated fadeIn">`.
2. **Header card**:
   - Title: “Podcasts: {episodeDetails.title}”.
   - Button: “Download Episode” → `handleDownload()` → `downloadS3AudioUrl(episodeDownload, callback)`; in callback, optionally `refetchEpisodeDetails()`.
3. **Search**: Single text input, placeholder “Search by name”, controlled by `searchTerm`. Filters `episodes` by `(episode.name || episode.title || '').toLowerCase().includes(searchTerm.toLowerCase())`.
4. **Episode list card**:
   - Card header: “Episode List”.
   - Table columns: **Name**, **Description**, **Author**, **Download**, **Created Date**.

### 7.4 Table columns (per episode)

| Column | Content | Behavior |
|--------|---------|----------|
| Name | `episode.name` or `episode.title` or “Untitled” | Clickable (`linkStyle`). Click → `handleEpisodeClick(episode)` → `history.push(\`/transcript-detail/${episode.podcastSlug}/${episode.episodeSlug}\`)`. |
| Description | Truncated to 100 chars + “…” if longer; else “No description available” | Read-only. |
| Author | `episode.artistName` | Read-only. |
| Download | Checkbox | Checked and disabled if `episode.s3audioUrl` exists. Otherwise `onChange` → `isEpisodeHandler(episode)` adds episode to `episodeDownload.ids` (selection for Download Episode button). |
| Created Date | `episode.createdAt` or `episode.pubDate` via `toLocaleDateString()`; else “Unknown” | Read-only. |

### 7.5 Empty state

If `filteredEpisodes.length === 0`, table shows one row: “No podcasts found matching your search” (colSpan 4).

---

## 8. Action links (from Episode Detail)

| Action | Destination / behavior |
|--------|------------------------|
| **Episode name (row)** | **Transcript Detail**: `history.push(\`/transcript-detail/${episode.podcastSlug}/${episode.episodeSlug}\`)`. |
| **Download Episode** | Calls `downloadS3AudioUrl(episodeDownload, cb)`; callback can call `refetchEpisodeDetails()` to refresh the list. |
| Episode checkboxes | Update local selection `episodeDownload` for the Download Episode button. |

---

## 9. Dependencies

- **reactstrap**: Card, CardBody, CardHeader, Row, Col, Table, Input, FormGroup, Label, Button (ListGroup/ListGroupItem imported but not used in current UI).
- **React**: `useState` for `searchTerm` and `episodeDownload`.

---

## 10. Related docs

- **Tracked Podcasts** (entry point for Title link): [TRACKED_PODCASTS_SPEC.md](./TRACKED_PODCASTS_SPEC.md) — §5 (Action Links), §6.3 (Table columns), §8 (Episode Detail summary).
- **Transcript Detail** (destination of episode name click): Route `/transcript-detail/:podcastSlug/:episodeSlug` — see app routes and transcript/TranscriptDetail docs.

---

*Document generated from Hark Dashboard codebase for the component attached to the Tracked Podcast title.*
