# Design Components & Optimized Architecture

This document describes the **design component structure** (filters, pagination, table alignment), **implemented shared components and utilities**, **custom hooks** (search + fetch API), and guidelines so **new components follow the same patterns** and avoid repeated code.

---

## 0. Implemented shared components & utilities (use these first)

When building or designing **new** components, **always prefer these** instead of duplicating logic or UI.

| What | Where | Use when |
|------|--------|----------|
| **`formatDate(value)`** | `@/lib/utils` | Displaying date values (creation date, etc.) in tables or cards |
| **`getVisiblePageNumbers(currentPage, totalPages)`** | `@/lib/utils` | Building custom pagination (prefer `TablePagination` instead when possible) |
| **`TablePagination`** | `@/components/TablePagination` | Any list/table page with pagination (Genre, Tone, Topic, Playlists) |
| **`LoadingState`** | `@/components/LoadingState` | Loading UI; use `overlay` for table overlay, omit for full-page |
| **`ErrorState`** | `@/components/ErrorState` | Displaying fetch or form errors in a consistent style |
| **`PlaceholderPage`** | `@/components/PlaceholderPage` | “Coming soon” or placeholder routes (e.g. Clips, Produced Clips) |

**Design rule:** Before adding new UI or logic, check this table and `@/components` — reuse the shared component or utility; only add new shared pieces when the pattern is truly different.

---

## 1. Current Design Component Structure

### 1.1 Page layout (shared across Genre, Topic, Tone)

```
┌─────────────────────────────────────────────────────────────┐
│  Filters Section (bg-gray-50, border, rounded-lg, p-4)      │
│  ├── Title: "Filters"                                        │
│  └── Search input (max-w-sm, flex-1)                        │
├─────────────────────────────────────────────────────────────┤
│  Table (bg-white, border, rounded-lg, overflow-hidden)       │
│  ├── thead: bg-gray-100, border-b, text-left                 │
│  │   └── th: px-6 py-3, text-xs font-medium uppercase       │
│  └── tbody: divide-y divide-gray-200                         │
│      └── td: px-6 py-4, text-sm (gray-600 / font-medium)     │
├─────────────────────────────────────────────────────────────┤
│  Pagination bar (flex, justify-between, mt-4)                │
│  ├── Left: "Showing X–Y of Z items" (text-sm text-gray-600) │
│  └── Right: Pagination (Previous, numbers, ellipsis, Next)   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Filter section

- **Container**: `bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4`
- **Header**: `text-lg font-medium text-gray-900` ("Filters")
- **Search**: `Input` from `@/components/ui/input`, `type="search"`, `max-w-sm`, `flex-1`
- **Alignment**: `flex flex-col sm:flex-row sm:items-center gap-3` for responsive filter row

### 1.3 Table alignment & styling

| Element   | Classes / alignment |
|----------|----------------------|
| Table    | `w-full table-auto` |
| Head     | `bg-gray-100 border-b border-gray-200` |
| `th`     | `px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider` |
| `tbody`  | `divide-y divide-gray-200` |
| `td` (id) | `px-6 py-4 text-sm text-gray-600` |
| `td` (name) | `px-6 py-4 text-sm font-medium text-gray-900` |
| `td` (date) | `px-6 py-4 text-sm text-gray-600` |
| Row hover | `hover:bg-gray-50 transition-colors` |
| Empty state | `colSpan={3} px-6 py-8 text-center text-gray-500` |

All list tables use **left-aligned** columns and consistent cell padding.

### 1.4 Pagination structure

- **Use**: Prefer the shared **`TablePagination`** component (`@/components/TablePagination`) — it implements the bar, summary, and controls below.
- **Bar**: `flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1`
- **Summary**: `text-sm text-gray-600` — "Showing {startIndex}–{endIndex} of {total} {itemLabel}" (optional via props)
- **Controls**: shadcn `Pagination` → Previous, page numbers (via `getVisiblePageNumbers` from `@/lib/utils`), Ellipsis, Next
- **Page logic**: `getVisiblePageNumbers(currentPage, totalPages)` in `@/lib/utils` returns `(number | "ellipsis")[]` when `totalPages > 7`
- **Disabled**: Previous/Next use `pointer-events-none opacity-50` when at first/last page

---

## 2. Custom Hooks

### 2.1 `useDebounce` (search)

- **Path**: `@/customHook/useDebounce.tsx`
- **Signature**: `useDebounce(value: string, delay: number) => string`
- **Role**: Debounces search input so API is not called on every keystroke.
- **Usage**: `const debouncedSearch = useDebounce(searchQuery.trim(), 300)`
- **Recommendation**: Keep as shared hook; use a constant (e.g. `SEARCH_DEBOUNCE_MS = 300`) in one place.

### 2.2 `useFetch` (API)

- **Path**: `@/customHook/useFetch.tsx`
- **Signature**: `useFetch(url: string, options?: { credentials? }) => { data, loading, error }`
- **Behavior**: Resets loading/error when `url` changes; uses `AbortController` to cancel in-flight request on unmount/url change.
- **Usage**: Build full URL with `from`, `limit`, and optional `qs` (search), then `const { data, loading, error } = useFetch(url)`.

### 2.3 Optimized: combined hook for search + pagination + fetch

To avoid duplicating the same logic in every page, introduce a **single custom hook** that encapsulates:

- Search state + debounced value
- Page state (reset to 1 when search changes)
- URL building (base path, `from`, `limit`, `qs`)
- `useFetch(url)` and derived values (total, list, totalPages, startIndex, endIndex)

**Suggested API** (conceptual):

```ts
// usePaginatedList.ts
type UsePaginatedListConfig<T> = {
  baseUrl: string
  pageSize?: number
  debounceMs?: number
  searchParam?: string           // e.g. "qs"
  typeAheadPath?: string         // e.g. "/genres/type-ahead"
  totalKey: string               // e.g. "totalGenres"
  listKey: string                // e.g. "genreList"
  defaultParams?: Record<string, string>  // e.g. { showHidden: "true" }
}

function usePaginatedList<T>(config: UsePaginatedListConfig<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery.trim(), config.debounceMs ?? 300)

  useEffect(() => setCurrentPage(1), [debouncedSearch])

  const url = useMemo(() => {
    const from = (currentPage - 1) * (config.pageSize ?? 20)
    const params = new URLSearchParams({
      from: String(from),
      limit: String(config.pageSize ?? 20),
      ...config.defaultParams,
    })
    const path = debouncedSearch && config.typeAheadPath
      ? config.typeAheadPath
      : new URL(config.baseUrl).pathname
    if (debouncedSearch && config.searchParam) params.set(config.searchParam, debouncedSearch)
    return `${config.baseUrl.replace(/\/?$/, "")}${path.includes("?") ? path : "?"}${params}`
  }, [currentPage, debouncedSearch, config])

  const { data, loading, error } = useFetch(url)

  const derived = useMemo(() => {
    const total = (data as Record<string, unknown>)?.[config.totalKey] ?? 0
    const list = ((data as Record<string, unknown>)?.[config.listKey] ?? []) as T[]
    const pageSize = config.pageSize ?? 20
    const totalPages = Math.max(1, Math.ceil(Number(total) / pageSize))
    const start = (currentPage - 1) * pageSize
    const startIndex = total === 0 ? 0 : start + 1
    const endIndex = Math.min(start + list.length, Number(total))
    return { total, list, totalPages, startIndex, endIndex }
  }, [data, currentPage, config])

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    debouncedSearch,
    ...derived,
    loading,
    error,
    data,
  }
}
```

Pages then only need to pass config and render the shared **Filter + Table + Pagination** UI.

---

## 3. Reusable Components (implemented & suggested)

### 3.1 Shared utilities (implemented — use these)

**Path**: `@/lib/utils.ts`

- **`formatDate(value: string | number | undefined): string`** — Returns locale date string or `"—"` if invalid/null. Use for any date column or label. Do **not** redefine in pages.
- **`getVisiblePageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[]`** — Used internally by `TablePagination`; use only if building custom pagination.

### 3.2 TablePagination (implemented)

**Path**: `@/components/TablePagination.tsx`

- **Props**: `currentPage`, `totalPages`, `onPageChange`, and optionally `startIndex`, `endIndex`, `total`, `itemLabel` (e.g. `"genres"`, `"playlists"`).
- **Behavior**: Renders "Showing X–Y of Z {itemLabel}" when summary props are provided, plus Previous / page numbers / Ellipsis / Next. Uses `getVisiblePageNumbers` from `@/lib/utils`.
- **Usage**: Use on every list/table page that has pagination (Genre, Tone, Topic, Playlists). Omit summary props if you only need controls.

### 3.3 LoadingState & ErrorState (implemented)

**Paths**: `@/components/LoadingState.tsx`, `@/components/ErrorState.tsx`

- **LoadingState**: `message?: string`, `overlay?: boolean`. Use `overlay` for table-level loading (spinner over content); omit for full-page loading.
- **ErrorState**: `message: string`. Use for API or validation errors so styling is consistent.
- **Usage**: In list pages, render `<LoadingState />` or `<LoadingState overlay message="Loading …" />` when `loading`; render `<ErrorState message={String(error)} />` when `error`.

### 3.4 CreatableMultiSelect (implemented)

**Path**: `@/components/CreatableMultiSelect.tsx`

- **Library**: [react-select Creatable](https://react-select.com/creatable) — multi-select with “type to create” support.
- **Props**: `options`, `value`, `onChangeIds`, `label?`, `placeholder?`, `disabled?`, `onCreateOption?`.
- **Helpers**: `mapToCreatableOptions(list)` (list of `{ _id, name }` → options), `getSelectedOptions(options, ids)` (ids → selected option array).
- **Usage**: Tags, Genres, Tones on Playlist Detail (QUESTION_DETAIL_COMPONENT_SPEC §7); reuse anywhere you need multi-select with creatable options.

### 3.5 PlaceholderPage (implemented)

**Path**: `@/components/PlaceholderPage.tsx`

- **Props**: `title: string`, `message?: string` (default: `"Content coming soon..."`).
- **Usage**: Use for routes that are not yet built (e.g. Clips, Produced Clips). Keeps layout and copy consistent.

### 3.6 When designing new components — checklist

Before adding a **new** component or page:

1. **Dates** → Use `formatDate` from `@/lib/utils`. Do not add a new date formatter.
2. **Pagination** → Use `TablePagination` with `currentPage`, `totalPages`, `onPageChange`, and optional summary props. Do not copy pagination markup or `getVisiblePageNumbers` into the page.
3. **Loading** → Use `LoadingState` (full area or `overlay`). Do not add new spinner/loading markup.
4. **Errors** → Use `ErrorState` for error messages. Do not add new error box markup.
5. **“Coming soon” pages** → Use `PlaceholderPage` with a `title` (and optional `message`). Do not duplicate placeholder layout.
6. **Filters / tables** → Reuse the same layout and classes as in §1 (filter section, table alignment). If the same filter+table pattern repeats, consider extracting a shared `FilterBar` or `DataTable` (see below).

### 3.7 Future / optional: FilterBar, DataTable, usePaginatedList

These are **not** implemented yet; add them only if new pages repeat the same filter/table pattern and duplication grows.

- **FilterBar** (or SearchFilterBar): `searchValue`, `onSearchChange`, `placeholder`, `ariaLabel`, optional `title` ("Filters"). Same filter section layout + `Input`.
- **DataTable**: `columns`, `rows`, `emptyMessage`, `getRowKey`; same `th`/`td` classes and empty state as in §1.3.
- **usePaginatedList**: Hook that encapsulates search state, debounce, page state, URL building, and `useFetch` so list pages only pass config and column definitions.

---

## 4. Summary

| Area | Status | Where / What to use |
|------|--------|---------------------|
| **Utils** | ✅ Implemented | `formatDate`, `getVisiblePageNumbers` in `@/lib/utils` — use these everywhere; do not copy. |
| **Pagination** | ✅ Implemented | `TablePagination` in `@/components/TablePagination` — use on all list/table pages. |
| **Loading / Error** | ✅ Implemented | `LoadingState`, `ErrorState` in `@/components` — use instead of custom spinner/error UI. |
| **Placeholder pages** | ✅ Implemented | `PlaceholderPage` in `@/components/PlaceholderPage` — use for “coming soon” routes. |
| **Filter** | Same layout per page | Reuse layout/classes from §1.2; optional future: `FilterBar` component. |
| **Table** | Same markup per page | Reuse table alignment from §1.3; optional future: `DataTable` component. |
| **Search + API** | Per-page with hooks | `useDebounce` + `useFetch` + local state; optional future: `usePaginatedList` hook. |

When designing **new** components or pages: start from **§0** and the **§3.5 checklist** so design stays consistent and repeated code is avoided.
