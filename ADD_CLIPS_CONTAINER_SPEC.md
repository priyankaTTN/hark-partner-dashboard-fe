# AddClipsContainer — Spec

This document describes the **AddClipsContainer** component: podcast **external vs internal** behavior, the **add-clip flow** (steps 1–4), and how a new clip is **attached to a question/harklist (question detail)**.

**Main file**: `src/containers/AddClipsContainer/index.js`. Related: `SuggestClip`, `MakeaClip`, `QuestionsDetail`, Redux `questions.playlistDetail`, actions (harkClips, podcastClips, answers, questions).

---

## Contents

Overview → **Entry points and question attachment** → **Podcast: External vs Internal** → **Add-clip flow (Steps 1–4)** → **Flow with question detail & SuggestClip** → **State and props** → **Actions and API** → **Required APIs** → **Summary**.

---

## Overview

AddClipsContainer is the **add a clip** experience. It:

- Lets the user **choose a podcast** (external or internal), then an **episode**, then **trim** (start/end) and add **title, description, optional intro**, and **submit** the clip.
- Can be used in two main contexts:
  - **Attached to a question (playlist)** — from Question Detail (`/add-clip/:playlist`) or with **SuggestClip** pre-fill (`playlistDetail` in Redux).
  - **Standalone “Make a Clip”** — user picks a **Harklist** first, then podcast → episode → clip; the clip is attached to that Harklist.

This spec focuses on **podcast external/internal** and the **full add-clip flow tied to question detail**.

---

## Entry points and question attachment

| Entry | Route / usage | Question / Harklist source | `isfromMakeClip` |
|-------|----------------|-----------------------------|-------------------|
| **Question Detail** | `/add-clip/:playlist` (e.g. from “Add Clip” on question) | `:playlist` = question ID; question title shown | `false` |
| **Make a Clip** | Rendered inside MakeaClip page (no `:playlist`) | User selects a **Harklist** in Step 1; clip attaches to that Harklist | `true` |
| **SuggestClip** | Navigate to `/add-clip` after choosing a suggestion | `playlistDetail` in Redux (pre-fill); user may still pick Harklist in Step 4 if no `:playlist` | Depends on parent |

**How the clip is attached to a question/harklist (question detail):**

- On **submit** (`addClipHandler`), the payload includes **`questionId`**:
  - `questionId = this.state.harkListId || +match.params.playlist || +this.state.selectedQuestion`
- So:
  - From **Question Detail** with `/add-clip/:playlist` → clip is attached to that **question** (`params.playlist`).
  - From **Make a Clip** → user has chosen a Harklist; `selectedQuestion` (or `harkListId` from search) is that Harklist’s `_id` → clip is attached to that **Harklist (playlist)**.
  - From **SuggestClip** with no `:playlist` in URL → `questionId` comes from **Harklist** selection in Step 4 (`harkListId` / `selectedQuestion`) if the user selects one.

**Question detail loading:**

- When the route has **`:playlist`** (numeric), the container calls `fetchAllQuestionsDetail(questionsId)` in `componentDidMount` and shows the question title in the header: `questions.data.title`.

---

## Podcast: External vs Internal

AddClipsContainer supports two podcast sources, controlled by **`state.type`**: `'external'` (default) or `'internal'`.

### When is External/Internal shown?

- **External/Internal radios** are rendered only when:
  - **Not** “Make a Clip” (`!this.props.isfromMakeClip`), and
  - **Not** in an alternate flow (e.g. `!this.state.isAudioFlow`).
- So: **Question Detail** (`/add-clip/:playlist`) sees External/Internal; **Make a Clip** does not (only podcast search).

### Behavior by type

| Type | State | Search handler | Search argument | Meaning |
|------|--------|-----------------|------------------|--------|
| **External** | `type: 'external'` | `searchPodcastList` (harkClips) | `{ qs: e }` (user search text) | Search **external** podcast catalog by query string. |
| **Internal** | `type: 'internal'` | `updateQueryString` (mapped to `changePodcastSearchText` from podcastTagging) | `e` (user search text) | Search **internal** (dashboard) podcasts; uses podcastTagging API. |

**Code (podcastHandler):**

```javascript
const searchHandler = this.state.type === 'external' ? this.props.searchPodcastList : this.props.updateQueryString;
const searchArgument = this.state.type === 'external' ? { qs: e } : e;
searchHandler(searchArgument, (res) => {
  this.setState({
    podcastList: res.data || res.list,
    submitPodcast: false
  });
  // ... auto-select logic when from Make Clip or playlistDetail
});
```

- **External**: `searchPodcastList({ qs: e }, callback)` → callback receives `res.data` (or similar) as list of podcasts.
- **Internal**: `updateQueryString(e)` → in this container, mapped to **podcastTagging**’s `changePodcastSearchText`; that fetches internal podcasts by query; the callback (if any) is used to set `podcastList` from `res.data || res.list`.

Switching type clears the current podcast list and search text:

- External: `this.setState({ type: 'external', podcastList: [], podcastqs: '' })`
- Internal: `this.setState({ type: 'internal', podcastList: [], podcastqs: '' })`

---

## Add-clip flow (Steps 1–4)

The podcast flow in the UI is a linear sequence. Other flows (Audio Book, Voiced Article, Vanilla Audio/Video) are toggled by radios and are not covered in this spec.

### Step 1: Select a podcast

- User types in the “Select a Podcast” search input.
- After debounce (500 ms), either:
  - **External**: `searchPodcastList({ qs })` → list of podcasts.
  - **Internal**: `updateQueryString` (podcastTagging search) → list of internal podcasts.
- User clicks a podcast → `podcastSelectHandler(item)` → `selectedPodcast` set, “Continue” shown.
- “Continue” → `updatePodcastList()`:
  - Calls `podcastDetail(selectedPodcast.href)` to load **episodes** for that podcast.
  - Sets `episodeList`, `allEpisodeData`, `isPodcastBlocked`.
  - Moves to Step 2.

### Step 2: Select an episode

- Episodes listed from `podcastDetail` response.
- User can filter by typing in the episode search (debounced); filters `episodeList` from `allEpisodeData`.
- User selects an episode → `episodeSelectHandler(item)` → `selectedEpisode`, default start/end from episode, “Continue” shown.
- “Continue” → `updateEpisodeList()`:
  - If episode has `s3audioUrl`, uses it and shows player.
  - Otherwise calls `getEpisodeS3Url(options)` and polls until status is `FINISHED` (or handles `IN_PROGRESS` / `ERROR`).
  - When S3 URL is ready, sets `isPlayerVisible`, `isDownloadEpisodeComplete`, `s3AudioUrl`, and shows the **Player** (Step 3).

### Step 3: Create a clip (trim)

- **Player** shows with episode audio; user sets **start** and **end** time (and tenths via `milisec` / `milisecEnd`).
- User clicks “Continue” → `isSaveClip` becomes true → Step 4 is shown.

### Step 4: Add title and intro / Submit

- User enters **Clip Title** (required, max 75) and **Description** (optional, max 170).
- Optional intro: paste MP3 URL or upload file (S3); can play preview.
- **Harklist selection** (when not attached to a question via URL):
  - If there is **no** `questionsId` from route (`!questionsId`), a “Select Harklist” search/dropdown is shown; selection sets `harkListId` and `selectedQuestion`.
- Submit button enabled when `clipName` is set.
- **Submit** → `addClipHandler()`:
  - Builds `clipData` with `questionId`, `title`, `description`, and `podcast` (episode + `s3audioUrl`, `startTime`, `endTime`).
  - Optionally merges intro data (`podcastIntro`) if URL/upload present.
  - Calls **`addNewClipInfo(finalObj, callback)`** (answers action).
  - On success, redirects (e.g. `/playlist/page/1` or `/harklists/page/1` depending on role).

So the **complete flow** for “add clip attached to question” is: **Question (or Harklist) → Podcast (external/internal) → Episode → Trim → Title/Description/Intro → Submit** → clip is stored and linked to `questionId`.

---

## Flow with question detail & SuggestClip

This is the flow where the clip is **attached to question detail** and can be **pre-filled** from a suggestion.

### From Question Detail only (no suggestion)

1. User is on **Question Detail** (e.g. `/questions/detail/:id`).
2. Clicks **“Add Clip”** → `addClipHandler()` in QuestionsDetail pushes **`/add-clip/${questionId}`** (no Redux `playlistDetail`).
3. AddClipsContainer mounts with **`match.params.playlist`** = question ID.
4. `componentDidMount`:
   - Calls **`fetchAllQuestionsDetail(questionsId)`**.
   - Does **not** have `playlistDetail`; no auto-selection.
5. User sees question title in header; chooses **External** or **Internal**, then Step 1 → 2 → 3 → 4.
6. In Step 4, **no** “Select Harklist” is shown when `questionsId` is truthy (i.e. when `params.playlist` is set).
7. On submit, **`questionId`** = `params.playlist` → clip is attached to that **question**.

### From SuggestClip (with question detail / pre-fill)

1. User is on a page that uses **SuggestClip** (e.g. question detail or a make-clip flow).
2. User picks a suggested clip → SuggestClip builds **clipDetail** (title, description, startTime, endTime, podcastName, podcastSlug, episodeTitle, etc.) and calls **`addClipHandler(clipDetail)`** (Redux action from **questions**).
3. Questions action **`addClipHandler(question)`** dispatches **`ADD_CLIP_DETAIL`** with **`playlistDetail: question`** (here `question` is the clip detail object).
4. SuggestClip then navigates to **`/add-clip`** (no `:playlist` in URL).
5. AddClipsContainer mounts; **`playlistDetail`** comes from **Redux** (`state.questions.playlistDetail`).
6. `componentDidMount`:
   - If **`playlistDetail`** exists:
     - Pre-fills **clip name**, **description**, **start/end** (and tenths).
     - Sets **pending** fields: `pendingEpisodeTitle`, `pendingStartTime`, `pendingEndTime`, `pendingPodcastSlug`, `autoSelectInProgress`.
     - Calls **`podcastHandler(clipDetail.podcastName, true)`** (auto-select).
7. **Auto-selection**:
   - Podcast search runs (external or internal per `type`).
   - When results arrive, if `playlistDetail` (or pending) is set and there is a matching podcast (by slug if available), **first matching podcast** is auto-selected → **`updatePodcastList()`**.
   - After episodes load, episode matching **pendingEpisodeTitle** / **playlistDetail.episodeTitle** (and slug if present) is found and **episodeSelectHandler(episodeMatch)** called.
   - **updateEpisodeList()** runs; when episode is ready, **start/end** are set from **playlistDetail** (or pending) and **`isSaveClip: true`** so the user can go straight to Step 4 or adjust trim.
8. **Player** receives **`playlistDetail`** and **`defaultData={playlistDetail}`** so it can show pre-filled trim.
9. On submit, **`questionId`** = **`harkListId`** or **`selectedQuestion`** (user may have selected a Harklist in Step 4) or **`params.playlist`** if the URL had `:playlist`. So when coming from SuggestClip to `/add-clip` with no `:playlist`, the clip is attached to the **Harklist** the user selects in Step 4, unless the app passes question ID via URL or state elsewhere.

So the **flow that attaches to question detail** is:

- **With URL** `/add-clip/:playlist`: clip is attached to that question; question title is loaded and shown; no Harklist dropdown in Step 4.
- **With SuggestClip**: clip is **pre-filled** from `playlistDetail` and optionally **auto-selected** (podcast + episode + times); attachment is to **params.playlist** if present, else to the **Harklist** chosen in Step 4.

---

## State and props

### Key state (podcast flow)

- **Podcast source**: `type: 'external' | 'internal'`, `isPodcastFlow`, `isAudioFlow`, etc.
- **Step 1**: `podcastqs`, `podcastList`, `selectedPodcast`, `submitPodcast`, `isSubmitBtn`.
- **Step 2**: `qs`, `episodeList`, `allEpisodeData`, `selectedEpisode`, `submitEpisode`, `isEpisodeBtn`, `isPodcastBlocked`.
- **Step 3**: `isPlayerVisible`, `isDownloadEpisodeComplete`, `s3AudioUrl`, `startTime`, `endTime`, `milisec`, `milisecEnd`, `isSaveClip`, `playerWidth`.
- **Step 4**: `clipName`, `description`, `audioUrl`, intro upload state, `harkListId`, `selectedQuestion`, `harklistqs`, `harklistResults`, `dropdownOpen`.
- **SuggestClip pre-fill**: `pendingEpisodeTitle`, `pendingStartTime`, `pendingEndTime`, `pendingPodcastSlug`, `autoSelectInProgress`.

### Key props

- **`match.params.playlist`** — question ID when route is `/add-clip/:playlist`.
- **`isfromMakeClip`** — true when used inside MakeaClip; shows Harklist selector first, hides External/Internal.
- **`playlistDetail`** — from Redux `state.questions.playlistDetail`; used for pre-fill and auto-selection when coming from SuggestClip.
- **`questions`** — from Redux; `questions.data` holds current question detail when `fetchAllQuestionsDetail` was called (e.g. title).
- **`harklist`** — list of Harklists for “Select a Harklist” (e.g. in Make a Clip or when no `questionsId`).

---

## Actions and API

- **searchPodcastList** (harkClips) — external podcast search by `qs`.
- **updateQueryString** (podcastTagging’s changePodcastSearchText) — internal podcast search.
- **podcastDetail** (podcastClips) — fetch episodes for a podcast (`selectedPodcast.href`).
- **getEpisodeS3Url** (answers) — get or wait for S3 URL for an episode (polling until `FINISHED`).
- **fetchAllQuestionsDetail** (questions) — fetch question by ID for header when `params.playlist` is set.
- **addNewClipInfo** (answers) — submit the new clip (payload includes `questionId`, title, description, podcast/episode, start/end, optional intro).
- **addClipHandler** (questions) — Redux action that sets **`playlistDetail`** for SuggestClip → AddClipsContainer pre-fill.

---

## Required APIs

All endpoints are relative to the app’s base API URL (e.g. `config.BASE_URL`). The container uses these via Redux actions and service layers.

### 1. Search podcasts (external)

Used for **Step 1** when **External** is selected.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/v0/external/search-podcast` |
| **Query** | `q` (search text, encoded), optional `from`, `limit` |
| **Service** | `src/services/harkClips.js` → `searchPodcastList(options)` |
| **Action** | `harkClips.searchPodcastList({ qs, from, limit }, callback)` |

**Example:** `GET /api/v0/external/search-podcast?q=my+show&from=0&limit=10`

**Response:** `res.data` is the array of podcasts (each with e.g. `title`, `artistName`, `image`, `href`, `slug`/`podcastSlug`, `collectionViewUrl`). Callback receives full `res`.

---

### 2. Search podcasts (internal)

Used for **Step 1** when **Internal** is selected.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/v0/external/podcasts/all` |
| **Query** | `qs` (search text), optional `from`, `limit`, `sort`, `isClippingBlocked` |
| **Service** | `src/services/podcastTagging.js` → `fetchAllPodcast(options)` |
| **Action** | `podcastTagging.changePodcastSearchText(qs)` → triggers fetch; result shape may be `res.data` or `res.list` for podcast list. |

**Example:** `GET /api/v0/external/podcasts/all?qs=my+show&from=0&limit=10`

**Response:** Array of internal podcasts; container uses `res.data || res.list` as `podcastList`.

---

### 3. Podcast detail (episodes list)

Used after **Step 1** “Continue” to load episodes for the selected podcast.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/v0/external/parse-podcast-rss` |
| **Query** | `url` (podcast feed URL / `selectedPodcast.href`) |
| **Service** | `src/services/podcastClips.js` → `podcastDetail(href)` |
| **Action** | `podcastClips.podcastDetail(url, callback)` |

**Example:** `GET /api/v0/external/parse-podcast-rss?url=https%3A%2F%2F...`

**Response:** `res.data` contains e.g. `podcasts` (episode list), `isClippingBlocked`. Each episode has `_id`, `name`, `href`, `image`, `pubDate`, `duration`, `podcast_name`, `podcastSlug`/`podcast_slug`, `episodeSlug`, `audioUrl`, optional `s3audioUrl`, `startTime`, `endTime`, etc.

---

### 4. Get episode S3 URL

Used in **Step 2** when the selected episode does not already have `s3audioUrl`; the container polls until the job is `FINISHED`.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/v0/external/getepisodes3url` |
| **Body** | `id`, `href`, `podcastSlug`, `audioUrl`, `episodeSlug`, `dashboard: true` (from `selectedEpisode`) |
| **Service** | `src/services/answers.js` → `getEpisodeS3Url(episode)` |
| **Action** | `answers.getEpisodeS3Url(option, callback)` |

**Response:** `res.data` (or `res`) with e.g. `status` (`IN_PROGRESS` | `FINISHED` | `ERROR`), `s3audioUrl` when finished, `message` on error. Container polls (e.g. every 5s) until `status === FINISHED`.

---

### 5. Add new clip (create answer)

Used on **Step 4** Submit to create the clip and attach it to a question/harklist.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/v1/answers` |
| **Body** | JSON. See below. |
| **Service** | `src/services/answers.js` → `addNewClipInfo(object)` |
| **Action** | `answers.addNewClipInfo(finalObj, callback)` |

**Request body (clipData):**

- `questionId` (number) — question/harklist ID to attach the clip to.
- `title` (string) — clip title (max 75).
- `description` (string) — optional.
- `rawText` (string) — often `''`.
- `podcast` (object) — episode payload:
  - Spread of `episodeList[0]` (episode fields).
  - `s3audioUrl` (string).
  - `startTime` (number, seconds).
  - `endTime` (number, seconds).

**Optional merge (podcastIntro):** If user added an intro (URL or upload), body also includes:

- `podcastIntro`: `introText`, `startTime`, `endTime`, `duration`, `contentURI` (audio URL), `userId`, `userName`, `podcastName`.

**Response:** Success triggers redirect in callback (e.g. `/playlist/page/1` or `/harklists/page/1`).

---

### 6. Fetch question detail

Used in **componentDidMount** when route has `:playlist` to show the question title in the header.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/v0/dashboard/questions/{id}` |
| **Path param** | `id` — question ID (`match.params.playlist`). |
| **Service** | `src/services/questions.js` → `fetchAllQuestionsDetail(id)` |
| **Action** | `questions.fetchAllQuestionsDetail(id)` |

**Example:** `GET /api/v0/dashboard/questions/123`

**Response:** Question object; container uses `questions.data.title` (and related fields) in the UI.

---

### 7. Search Harklist (playlist dropdown)

Used in **Step 4** “Select Harklist” when the clip is not tied to a question via URL (`!questionsId`).

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/v0/entities/hark-search` |
| **Query** | `type=question-create-clip`, `qs` (search text), optional `from`, `limit`. For AddClipsContainer, `type` is `'playlist'` and search key is `playlistqs` (mapped to `qs`). |
| **Service** | `src/services/questions.js` → `searchHarkList(options)` (answers service also has this; harkList action uses questions service). |
| **Action** | `harkList.searchHarkList({ playlistqs: e, type: 'playlist' }, callback)` |

**Example:** `GET /api/v0/entities/hark-search?qs=...&from=0&limit=10&type=playlist`

**Response:** Callback receives `res.data`; container maps `res.results` with `res.dictionary` to get `harklistResults` (list of playlists/harklists with e.g. `_id`, `title`). User selection sets `harkListId` / `selectedQuestion` for `questionId` on submit.

---

### 8. Upload intro audio (optional)

Used in **Step 4** when the user uploads an intro file (instead of pasting a URL).

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/v0/external/uploadIntro` |
| **Body** | `FormData` with key `file` (audio file). Headers: `Content-Type: application/json;charset=UTF-8`, `Access-Control-Allow-Origin: *`. |
| **Usage** | Direct `axios.post(\`${BASE_URL}/api/v0/external/uploadIntro\`, data, config)` in AddClipsContainer. |

**Response:** e.g. `res.data.location` — URL of the uploaded intro; stored in state as `audioUrl` and used in `podcastIntro.contentURI` when submitting the clip.

---

## Summary

- **External vs Internal**: Controlled by `state.type`; only shown when not `isfromMakeClip`. External uses `searchPodcastList` with `{ qs }`; Internal uses podcastTagging’s `changePodcastSearchText` (mapped as `updateQueryString`). Both set `podcastList` from `res.data || res.list`.
- **Add-clip flow**: Step 1 podcast (external/internal) → Step 2 episode (from `podcastDetail`) → Step 3 trim in Player (S3 URL via `getEpisodeS3Url` if needed) → Step 4 title/description/intro and optional Harklist → **addNewClipInfo** with **questionId**.
- **Attachment to question detail**: **questionId** = `harkListId || params.playlist || selectedQuestion`. From Question Detail with `/add-clip/:playlist`, the clip attaches to that question and the question title is loaded. From SuggestClip, **playlistDetail** in Redux pre-fills and can auto-select podcast/episode/trim; attachment is to `params.playlist` if in URL, otherwise to the Harklist selected in Step 4.
