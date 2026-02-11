# Curation Groups — Services, Filters, Actions & Components

This document describes the **Curation Groups** feature: services, API details, filters, action links, and internal components.

---

## 1. Route & Entry

| Item | Value |
|------|--------|
| **Route** | `/curation-group` |
| **Route name** | Curation Group |
| **Container** | `CurationGroup` (`src/containers/CurationGroup/index.js`) |
| **Nav** | Curation Group → `/curation-group` (`src/_nav.js`) |

---

## 2. Services & API

### 2.1 Fetch all curation groups

| Method | Endpoint | Query params | Notes |
|--------|----------|--------------|--------|
| GET | `/api/v0/dashboard/curationGroups/all` | Optional `qs` (service supports it; rarely used) | List all curation groups |

- **Service**: `curationsGroup.fetchAllCurationGroup(options)`  
- **File**: `src/services/curationsGroup.js`  
- **Response**: Array of `{ _id, name, ... }` (or similar); stored in Redux as `curationsGroupList`.

### 2.2 Create curation group

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/dashboard/curationGroups/create` | `{ curationGroupName: string }` | Create a new curation group. UI sends `title` from form; action maps to `curationGroupName`. |

- **Service**: `curationsGroup.addCurationGroup(curation)`  
- **Body**: `curationGroupName: curation.title`  
- **File**: `src/services/curationsGroup.js`

### 2.3 Edit curation group

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/dashboard/curationGroups/edit` | `{ curationGroupName: string, id: string }` | Edit name of existing group. `id` = curation group `_id`. |

- **Service**: `curationsGroup.editCurationGroupFromList(curation)`  
- **Body**: `curationGroupName: curation.title`, `id: curation.curationGroupId` (component passes `id` and `title`; action passes same as curation object).  
- **File**: `src/services/curationsGroup.js`

### 2.4 Delete curation group

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| DELETE | `/api/v0/dashboard/curationGroups/delete` | `{ curationGroupId: string }` | Delete a curation group by id. |

- **Service**: `curationsGroup.deleteCurationGroupFromList(id)`  
- **Body**: `curationGroupId: id`  
- **File**: `src/services/curationsGroup.js`

### 2.5 Attach curation groups to podcast

| Method | Endpoint | Request body | Notes |
|--------|----------|--------------|--------|
| POST | `/api/v0/dashboard/podcast/assign-curation-group` | `{ podcastId: string, curationGroupIds: string[] }` | Assign curation groups to a podcast. Used from Tracked Podcasts, not from Curation Group list page. |

- **Service**: `curationsGroup.attachCurationGroupsToPodcast(payload)`  
- **File**: `src/services/curationsGroup.js`  
- **Used in**: Tracked Podcasts (TranscriptList) “Attach Curation Groups” modal.

---

## 3. Redux

### 3.1 Actions (CurationGroup container)

| Action | Purpose |
|--------|--------|
| `fetchAllCurationGroup()` | Load all curation groups on mount |
| `addCurationGroup(curation)` | Create; payload `{ title }` from “Add Category” form |
| `editCurationGroupFromList(curation)` | Edit; payload `{ id: cat._id, title: cat.name }` from “Edit Category” form |
| `deleteCurationGroupFromList(id)` | Delete by `_id` |
| `logout` | User logout |

### 3.2 State

- **curationsGroup**: `curationsGroupList` — array of `{ _id, name, ... }`.  
- **Reducer**: `src/reducers/curationGroup.js`  
  - `FETCH_ALL_CURATION_GROUP`: replace list with payload.  
  - `ADD_CURATION_GROUP`: append payload to list.  
  - `EDIT_CURATION_GROUP`: replace matching item by `_id`.  
  - `DELETE_CURATION_GROUP`: remove item by `_id`.

### 3.3 Constants

- `FETCH_ALL_CURATION_GROUP`, `ADD_CURATION_GROUP`, `EDIT_CURATION_GROUP`, `DELETE_CURATION_GROUP`  
- `LOADING`, `LOADED`, `TOASTR_ERROR`, `TOASTR_INFO` (used by actions).

---

## 4. Filters & URL

- **Curation Group list page**: No filters; single table of all groups. No URL params for filters.
- **Downstream usage**: Other features use `curationGroupId` in URL or state (e.g. Clip Suggestions `?curationGroupId=`, Episode Feed SXM, Tracked Podcasts dropdown).

---

## 5. Action Links & Navigation

| Action | Link / behavior |
|--------|------------------|
| Open Add Category modal | Button “Add Category” → set `showAddModal: true`. |
| Add category | Modal “Ok” → `addCurationGroup(newCategory)` then `fetchAllCurationGroup` and close modal. |
| Open Edit Category modal | Edit icon on row → `openEdit(cat)` sets `id`, `title`, `showEditModal: true`. |
| Edit category | Modal “Ok” → `editCurationGroupFromList({ id, title })` then `fetchAllCurationGroup` and close modal. |
| Open Delete confirmation | Trash icon → `openDelete(cat)` sets `id`, `showDeleteModal: true`. |
| Delete category | Modal “Delete” → `deleteCurationGroupFromList(id)` then `fetchAllCurationGroup` and close modal. |
| Go to Clip Suggestions filtered by group | Row title click → `history.push(\`/clip-suggestions?curationGroupId=${C._id}\`)`. |

---

## 6. Internal Components & UI

### 6.1 Container

- **CurationGroup** (`src/containers/CurationGroup/index.js`)
  - Connects: `curationsGroupList` from `state.curationsGroup.curationsGroupList`.
  - Dispatches: `fetchAllCurationGroup`, `addCurationGroup`, `editCurationGroupFromList`, `deleteCurationGroupFromList`, `logout`.
  - Renders: `<CurationGroupList {...this.props} />`.
  - On mount: `fetchAllCurationGroup()`.

### 6.2 Main presentational component

- **CurationGroupList** (`src/components/CurationGroupList.js`)
  - Renders: Card “Curation Groups”, “Add Category” button, table, and three modals (Add, Edit, Delete).
  - Keeps local state: `categoriesList` (synced from `curationsGroupList` in componentDidUpdate), `showAddModal`, `showEditModal`, `showDeleteModal`, `id`, `title`, `newCategory: { title }`, dropdown toggle state.

### 6.3 Table columns

| Column | Content |
|--------|---------|
| Id | `C._id` |
| Title | `C.name`; **clickable** → navigate to `/clip-suggestions?curationGroupId=${C._id}` (linkStyle). |
| Action | Edit icon (open Edit modal), Trash icon (open Delete modal). |

### 6.4 Modals (all from `Modals` component)

- **Add Category**: Input “Category Name” bound to `newCategory.title`. Ok → `handleAddOk()` (add then refetch and reset).
- **Edit Category**: Input “Category Name” bound to `title`. Ok → `handleEditOk()` (edit then refetch).
- **Confirmation (Delete)**: “Are you sure you want to delete this category?” Delete → `handleDeleteOk()` (delete then refetch).

### 6.5 Dependencies

- **Modals**: `src/components/Modals.js`
- **reactstrap**: Card, CardHeader, CardBody, Table, Button, Col, Form, FormGroup, Label, Input, Dropdown, DropdownToggle, DropdownMenu, DropdownItem (dropdown used only for per-row toggle in current code; main actions are Add / Edit / Delete).

---

## 7. Where Curation Groups Are Used

| Feature | Usage |
|---------|--------|
| **Curation Group page** | CRUD for groups; link to Clip Suggestions by `curationGroupId`. |
| **Tracked Podcasts** | Dropdown filter by curation group; “Attach Curation Groups” modal assigns groups to a podcast. |
| **Clip Suggestions** | URL param `curationGroupId` to load suggestions for that group; dropdown to pick group. |
| **Episode Feed SXM** | Optional filter by `curationGroupId` (dropdown commented out in UI; URL/state logic present). |
| **Transcript service** | `getPodcastTranscript({ curationGroupId })` to filter tracked podcasts by group. |
| **Vanilla audio / SXM** | `getSxmLatestPodcast`, `getLatestPodcast` can take `curationGroupId` to scope episodes. |
| **Clip suggestions service** | Clip suggestions API can take `curationId` (curationGroupId) for SXM/regular flows. |

---

*Document generated from Hark Dashboard codebase for Curation Groups.*
