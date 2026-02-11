# Answer Detail (Clip Detail) — Component Spec

This document describes the **Answer Detail** (single clip/answer) screen: behavior, data loading, save, and all APIs. Use it as context to reimplement the same component in a new repo (e.g. React 18+, Tailwind, shadcn UI).

**Containers**: Multiple containers share the same pattern; route depends on clip type: `AnswersDetail.js` (default clip), `AnswersDetailVoiced.js`, `AnswersDetailAudioBook.js`, `AnswersDetailVanillaAudio.js`, `AnswersDetailVanillaVideo.js`.

---

## Purpose and Routes

- **Routes** (by clip type): `/clip/detail/:id` (default), `/voicedclip/detail/:id`, `/audiobook/detail/:id`, `/vanillaAudio/detail/:id`, `/vanillaVideo/detail/:id`. Param `id` is the answer/clip ID.
- **Behavior**: Single clip view/edit: title, description, player, start/end time, intros, share image, tags/genres/tones, meta tags, clip link, repost, notes, star, Daily Clips, etc. Permission: admin, curator, or clip owner can edit/delete.

---

## Data Loading (getData)

On mount, call `getData(answersId)` with `answersId = match.params.id`.

| # | Call | API | Purpose |
|---|------|-----|---------|
| 1 | fetchAllTags({ limit: 0 }) | GET `/api/v0/tags?limit=0` | Tag select options |
| 2 | fetchGenreTags({ limit: 0 }) | GET `/api/v0/genres?limit=0` | Genre select options |
| 3 | fetchToneTags({ limit: 0 }) | GET `/api/v0/tones?limit=0` | Tone select options |
| 4 | fetchAllMembers({ limit: 100 }) | GET `/api/v0/dashboard/dashboard-members/?limit=100` | Member list (e.g. Found By search) |
| 5 | fetchAllAnswersDetail(answersId, callback) | GET `/api/v0/dashboard/answers/:id` | **Primary clip data** |
| 6 | fetchSocialtext(answersId) | GET `api/v0/answers/:id/socialtext` | Quote, revelation, socialCopy |
| 7 | fetchAllAnswers({ question: questionId }) | GET dashboard-answers?question=... | Clips in same question (related list) |
| 8 | fetchMultipleNotes({ answer: answersId }) | Notes API | Comments/notes for this clip |

**Primary response** (from #5): title, description, subText, tags, genres, tones, customAttributes (podcast, podcastIntro, aiIntro, altPodcastIntro, forYouIntro), share image path, metaTag, clipLink, foundBy, voiceHarkClip, creator, question, creationDate, etc. Map tags/genres/tones to Select shape (label, value, id, parentTags) same as Question Detail. Map startTime/endTime from customAttributes.podcast or customAttributes.audiobook. Share image URL: `${IMAGE_PATH}/img/answers/card/${id}.png`.

On unmount: `clearAnswerDetail()` to reset Redux answer detail state.

---

## Key Sections (UI)

- **Title**: Editable; character count; save with editAnswerDetail.
- **Description / subText**: Editables; saved in answer payload.
- **CustomPlayer**: Audio from customAttributes.podcast (or type-specific); start/end time from state.
- **Start / End time**: Trimmer or time inputs; validation: end > start, end <= clip duration; saved as podcast.startTime, podcast.endTime (or audiobook equivalent).
- **Podcast intro**: Display or edit; upload via uploadPodcastIntro2 (alt intro). Upload: POST `/api/v0/external/uploadIntro` (FormData `file`), then send contentURI in payload.
- **AI intro / forYou intro**: Edit and save in answer object (aiIntro, forYouIntroDescription).
- **Share image**: Display `${IMAGE_PATH}/img/answers/card/${id}.png`; upload same as Question Detail (POST `/api/v0/external/uploadIntro`, FormData `file`); optional delete/custom path in save.
- **Tags / Genres / Tones**: CreatableSelect multi-select; type **`'answers'`**; entity = answerId. Set: POST `/api/v0/entity/tags` (genres, tones) body `{ entity: answerId, type: 'answers', tags: ids }` (or genres/tones). Create new: POST `/api/v0/tags`, `/api/v0/genres`, `/api/v0/tones` with body `{ name }`; then set entity with new id. Same mapping and parent-tags behavior as Question Detail.
- **Found By**: Member search (fetchAllMembers with qs); add: addFoundByIntoClip(memberId, clipId); remove: deleteFoundByIntoClip(clipId).
- **Meta tags**: Title and description (SEO); submit: metaTagDetails(meta) POST `/api/v0/dashboard/answer/metaTags`.
- **Clip link**: Title and URL; updateClipLinkDetails POST `/api/v0/dashboard/answer/cliplink`.
- **Repost**: Search Hark lists (searchHarkList); select question; repostClip(questionId, answerId) POST `/api/v0/answers/repost`.
- **Regenerate assets**: regenerateAssets (video/share URL), regenerateImageAssets (image).
- **Similar clips**: getSimilarClips, copyTagsFromSimilarClips.
- **Star**: updateStarredClip.
- **Daily Clips (Voice Hark)**: Same as AnswerList — getHarkVoiceCategories, updateVoiceHarkClip(clipId, isVoiceHark, categoryId).
- **Delete**: Confirm modal; deleteFromAnswerDetail(id) DELETE `/api/v0/answers/:id`; then redirect (e.g. back to list or question).

---

## Save (editAnswerDetail)

**Endpoint**: POST `/api/v1/answers/:id`

**Body** (build from state; omit null/undefined): title, questionId, description, forYouIntroDescription, aiIntro, podcastLink, rawText, subText, updateTime, podcastIntro (object or null), podcast (include startTime, endTime), isNewStartEndTime, isCustomImagePath, customImagePath. For share image: if deleted set isCustomImagePath false; if uploaded set customImagePath (S3 URL) and isCustomImagePath true.

**Validation before save**: endTime > 0 (e.g. "EndTime must be greater than 5 sec."), endTime > startTime, endTime <= clip duration. On error show message and optionally refetch.

**After success**: reset local edit state, call getData(clipId).

---

## API Reference (Answer Detail)

| Purpose | Method | Endpoint | Request / notes |
|---------|--------|----------|------------------|
| Get clip detail | GET | `/api/v0/dashboard/answers/:id` | Response: full answer object |
| Edit clip | POST | `/api/v1/answers/:id` | Body: see Save above |
| Delete clip | DELETE | `/api/v0/answers/:id` | — |
| Apply to all (episode) | POST | `/api/v1/answers/:id?applyToAll=true&copyAll=&copyAllTags=&...` | Body: answer object; query copyAll, copyAllTags, copyAllDuration, copyAllTitleDesc |
| Regenerate video/share URL | POST | `/api/v0/answers/addClipUrlScript` | Body: `{ id: [id] }` |
| Regenerate image assets | POST | `/api/v0/sendImageAssetGenration` | Body: `{ id: +id }` |
| Upload podcast (alt) intro | POST | `api/v0/dashboard/answers/altintro/:answerId` | Body: podcast intro object |
| Delete podcast alt intro | POST | `api/v0/dashboard/answers/altintro/:answerId` | — |
| Meta tags | POST | `/api/v0/dashboard/answer/metaTags` | Body: `{ id, title?, description? }` |
| Clip link | POST | `/api/v0/dashboard/answer/cliplink` | Body: clipLink object |
| Upload clip audio manually | POST | `/api/v0/dashboard/upload/clip/audio` | Body: clip object |
| Lock clip audio URL | POST | `/api/v0/dashboard/lock/clip/audio` | Body: clip object |
| Get similar clips | POST | `/api/v0/answers/getSimilarClips` | Body: clip |
| Copy tags from similar clips | POST | `/api/v0/answers/copyTagsFromSimilarClips` | Body: clip |
| Upload alternate image | POST | `/api/v0/answers/uploadAlternateImage` | Body: clip |
| Generate AI intro | POST | `api/v0/create/clip/ai/intro` | Body: `{ clipId }` |
| Found By — add | POST | `api/v0/dashboard/answers/foundBy` | Body: `{ foundById, _id }` |
| Found By — remove | DELETE | `api/v0/dashboard/answers/foundBy` | Body: `{ _id }` |
| Repost clip | POST | `/api/v0/answers/repost` | Body: `{ questionId, answerId }` |
| Search Hark lists | GET | `/api/v0/entities/hark-search?type=question-create-clip&qs=&from=&limit=` | For repost modal |
| Get social text | GET | `api/v0/answers/:id/socialtext` | Quote, revelation, socialCopy |
| Save social text | POST | `api/v0/answers/:id/socialtext` | Body: quote / revelation / socialCopy |
| Daily Clips — categories | GET | `/api/v0/answers/getHarkVoiceCategories` | — |
| Daily Clips — add/remove | POST | `/api/v0/voicehark/clip/:id` | Body: `{ voiceHark, harkVoiceCategory }` |
| Set tags on answer | POST | `/api/v0/entity/tags` | Body: `{ entity: answerId, type: 'answers', tags: ids }` |
| Set genres on answer | POST | `/api/v0/entity/genres` | Body: `{ entity: answerId, type: 'answers', genres: ids }` |
| Set tones on answer | POST | `/api/v0/entity/tones` | Body: `{ entity: answerId, type: 'answers', tones: ids }` |
| Upload share image / intro | POST | `/api/v0/external/uploadIntro` | FormData `file`; response `{ location }` |

---

## Modals (Summary)

| Modal | When | Content / actions |
|-------|------|-------------------|
| Confirm delete | Delete button | "Are you sure..."; Delete → deleteFromAnswerDetail; Cancel. |
| Repost | Repost button | Search Hark list; select question; Repost → repostClip(questionId, answerId). |
| Apply to all | Apply to all (episode) | Select option (copyAll, copyAllTags, etc.); Apply → applyToAllDetail. |
| Notes / comments | Notes section | List notes; add/edit/delete via notes APIs. |
| Daily Clips | Add/Remove Daily Clips | Category dropdown (when adding); Confirm → updateVoiceHarkClip. |
| Star | Star / Unstar | Confirm → updateStarredClip. |
| Similar clips | Similar clips action | Show list; optional copy tags → copyTagsFromSimilarClips. |

---

## Config

- **BASE_URL**: API base.
- **IMAGE_PATH**: Share image URL `${IMAGE_PATH}/img/answers/card/${id}.png` (optional cache buster).
- **WEB_URL**: "View on Web" link if applicable.

---

## Reusable Primitives

- Modal, DatePicker, EmptyCard, CustomPlayer/OldCustomPlayer, CreatableSelect/Select (tags, genres, tones), SketchPicker (if used), AudioTrimmerComponent or equivalent, TimePicker/inputs for start/end, Search input with member suggestions (Found By).

---

*Use with SERVICES_AND_API_REFERENCE.md and QUESTION_DETAIL_COMPONENT_SPEC_DETAIL.md for tags/genres/tones mapping. For the clips list, see ANSWER_LIST_COMPONENT_SPEC.md.*
