# Services & API Reference — Detail Version for New Repo

This document lists **every service/API** used by the Hark Dashboard components so you can reimplement or call the same backend from a different repo. Use it with the component specs (e.g. `QUESTION_DETAIL_COMPONENT_SPEC.md`, `QUESTION_DETAIL_COMPONENT_SPEC_DETAIL.md`).

---

## 1. Config / Environment

| Key | Purpose | Example |
|-----|---------|--------|
| `BASE_URL` | API base for all requests | `https://dashboard.harkaudio.com` |
| `WEB_URL` | Public site (e.g. "View on Web" links) | `https://harkaudio.com` |
| `IMAGE_PATH` | CDN base for question card images | `https://s3.us-east-2.amazonaws.com/hark-audio-prod` |

- **Question card image URL**: `${IMAGE_PATH}/img/questions/card/${questionId}.png` (optional cache buster: `?v=${Date.now()}`).
- **HTTP client**: All APIs use same base URL, `withCredentials: true`, and optional headers (e.g. `Content-Type`, device/browser).

---

## 2. Network / HTTP

- **Library**: Axios.
- **Instance**: `axios.create({ baseURL: BASE_URL, withCredentials: true, headers: { device_type: 'PC', browser, device_platform, browser_version } })`.
- **GET**: `fetchAPI(path)` → `axiosInstance({ url: path, method: 'GET' })`.
- **POST/DELETE**: `fetchAPI(path, { method, body })` → body sent as `data`.

---

## 3. Questions (Playlists / Harklists)

| Method | Endpoint | Request | Response / Notes |
|--------|----------|---------|------------------|
| GET | `/api/v0/dashboard/questions/:id` | — | Question detail (metadata, tags, genres, tones, colors, intro/outro, share image, host, sponsor, partner, metaTag, isCached, etc.) |
| POST | `/api/v1/questions/:id` | Body: `{ ...editOptions, allowSameNamePlaylist }` | Edit question; see **editQuestionDetail payload** below |
| DELETE | `/api/v0/questions/:id` | — | Delete question |
| POST | `/api/v0/questions/:id/feature` | Body: `{ priority: true, selectedDate }` | Set as priority featured (schedule date) |
| DELETE | `/api/v0/questions/:id/feature` | — | Remove from priority featured |
| POST | `/api/v0/questions/:id/display` | — | Display question (toggle on) |
| DELETE | `/api/v0/questions/:id/display` | — | Hide question (toggle off) |
| POST | `/api/v0/questions/:id/allowsuggestion` | — | Allow suggestions (toggle on) |
| DELETE | `/api/v0/questions/:id/allowsuggestion` | — | Disallow suggestions |
| GET | `/api/v0/questions/:id/cache` | — | Enable cache for question |
| DELETE | `/api/v0/questions/:id/cache` | — | Disable cache |
| POST | `/api/v0/addshareurlforquestions` | Body: `{ id: [id] }` | Regenerate video share assets |
| POST | `/api/v0/sendImageAssetGenration` | Body: `{ id: +id }` | Regenerate image assets |
| POST | `/api/v0/completeharklistaudiourl/:questionId` | — | Generate complete audio |
| POST | `/api/v0/copytagsclipstoharklist/:questionId` | — | Copy tags from clips to Harklist |
| POST | `/api/v0/copytagsharklisttoclips/:questionId` | — | Copy tags from Harklist to clips |
| POST | `/api/v0/addHarklistReview/:id` | Body: `{ isReview?, comment?, email? }` | Submit review / review comment |
| POST | `/api/v0/sendHarklistReview/:id` | Body: `{ isReview? }` | Review finished |
| POST | `/api/v0/dashboard/question/partnerLinkEnabled` | Body: `{ questionId: id }` | Enable partner link |
| DELETE | `/api/v0/dashboard/question/partnerLinkEnabled` | Body: `{ questionId: id }` | Disable partner link |
| POST | `/api/v0/dashboard/question/metaTags` | Body: `{ id, title?, description? }` | Save meta tags (SEO) |

### editQuestionDetail payload (POST `/api/v1/questions/:id`)

- **Body**: `{ ...editOptions, allowSameNamePlaylist }`.
- **editOptions** (all optional; only send changed or required):  
  `title`, `description`, `color`, `foregroundColor`, `backgroundColor`, `clipMainColor`, `clipAlternativeColor`,  
  `playlistIntro`, `playlistOutro`, `isCustomImagePath`, `customImagePath`, `updateTime`, `displayAlternateImage`.
- **playlistIntro / playlistOutro**: `{ contentURI, duration, endTime }` or `{}` to clear.
- **displayAlternateImage**: boolean (Primary vs Alternative image type).

---

## 4. Answers (Clips)

| Method | Endpoint | Request | Response / Notes |
|--------|----------|---------|------------------|
| GET | `/api/v0/dashboard/dashboard-answers?question=:id` | Query: `question` | `{ answers[], totalAnswers }` for a question’s clips |
| GET | `/api/v0/dashboard/dashboard-answers?…` | Many query params (see **Answers list params** below) | Paginated clip list for AnswerList |
| GET | `/api/v0/dashboard/answers/:id` | — | Single answer (clip) detail |
| POST | `/api/v1/answers/:id` | Body: answer object | Edit clip |
| DELETE | `/api/v0/answers/:id` | — | Delete clip |
| POST | `/api/v0/members/questions/rearangeclips` | Body: `{ questionId, sortClipsIds: [...] }` | Reorder clips in playlist |

### Answers list params (for AnswerList / clips list)

- `question`, `communityFilter`, `postedBy`, `sort`, `from`, `limit`, `qs`, `username`, `podcastSlug`, `userFilter`, `toDate`, `fromDate`, `publisherSlug`, `showNonS3Clips`, `artistName` (sent when filtering by voice artist; param name is `artistName`), `hidden`, `isIntroPresent`, `tag`. Pagination: `from = currentPage * pageSize`, `limit = pageSize` (e.g. 20). Full filter flow and buildFilterOptions: see **[ANSWER_LIST_COMPONENT_SPEC.md](./ANSWER_LIST_COMPONENT_SPEC.md)**.

### Answer list — filter suggestion APIs

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/dashboard/search-podcast?q=&from=&limit=` | Query | Podcast search for filter dropdown; store in answers.podcastList |
| GET | `/api/v0/podcasts/artists?qs=&from=&limit=` | Query | Voice artist (Network) search; store in answers.voiceArtistList |

### Answer detail — additional endpoints

For full Answer Detail behavior and save payload, see **[ANSWER_DETAIL_COMPONENT_SPEC.md](./ANSWER_DETAIL_COMPONENT_SPEC.md)**. Key endpoints:

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| POST | `api/v0/dashboard/answers/altintro/:answerId` | Body: intro object | Upload/update podcast alt intro |
| POST | `/api/v0/dashboard/answer/metaTags` | Body: `{ id, title?, description? }` | Clip meta tags (SEO) |
| POST | `/api/v0/dashboard/answer/cliplink` | Body: clipLink object | Clip link title/URL |
| POST | `api/v0/dashboard/answers/foundBy` | Body: `{ foundById, _id }` | Add Found By member |
| DELETE | `api/v0/dashboard/answers/foundBy` | Body: `{ _id }` | Remove Found By |
| POST | `/api/v0/answers/repost` | Body: `{ questionId, answerId }` | Repost clip to question |
| GET | `api/v0/answers/:id/socialtext` | — | Quote, revelation, socialCopy |
| POST | `api/v0/answers/:id/socialtext` | Body: quote/revelation/socialCopy | Save social text |
| POST | `/api/v0/answers/addClipUrlScript` | Body: `{ id: [id] }` | Regenerate clip share URL |
| POST | `/api/v0/answers/getSimilarClips` | Body: clip | Get similar clips |
| POST | `/api/v0/answers/copyTagsFromSimilarClips` | Body: clip | Copy tags from similar |
| POST | `/api/v0/answers/uploadAlternateImage` | Body: clip | Upload alternate image |
| POST | `api/v0/create/clip/ai/intro` | Body: `{ clipId }` | Generate AI intro |
| GET | `/api/v0/answers/getHarkVoiceCategories` | — | Daily Clips categories |
| POST | `/api/v0/voicehark/clip/:id` | Body: `{ voiceHark, harkVoiceCategory }` | Add/remove from Daily Clips |

For **answers** (clip) entity, tags/genres/tones use `type: 'answers'` and `entity: answerId`.

---

## 5. Suggested Clips (for Question Detail)

| Method | Endpoint | Request | Response / Notes |
|--------|----------|---------|------------------|
| GET | `api/v0/dashboard/clipsuggestions?question=:id` | Query: `question` (or options object with `showAll`) | Suggested clips for question |
| POST | `/api/v0/answers/updatesuggestion` | Body: `{ answerId, questionId, status }` | Approve (`status: true`) or Reject (`status: false`) |

---

## 6. Tags / Genres / Tones

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/tags?from=&limit=&...` | Query: from, limit, isolated, level, showHidden | List tags (for Select options) |
| POST | `/api/v0/tags` | Body: `{ name: string }` | Create new tag; returns e.g. `{ _id, name }` |
| POST | `/api/v0/entity/tags` | Body: `{ entity: id, type: 'questions', tags: ids[] }` | Set tags on question (type can be questions/answers/podcast/series) |
| GET | `/api/v0/genres?from=&limit=&...` | Same pattern as tags | List genres |
| POST | `/api/v0/genres` | Body: `{ name: string }` | Create new genre; returns e.g. `{ _id, name }` |
| POST | `/api/v0/entity/genres` | Body: `{ entity: id, type: 'questions', genres: ids[] }` | Set genres on question |
| GET | `/api/v0/tones?from=&limit=&...` | Same pattern | List tones |
| POST | `/api/v0/tones` | Body: `{ name: string }` | Create new tone; returns e.g. `{ _id, name }` |
| POST | `/api/v0/entity/tones` | Body: `{ entity: id, type: 'questions', tones: ids[] }` | Set tones on question |

- For **questions** detail: type is `'questions'`; entity is question `_id`; ids are tag/genre/tone `_id` arrays.

### Tags / Genres / Tones on Question Detail

- **Source**: GET question detail (`/api/v0/dashboard/questions/:id`) returns `res.tags`, `res.genres`, `res.tones` — each an array of `{ _id, name, allParentTags }` (each `allParentTags` is an array of `{ _id, name }`). Use these to set the current Select value. Dropdown options come from the list APIs above (e.g. GET `/api/v0/tags?limit=0`).
- **Set on question**: Always use `type: 'questions'` and `entity: questionId`; send the full array of tag/genre/tone `_id`s. The set APIs are called on every add/remove from the multi-select, and optionally again when the user clicks "Save Tag" / "Save Genre" / "Save Tone".
- **Create then set**: When the user adds a new option (no `id`), call the create API (POST `/api/v0/tags`, `/api/v0/genres`, or `/api/v0/tones` with body `{ name }`); use the returned `_id` in state, then call the set-entity API with the full ids array including the new id.

---

## 7. Colors

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/colors` | — | List preset colors (for color modal) |

---

## 8. Categories (Schedule / Add Slot)

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/categories/all?qs=` | Optional qs | List categories (for schedule modal) |
| POST | `/api/v0/categories/playlists/:playlistId` | Body: `{ categoryId, scheduleTime }` | Schedule playlist to category (scheduleTime: Unix ms) |

---

## 9. Sponsors / Partners (Entity link to question)

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/sponsors?from=&limit=` | Query | List sponsors |
| GET | `/api/v0/sponsors/:id` | — | Sponsor detail (includes `data.links`) |
| POST | `/api/v0/entity/sponsors` | Body: `{ sponsorId, entity (questionId), linkId? }` | Add/update sponsor on question |
| DELETE | `/api/v0/entity/sponsors` | Body: `{ sponsorId, entity }` | Remove sponsor from question |
| GET | `/api/v0/partners?from=&limit=` | Query | List partners |
| GET | `/api/v0/partners/:id` | — | Partner detail (links if needed) |
| POST | `/api/v0/entity/partners` | Body: `{ partnerId, entity (questionId) }` | Add/update partner on question |
| DELETE | `/api/v0/entity/partners` | Body: `{ partnerId, entity }` | Remove partner from question |

---

## 10. Members (Host search / Host on question)

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/dashboard/dashboard-members/?limit=600&qs=` | Query: limit, qs, from, sort, etc. | Search members (e.g. host search; debounced by qs) |
| POST | `api/v0/dashboard/questions/host` | Body: `{ hostId: member._id, _id: questionId }` | Set host on question |
| DELETE | `api/v0/dashboard/questions/host` | Body: `{ _id: questionId }` | Remove host from question |

---

## 11. File Upload (Intro / Outro / Share image)

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/v0/external/uploadIntro` | **FormData**: `data.append('file', file)` (audio mp3 or image) | `{ location }` — use `location` as contentURI or customImagePath |

- **Content-Type**: `multipart/form-data` or `application/json` per backend; current app uses FormData and sometimes custom headers.
- Used for: playlist intro audio, playlist outro audio, custom share image.

---

## 12. Hark Search (ReorderClips / search list)

| Method | Endpoint | Request | Notes |
|--------|----------|---------|--------|
| GET | `/api/v0/entities/hark-search?qs=&from=&limit=&type=&isAddedToSeries=` | Query | Search Hark lists/playlists (e.g. for repost / move clip) |

---

## 13. Starred Clips / Voice Hark (Daily Clips)

- Used by AnswerList and ReorderClips: add/remove from “Daily Clips” (Voice Hark). Exact endpoints can be added from `voiceHark.js` / `starredClips.js` if you need them in the new repo.

---

## 14. Redux / State (Conceptual)

- **questions**: `data` (current question detail), `clipQuestion` (suggested clips).
- **answers**: `list`, `totalAnswers`, `currentPage`, `pageSize`, `hasMore`, filter state (qs, fromDate, toDate, etc.).
- **user**: `isAdmin`, `isCurator`, `isVerified`, etc. for permission and redirects.

---

## How to use in a new repo

1. **API client**: Create a single client (e.g. `lib/api.js`) that uses `BASE_URL` and the same request shape (withCredentials, headers).
2. **Services**: One module per domain (questions, answers, tags, genre, tone, color, category, sponsor, partner, members, upload) that call the endpoints above.
3. **Component specs**: Use this reference together with `QUESTION_DETAIL_COMPONENT_SPEC_DETAIL.md` (and other detail specs) so every UI action maps to the correct service and payload.

---

*Document generated from Hark Dashboard codebase for building components in a different repo.*
