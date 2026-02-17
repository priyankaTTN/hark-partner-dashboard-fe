# Answers Detail Component — Spec for New Repo

This document describes the **Answers Detail** container: waveform/clip editing, timepicker (start/end + tenths), edit mode flow, time conversion and validation, and **services/API** so a similar component can be implemented in a new repo.

**Main file**: `src/containers/Answers/AnswersDetail.js`. Related: `AudioTrimmerComponent`, `CustomPlayer`, antd `TimePicker`, answers actions and services.

---

## Implementation in this repo (dashboardFE)

- **ClipDetail** (`src/pages/ClipDetail.tsx`) implements this spec:
  - **View vs edit**: When not in edit mode or when **Lock clip audio** is checked, only the playback waveform (AudioTrimmer in `viewOnly`) is shown. When in edit mode and not locked, the editable AudioTrimmer plus **Start/End time (HH:mm:ss + tenths)** form is shown.
  - **Time**: Stored as seconds (float); UI uses HH:mm:ss input + tenths (0–9) dropdown. Helpers: `secondsToClipTime` / `clipTimeToSeconds` in `src/lib/utils.ts`. No antd/moment — native inputs + `<select>` for tenths.
  - **Trimmer audio URL**: `customAttributes.podcast.s3audioUrl` → `audioUrl` → `clipAudioUrl`. **Peaks URL**: `IMAGE_PATH/episode-waveforms/{podcastSlug}/{episodeSlug}/10pps.json` when slugs exist.
  - **Validation** before save: end time > 0, end ≥ start, end ≤ duration; error message shown and save blocked.
  - **Lock/Unlock**: Checkbox calls `lockClipAudioUrl({ clipId, isAudioLocked })` (POST `/api/v0/dashboard/lock/clip/audio`). When locked, trimmer and time form are hidden.
  - **Save payload**: `podcast: { startTime, endTime }` (numbers), `isNewStartEndTime` when user changed times. Cancel refetches detail to reset state.

---

## Contents

Overview → **Waveform and clip UI** → **Timepicker and tenths** (libraries: **antd** + **moment**) → **Edit mode and Save flow** → **Time conversion and validation** → **State** → **Services and API** → **Dependencies** → **File structure** → **Summary**.

---

## Overview

AnswersDetail is the **clip/answer detail** page. It:

- Loads a single answer (clip) by ID from the route (`/clip/:id` or similar).
- Shows **clip metadata** (title, description, subText, tags, genres, tones, share image, intros, etc.).
- Provides **waveform + trim**: in view mode shows **CustomPlayer** (playback with inline start/end); in **edit mode** (when not audio-locked) shows **AudioTrimmerComponent** plus **TimePicker** + **tenths dropdowns** for precise start/end.
- Supports **Edit** / **Save** / **Cancel**, **Apply to All**, **Lock/Unlock clip audio**, **Upload Clip** (manual), and many other actions (repost, regenerate assets, meta tags, etc.).

This spec focuses on: **waveform edit**, **timepicker**, **time handling**, and **services** so the same behavior can be rebuilt elsewhere.

---

## Waveform and Clip UI

### Two modes: view vs edit

| Condition | What is shown |
|-----------|----------------|
| **View** (`!editTitle` or `isAudioLocked`) and clip has `endTime` and `audioUrl` | **CustomPlayer** only: playback with start/end handles and optional timepickers inside the player. |
| **Edit** (`editTitle && !isAudioLocked`) and `trimmerAudioUrl` exists | **AudioTrimmerComponent** (waveform + region) **and** below it the **TimePicker + tenths** form. |
| **Edit** and no trimmer URL | Only the **TimePicker + tenths** form (no waveform). |

### Audio URL for trimmer

```js
const trimmerAudioUrl =
  (((this.state || {}).podcast || {}).s3audioUrl) ||
  (((this.state || {}).podcast || {}).audioUrl) ||
  (((this.state || {}).podcast || {}).clipAudioUrl);
```

- Prefer S3 URL for trimmer when available; otherwise episode/clip URL.

### Peaks URL (waveform data)

Pre-generated peaks JSON is used when episode has `podcastSlug` and `episodeSlug`:

```js
const episodeData = ((((answerData || {}).customAttributes || {}).podcast) || {});
const peaksUrl = (episodeData.podcastSlug && episodeData.episodeSlug)
  ? `${constant.IMAGE_PATH}/episode-waveforms/${episodeData.podcastSlug}/${episodeData.episodeSlug}/10pps.json`
  : null;
```

- `constant.IMAGE_PATH` is from config (e.g. CDN/base for static assets).
- If no peaks URL, AudioTrimmerComponent can still load waveform from audio (slower).

### Active clip (start/end in seconds)

Start/end are stored as **HH:mm:ss** + **tenths** (0–9). For the trimmer they are converted to **seconds (float)**:

```js
const toSecondsWithTenth = (hhmmss, tenth) => {
  try {
    const parts = (hhmmss || '00:00:00').split(':');
    const sec = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    const t = Math.max(0, Math.min(9, +tenth || 0));
    return sec + t / 10;
  } catch (e) { return 0; }
};
const activeStartSec = toSecondsWithTenth(this.state.startTime, this.state.milisec);
const activeEndSec = toSecondsWithTenth(this.state.endTime, this.state.milisecEnd);
```

**AudioTrimmerComponent** receives:

- `audioUrl={trimmerAudioUrl}`
- `duration` from `podcast.duration` or `customAttributes.podcast.duration`
- `activeClip={{ startTime: activeStartSec, endTime: activeEndSec, title, description }}`
- `peaksUrl={peaksUrl}`
- `onTrimChange={this.onTrimChange}`
- `hideEditingControls={true}` (AnswersDetail does not show Create Clip etc. in the trimmer)
- `showCreateClipButton={false}`

### Trim change callback (waveform → state)

When the user drags the region in the trimmer, the parent receives **seconds (float)** and converts back to **HH:mm:ss + tenths**:

```js
onTrimChange = (startSeconds, endSeconds) => {
  try {
    const toParts = (sec) => {
      const whole = Math.floor(sec || 0);
      const hhmmss = moment.utc(whole * 1000).format('HH:mm:ss');
      const tenth = Math.max(0, Math.min(9, Math.round(((sec || 0) - whole) * 10)));
      return { hhmmss, tenth };
    };
    const s = toParts(startSeconds);
    const e = toParts(endSeconds);
    this.setState({
      startTime: s.hhmmss,
      endTime: e.hhmmss,
      milisec: s.tenth,
      milisecEnd: e.tenth,
      isNewStartEndTime: true
    });
  } catch (_) {}
};
```

- **moment**: `moment.utc(whole * 1000).format('HH:mm:ss')` for HH:mm:ss.
- Tenths are 0–9 (one decimal place); backend may store as `preciseStartTime` / `preciseEndTime`.

---

## Timepicker and Tenths

### Libraries used for time

| Library | Package | Purpose |
|---------|---------|---------|
| **Ant Design** | `antd` | **TimePicker** component for start/end time (HH:mm:ss). Import: `import { TimePicker, Input } from 'antd';` — also use `'antd/dist/antd.css'`. |
| **Moment.js** | `moment` | Parse and format times: e.g. `moment(this.state.startTime, 'HH:mm:ss')` for TimePicker `value`, `moment.utc(whole * 1000).format('HH:mm:ss')` to convert seconds → HH:mm:ss. |

So: **time picker UI** = **antd TimePicker**; **time parsing/formatting** = **moment**.

### When shown

- **Edit mode** and **not audio locked**: a form below the trimmer (or alone if no trimmer) shows:
  - **Start Time**: antd **TimePicker** + **tenths** dropdown (0–9).
  - **End Time**: antd **TimePicker** + **tenths** dropdown (0–9).

### TimePicker (antd)

- **Start**: `value={moment(this.state.startTime, 'HH:mm:ss')}`, `onChange={(time, timeString) => this.startChange(time, timeString, answerData)}`, `showNow={false}`.
- **End**: same pattern with `endTime` and `endChange`.
- **Format**: `HH:mm:ss` (no date; time only).

### Tenths dropdown

- **Options**: `dropArray = [0,1,2,3,4,5,6,7,8,9]`.
- **Start tenths**: `value={this.state.milisec}`, `onChange={(e) => this.startMili(e.target.value)}`; display as `0` or `.1` … `.9`.
- **End tenths**: `value={this.state.milisecEnd}`, `onChange={(e) => this.endMili(e.target.value)}`.

### Handlers

```js
startChange = (time, timeString, item) => {
  this.setState({ startTime: timeString, endTime: this.state.endTime, isNewStartEndTime: true });
};
endChange = (time, timeString, item) => {
  this.setState({ endTime: timeString, startTime: this.state.startTime, isNewStartEndTime: true });
};
startMili = (milisec) => { this.setState({ milisec: +milisec }); };
endMili = (milisecEnd) => { this.setState({ milisecEnd: +milisecEnd }); };
```

- `timeString` is already `HH:mm:ss` from antd TimePicker.

---

## Edit Mode and Save Flow

### Entering edit mode

- User clicks **Edit** in the action list.
- State: `editTitle: true` (and often `editDescription`, `editAiIntro`, `editforYouIntroDescription`, `editSubText` toggled together).

### Exiting edit mode

- **Save**: `saveAnswerDetail(answerData)` (see below); on success `resetState()` then `getData(clipId)`.
- **Cancel**: `cancelQuestionDetail()` resets local state and calls `getData(answerId)`.

### Save button visibility

- Save/Cancel block is shown when any of: `editTitle`, `editDescription`, `editAiIntro`, `editforYouIntroDescription`, `editSubText` is true.
- **Save** calls `saveAnswerDetail(answerData)`.

### Lock / Unlock clip audio

- Checkbox **Lock/Unlock the clip** bound to `isAudioLocked`.
- `handleLockAudioChange(event)`: set `isAudioLocked` from checkbox, then call **lockClipAudioUrl** service with `{ clipId, isAudioLocked }`.
- When **audio is locked**, trimmer and time-based editing are hidden; only CustomPlayer (view) is shown.

### Upload Clip (manual)

- **Upload Clip** opens a modal; user uploads an audio file and optionally enters duration.
- On submit: **uploadClipManually** with payload `{ audioUrl: uploadedAudioUrl, duration: durationM, clipId }`.
- Service: `POST /api/v0/dashboard/upload/clip/audio`.

---

## Time Conversion and Validation

### HH:mm:ss + tenths → seconds (for API / checks)

**Start** (with optional tenths from state):

```js
updateTime = (timeString) => {
  let hms = timeString.split(':');
  if (this.state.milisec) {
    return (+hms[0]) * 3600 + (+hms[1]) * 60 + (+hms[2]) + '.' + this.state.milisec;
  }
  return (+hms[0]) * 3600 + (+hms[1]) * 60 + (+hms[2]);
};
```

**End** (uses `milisecEnd`):

```js
updateTimeForEnd = (timeString) => {
  let hms = timeString.split(':');
  if (this.state.milisecEnd) {
    return (+hms[0]) * 3600 + (+hms[1]) * 60 + (+hms[2]) + '.' + this.state.milisecEnd;
  }
  return (+hms[0]) * 3600 + (+hms[1]) * 60 + (+hms[2]);
};
```

- If time comes from TimePicker string, use `moment.utc(this.state.startTime).format("HH:mm:ss")` when needed.
- Regex for plain string validation: `/^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/`.

### saveAnswerDetail validation (before API)

1. **End time > 0** (e.g. “EndTime must be greater than 5 sec” in current copy).
2. **End ≥ start** (“start time cannot be greater than end time”).
3. **End ≤ duration** (“end time cannot be greater than clip duration”).

On violation, call **errorTimeError(message, callback)** (e.g. toast + callback to reset/getData). On success, build **answerObject** and call **editAnswerDetail(clipId, answerObject, callback)**.

### Payload for edit (clip times)

Relevant fields in the object passed to **editAnswerDetail**:

- `podcast: { ...this.state.podcast, startTime: start, endTime: end }` — `start` and `end` are the **numeric** values from `updateTime` / `updateTimeForEnd` (seconds, possibly with tenths as decimal).
- `isNewStartEndTime: this.state.isNewStartEndTime` — so backend can regenerate clip audio if needed.

Other fields in the same payload: `title`, `description`, `forYouIntroDescription`, `aiIntro`, `podcastLink`, `subText`, `updateTime`, `podcastIntro`, share image flags, etc.

---

## State (relevant to waveform and timepicker)

| Key | Type | Purpose |
|-----|------|---------|
| `editTitle` | boolean | Edit mode; when true and not locked, show trimmer + timepickers. |
| `startTime` | string (HH:mm:ss) or moment | Start time for clip. |
| `endTime` | string (HH:mm:ss) or moment | End time for clip. |
| `milisec` | number 0–9 | Tenths for start. |
| `milisecEnd` | number 0–9 | Tenths for end. |
| `isNewStartEndTime` | boolean | True when user changed start/end (trimmer or timepicker). |
| `isAudioLocked` | boolean | When true, hide trimmer/timepicker and show only CustomPlayer. |
| `podcast` | object | From answer detail; includes `audioUrl`, `s3audioUrl`, `clipAudioUrl`, `duration`, `startTime`, `endTime`, etc. |
| `customAttributes` | object | Contains `podcast` (and optionally `audiobook`) for episode metadata. |
| `answerData` | object | Full answer/clip from API. |

Initial start/end from API (in **getData** callback):

- Source: `res.customAttributes.audiobook` or `res.customAttributes.podcast`.
- `startTime = moment.utc(res.customAttributes.podcast.startTime * 1000)` (or audiobook equivalent).
- `endTime = moment.utc(res.customAttributes.podcast.endTime * 1000)`.
- Tenths from `preciseStartTime` / `preciseEndTime` or from decimals of `startTime`/`endTime` (e.g. `parseInt(..., 10)` on the fractional part).

---

## Services and API

### Service layer (`src/services/answers.js`)

| Method | HTTP | Endpoint | Body / params | Purpose |
|--------|------|----------|----------------|---------|
| **fetchAllAnswersDetail** | GET | `/api/v0/dashboard/answers/${id}` | — | Load single answer/clip detail. |
| **editAnswerDetail** | POST | `/api/v1/answers/${id}` | answerObj | Update clip (title, description, podcast.startTime/endTime, etc.). |
| **applyToAllDetail** | POST | `/api/v1/answers/${id}?applyToAll=true&copyAll=...` | answerObj + query params | Apply edit to multiple clips. |
| **deleteFromAnswerDetail** | DELETE | `/api/v0/answers/${id}` | — | Delete clip. |
| **lockClipAudioUrl** | POST | `/api/v0/dashboard/lock/clip/audio` | `{ clipId, isAudioLocked }` | Lock/unlock clip audio (disables trim/edit). |
| **uploadClipManually** | POST | `/api/v0/dashboard/upload/clip/audio` | `{ audioUrl, duration, clipId }` | Upload manual clip audio. |
| **uploadPodcastIntro2** | POST | `api/v0/dashboard/answers/altintro/${answerId}` | intro object | Upload alt podcast intro. |
| **deletePodcastIntro2** | POST | `api/v0/dashboard/answers/altintro/${answerId}` | — | Delete alt intro. |
| **regenerateAssets** | POST | `/api/v0/answers/addClipUrlScript` | `{ id: [id] }` | Regenerate clip URL/assets. |
| **regenerateImageAssets** | POST | `/api/v0/sendImageAssetGenration` | `{ id: +id }` | Regenerate image assets. |
| **fetchSocialtext** | GET | `api/v0/answers/${id}/socialtext` | — | Social copy, quote, revelation. |
| **socialtext** | POST | `api/v0/answers/${id}/socialtext` | `{ socialCopy \| revelation \| quote }` | Save social text. |
| **metaTagDetails** | POST | `/api/v0/dashboard/answer/metaTags` | meta object | Meta tags. |
| **updateClipLinkDetails** | POST | `/api/v0/dashboard/answer/cliplink` | clipLink object | Clip link. |
| **getSimilarClips** | POST | `/api/v0/answers/getSimilarClips` | clip | Similar clips. |
| **copyTagsFromSimilarClips** | POST | `/api/v0/answers/copyTagsFromSimilarClips` | clip | Copy tags from similar. |
| **uploadAlternativeImage** | POST | `/api/v0/answers/uploadAlternateImage` | clip | Alternate image. |
| **generateAIIntro** | POST | `api/v0/create/clip/ai/intro` | `{ clipId }` | Generate AI intro. |
| **getEpisodeS3Url** | POST | `api/v0/external/getepisodes3url` | episode | Get episode S3 URL. |

### Direct axios (in container)

- **Episode audio (move to S3)**:
  - `POST ${BASE_URL}/api/v0/dashboard/episodeAudio`
  - Body: `{ audioUrl, podcastSlug, episodeSlug, episodeId, duration }`
  - Used when “moving” episode to S3; then `getData(clipId)` refreshes.

### Redux actions (`src/actions/answers.js`)

Actions used by AnswersDetail for the above:

- **fetchAllAnswersDetail(id, cb)** — loads detail; callback receives `res.data` (or transformed for SXM).
- **editAnswerDetail(id, answerObj, cb)** — saves clip; callback after success (e.g. reset + getData).
- **applyToAllDetail(id, answerObj, applyOption, cb)** — apply edit to all with selected option.
- **deleteFromAnswerDetail(id, callback)**.
- **lockClipAudioUrl(clip, cb)** — clip = `{ clipId, isAudioLocked }`.
- **uploadClipManually(payload, cb)** — payload = `{ audioUrl, duration, clipId }`.
- **uploadPodcastIntro2(intro, id, callback)**, **deletePodcastIntro2(id, callback)**.
- **errorTimeError(message, cb)** — show error toast and run callback (e.g. getData).
- **regenerateAssets(id)**, **regenerateImageAssets(id)**.
- **fetchSocialtext(id, cb)**, **socialtext(id, type, data, cb)**.
- **metaTagDetails(options, cb)**, **updateClipLinkDetails(options, cb)**.
- **getSimilarClips(clip, cb)**, **copyTagsFromSimilarClips(clip, cb)**.
- **uploadAlternativeImage(clip, cb)**, **generateAIIntro(clipId, cb)**.

### editAnswerDetail payload (summary)

For **clip time** and core fields, the body typically includes:

- `title`, `questionId`, `description`, `forYouIntroDescription`, `aiIntro`, `podcastLink`, `rawText`, `subText`, `updateTime`
- `podcastIntro` (intro object or null)
- `podcast: { ...podcast, startTime, endTime }` — **startTime/endTime as numbers** (seconds, with optional decimal for tenths)
- `isNewStartEndTime`
- Optional: `isCustomImagePath`, `customImagePath`, share image flags

Apply-to-all uses the same shape plus query: `applyToAll=true&copyAll=...|copyAllTags=...|copyAllDuration=...|copyAllTitleDesc=...`.

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| **React** (class component) | AnswersDetail. |
| **react-redux** | connect, mapStateToProps, mapDispatchToProps. |
| **react-router** | match.params.id, history. |
| **antd** | Time picker UI: `TimePicker` (start/end), `Input` (e.g. checkbox). Import: `import { TimePicker, Input } from 'antd';` and `import 'antd/dist/antd.css';` |
| **moment** | Time parsing and formatting: `moment(value, 'HH:mm:ss')`, `moment.utc(ms).format('HH:mm:ss')`. Used for TimePicker `value` and for converting seconds ↔ HH:mm:ss. |
| **AudioTrimmerComponent** | Waveform + region; see AUDIO_TRIMMER_COMPONENT_SPEC. |
| **CustomPlayer** | View-mode playback with start/end. |
| **config** | BASE_URL, IMAGE_PATH, etc. |
| **constant** | IMAGE_PATH for peaks URL. |
| **actions (answers, notes, tags, …)** | All answer and related Redux actions. |
| **services (answers)** | API calls above. |

---

## File Structure (reference)

```
src/
  config/ or config/index.js       # BASE_URL, IMAGE_PATH, WEB_URL
  utils/constant.js                 # Re-exports config
  utils/formattedDate.js            # formattedDate, currentDate, formatISODATE
  actions/answers.js                # fetchAllAnswersDetail, editAnswerDetail, lockClipAudioUrl, ...
  services/answers.js              # Same API methods
  services/network.js              # fetchAPI
  components/
    AudioTrimmerComponent.js        # Waveform + region; onTrimChange(startSec, endSec)
    CustomPlayer.js                # View-mode player with start/end
    DatePicker / Modals / ...       # UI
  containers/Answers/
    AnswersDetail.js               # Main container (waveform edit, timepicker, save flow)
  docs/
    ANSWERS_DETAIL_COMPONENT_SPEC.md
    AUDIO_TRIMMER_COMPONENT_SPEC.md
```

---

## Summary

- **View mode**: CustomPlayer with start/end; no timepicker form.
- **Edit mode** (and not locked): AudioTrimmerComponent (when trimmerAudioUrl exists) + TimePicker (start/end) + tenths dropdowns (0–9); trim changes and timepicker changes both update the same state (`startTime`, `endTime`, `milisec`, `milisecEnd`, `isNewStartEndTime`).
- **Time**: Stored and displayed as HH:mm:ss + tenths; converted to/from seconds for trimmer and API; validation (end > 0, end ≥ start, end ≤ duration) before **editAnswerDetail**.
- **Services**: Detail load GET, edit POST to `/api/v1/answers/:id`, lock/upload clip POSTs to dashboard endpoints; apply-to-all same edit with query params; all other endpoints as in the table above.
- **Lock/Unlock**: Checkbox calls **lockClipAudioUrl**; when locked, trimmer and timepicker are hidden.
- **Manual upload**: Modal → **uploadClipManually** with `audioUrl`, `duration`, `clipId`.

Use this spec together with **AUDIO_TRIMMER_COMPONENT_SPEC.md** to implement the same waveform edit and timepicker behavior and services in a new repo.
