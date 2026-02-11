# Answer List (Clips List) — Component Spec

This document describes **AnswerList** (clips/answers list): behavior, filters, table, APIs, and state. Use it as context to reimplement the same component in a new repo (e.g. React 18+, Tailwind, shadcn UI).

**Component**: AnswerList (exported as `TableComponent` from `src/components/AnswerList.js`). Container: `containers/Answers/index.js` (and `AnswersToQuestions.js` for "Answer to Question" mode).

---

## Purpose and Routes

- **Main routes**: `/clip/page/:pageIndex` (admin, contributor, curator) and `/hark-clips/page/:pageIndex` (verified user). Page index is 1-based in the URL; API uses 0-based `currentPage`.
- **Optional mode**: When used inside "Answer to Question", `showQuestion` is true and the header shows "Answer to Question: {question title}"; list is filtered by that question (container passes `question` into filter).

---

## Data Loading

On mount the **container** (`containers/Answers/index.js`):

1. Reads `match.params.pageIndex` (default 1) and optional `questionId` from route.
2. Restores filter state from Redux (qs, podcastSlug, tag, voiceArtistqs, fromDate, toDate, userFilter) via `updateQueryString`, `changePodcastSearchText`, `changeTagSearch`, `changeVoiceArtistSearchText`, `answersFilterByDate`, `updateUserFilter` as needed.
3. Builds filter object with `buildFilterObjectFromRedux(currentPage - 1, questionId)` and calls `fetchAllAnswers(filterObject)`.
4. Calls `fetchAllPublisher({ currentPage })` and maps result to Publisher dropdown options (`{ label: item.title, value: item.publisherSlug }`).

**List API**: GET `/api/v0/dashboard/dashboard-answers?` with query params below. Response: `{ data: { answers[], totalAnswers } }`.

---

## Filter Bar (Exact List)

| Filter | UI | Action / API | Query param |
|--------|-----|--------------|-------------|
| Search text | Input "Enter search text" | Debounced ~500 ms → `updateQueryString(qs)` (Redux `changeSearchText`) → `fetchAllAnswers({ qs, currentPage: 0 })` | `qs` |
| User name | Input "Enter user name" | Debounced `fetchAllMembers({ qs })` → results in `members.list`; on select → `fetchAllAnswers({ username: option.name })` | `username` |
| Podcast | Input "Enter Podcast" | Debounced `changePodcastText(qs)` → **searchPodcastList** GET `/api/v0/dashboard/search-podcast?q=&from=&limit=` → store in `answers.podcastList`; on select → `changePodcastSearchText(option.podcastSlug)` → `fetchAllAnswers({ podcastSlug, currentPage: 0 })` | `podcastSlug` |
| Tag search | Input "Enter Search Tag" | Debounced `changeTagSearch(e)` → `fetchAllAnswers({ tag, currentPage: 0 })` | `tag` |
| Network | Input "Network" | Debounced `changeVoiceArtistText(qs)` → **searchVoiceArtistList** GET `/api/v0/podcasts/artists?qs=&from=&limit=` → store in `answers.voiceArtistList`; on select → `changeVoiceArtistSearchText(option)` → `fetchAllAnswers({ voiceArtistqs, currentPage: 0 })` | `artistName` (service sends as `artistName`) |
| Date range | FROM / TO DatePicker | `answersFilterByDate(date, 'FROM'|'TO')`; dates formatted with `formatISODATE` for API | `fromDate`, `toDate` |
| Publisher | Single Select "Select Publisher" | Options from `fetchAllPublisher`; on change → `fetchAllAnswers({ publisherSlug: selectedOption.value, currentPage })` | `publisherSlug` |
| Show Non S3 Clips | Checkbox | `updateShowNonS3Clips(checked)` → `fetchAllAnswers({ showNonS3Clips, currentPage: 0 })` | `showNonS3Clips` |
| Show visible clips | Checkbox | `updateHiddenClipsFilter(checked)` → `fetchAllAnswers({ hidden, currentPage: 0 })`; API sends `hidden=${!options.hidden}` | `hidden` |
| Show clips with intros | Checkbox | `updateIntroClipsFilter(checked)` → `fetchAllAnswers({ isIntroPresent, currentPage: 0 })` | `isIntroPresent` |
| Verified user | Checkbox | `updateUserFilter(checked ? 'verified' : 'all')` → `fetchAllAnswers({ userFilter, currentPage: 0 })` | `verifiedUser=true` when `userFilter === 'verified'` |
| Clear All Filters | Link | Reset local state; `cleanUp()` then `fetchAllAnswers({ sort: 'newest', qs: '', toDate: '', fromDate: '', postedBy: '', username: '', podcastSlug: '', currentPage: 0, tag: '', hidden: false, isIntroPresent: false })` | — |

---

## List API — Full Query Params and Response

**Endpoint**: GET `/api/v0/dashboard/dashboard-answers?`

**Query params** (all optional; include when filter is active): `communityFilter`, `postedBy`, `sort`, `from`, `limit`, `qs`, `username`, `podcastSlug`, `userFilter`, `toDate`, `fromDate`, `publisherSlug`, `showNonS3Clips`, `artistName` (from voiceArtistqs), `hidden`, `isIntroPresent`, `tag`, `question`. Pagination: `from = currentPage * pageSize`, `limit = pageSize` (e.g. 20).

**Response**: `{ data: { answers: [...], totalAnswers: number } }`. Redux stores `list: res.data.answers`, `totalAnswers: res.data.totalAnswers`, `currentPage`, `hasMore`.

---

## Supporting APIs for Filters

| Purpose | Method | Endpoint | Request / response |
|---------|--------|----------|---------------------|
| Search podcasts (suggestions) | GET | `/api/v0/dashboard/search-podcast?q=&from=&limit=` | Response stored in `answers.podcastList`; items have `podcastSlug`, `title`. |
| Search voice artists (Network) | GET | `/api/v0/podcasts/artists?qs=&from=&limit=` | Response stored in `answers.voiceArtistList` (array of strings or objects; display as option). |
| Member suggestions (user name) | GET | `/api/v0/dashboard/dashboard-members/?qs=&limit=...` | Response `members` → `members.list`; items have `name`, `_id`, etc. |
| Publisher dropdown | (Container uses `fetchAllPublisher`) | Publisher list API | Options `{ label: title, value: publisherSlug }`. |

---

## Table Columns

| Column | Content |
|--------|---------|
| Title | Add/Remove Daily Clips icon (+/–); then **link by clip type** (see below); S3 badge if `customAttributes.podcast.s3audioUrl`; starred icon if `A.starred`. |
| View on Web | Link to `${WEB_URL}/${answer.href}` (external). |
| Intro | Podcast intro: "Yes" / "No" / "U" (undefined); bold if custom (not auto-generated). From `customAttributes.podcastIntro`. |
| AI Intro | "Yes" if `customAttributes.aiIntro`, else "No". |
| Hidden | `answer.question.hidden` (string "true"/"false" or empty). |
| Creator | Link to `/users/detail/${answer.creator.uid}`; label `answer.creator.name`. |
| Podcast | `customAttributes.podcast.podcast_name` (text). |
| Harklist | `answer.question.title` (text). |
| Date | `formattedDate(answer.creationDate, true)`. |
| Tags | Badges per tag; click navigates to `/tags/detail/${tag._id}`. |
| ID | `answer._id`. |

### Title link by clip type

- `customAttributes.voicedarticle?.type === 'voicedarticle'` → `/voicedclip/detail/:id`
- `customAttributes.bookChapter?.type === 'bookChapter'` → `/audiobook/detail/:id`
- `customAttributes.vanillaAudio?.type === 'vanillaAudio'` → `/vanillaAudio/detail/:id`
- `customAttributes.vanillaVideo?.type === 'vanillaVideo'` → `/vanillaVideo/detail/:id`
- Else → `/clip/detail/:id`

---

## Sort

Dropdown label: "Recent" | "Popular" | "Agreed" (from `currentSort`). Values: `newest`, `title_asc`, `title_desc`, `popular_desc`, `popular_asc`, `agreed_count_desc`, `agreed_count_asc`. On change: `changeSort(sort)` → `fetchAllAnswers({ sort, currentPage: 0 })` and update Redux. Table header also has title sort arrows (title_asc / title_desc).

---

## Pagination

- **Component**: rc-pagination; `pageSize: 20`; `current={defaultPage}` from `match.params.pageIndex`; `total={totalAnswers}`.
- **onChange(page)**: Build options with `buildFilterOptions(page)` (see below), call `fetchAllAnswers(filterOptions)`, then `history.push` to `/clip/page/${page}` (admin/contributor/curator) or `/hark-clips/page/${page}` (verified).

### buildFilterOptions(currentPage, updatedState)

Returns object: `{ currentPage: currentPage - 1 }` plus, when true: `showNonS3Clips`, `hidden`, `isIntroPresent`, and when Publisher selected: `publisherSlug: this.state.selectedOption.value`. Use this when calling `fetchAllAnswers` on page change so all active filters are sent.

---

## Daily Clips (Voice Hark)

- **Row action**: Icon in Title column: plus = Add to Daily Clips, minus = Remove from Daily Clips (based on `answer.voiceHarkClip` or `answer.isVoiceHark` or `customAttributes.voiceHark`). Click opens modal.
- **Modal**: Title "Add to Daily Clips" or "Remove from Daily Clips"; body: when Adding, show category dropdown (options from `getHarkVoiceCategories()`); when Removing, confirm only. Buttons: Add/Remove and Cancel.
- **APIs**:
  - GET `/api/v0/answers/getHarkVoiceCategories` — categories for dropdown (call when opening Add flow).
  - POST `/api/v0/voicehark/clip/:id` — body `{ voiceHark: boolean, harkVoiceCategory: categoryId }`. Add: `voiceHark: true`, `harkVoiceCategory: selectedCategoryId`. Remove: `voiceHark: false`, `harkVoiceCategory: null`.
- After success: close modal, refresh list (e.g. `fetchAllAnswers({ currentPage: currentPage - 1 })`).

---

## Redux State (Conceptual)

- **answers**: list, totalAnswers, currentPage, pageSize, hasMore, qs, username, podcastSlug, fromDate, toDate, sort, userFilter, podcastList, voiceArtistList, showNonS3Clips, hidden, isIntroPresent, tag, voiceArtistqs, publisherSlug, question (when in "answer to question" mode).
- **members**: list (for user name suggestions).
- **voiceHark**: categories (from getHarkVoiceCategories).
- **user**: isAdmin, isContributor, isCurator (for route and UI).

---

## Config

- **BASE_URL**: API base for all requests.
- **WEB_URL**: Used for "View on Web" link: `${WEB_URL}/${answer.href}`.

---

## Reusable Primitives

- DatePicker (FROM/TO), Modal (Daily Clips confirm), DataTable, Pagination, Select (Publisher), Search inputs with suggestion dropdowns (user, podcast, network), Filter bar layout, Empty state when list is empty.

---

*Use this spec together with SERVICES_AND_API_REFERENCE.md for full endpoint details. For clip detail screen, see ANSWER_DETAIL_COMPONENT_SPEC.md.*
