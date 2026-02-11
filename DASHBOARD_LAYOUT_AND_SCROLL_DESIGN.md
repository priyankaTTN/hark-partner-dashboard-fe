# Dashboard Layout & Scroll Design

This document describes the **dashboard UI layout**: fixed left header/sidebar, scrollable right content area, and how **table** and **card** components behave within that layout.

---

## 1. High-Level Layout Structure

The dashboard uses a **two-zone layout**:

| Zone | Role | Behavior |
|------|------|----------|
| **Left (fixed)** | Header + Sidebar | Stays fixed; does not scroll with page content. |
| **Right (scrollable)** | Main content | Holds breadcrumb, filters, tables, cards; this is the only area that scrolls. |

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (fixed, full width, 55px)                                │
├──────────────┬──────────────────────────────────────────────────┤
│              │  BREADCRUMB (can be fixed or inline)               │
│   SIDEBAR    ├──────────────────────────────────────────────────┤
│   (fixed,    │                                                    │
│   200px)     │   MAIN CONTENT (scrollable)                        │
│              │   - Container fluid                                │
│   - Nav      │   - Tables (e.g. Answer list, Question list)      │
│   - Footer   │   - Cards (e.g. Question detail, Answer detail)    │
│   - Minimizer│   - Filters, pagination, etc.                      │
│              │                                                    │
│              │   ↕ only this column scrolls                       │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 2. DOM & Component Hierarchy

**File**: `src/components/Home.js` (DefaultLayout)

```html
<div class="app">
  <AppHeader fixed>           <!-- Top bar: fixed -->
    <DefaultHeader />
  </AppHeader>
  <div class="app-body">
    <AppSidebar fixed display="lg">   <!-- Left: fixed -->
      <AppSidebarHeader />
      <AppSidebarForm />
      <AppSidebarNav />
      <AppSidebarFooter />
      <AppSidebarMinimizer />
    </AppSidebar>
    <main class="main">                <!-- Right: scrollable content -->
      <AppBreadcrumb />
      <Container fluid>
        <Switch>  <!-- Route components render here --> </Switch>
      </Container>
    </main>
    <AppAside fixed hidden />
  </div>
</div>
```

- **Fixed left**: `.app-header`, `.sidebar` (when `fixed` and viewport ≥ 992px).
- **Scrollable right**: everything inside `<main class="main">` (breadcrumb + `Container fluid` + route content).

---

## 3. CSS: Fixed Left Section

### 3.1 App container

- **`.app`**: `display: flex`, `flex-direction: column`, `min-height: 100vh`.
- **`.app-header`**: `flex: 0 0 55px` (height 55px).

### 3.2 Header fixed (≥ 992px)

- **`.header-fixed .app-header`**: `position: fixed`, `z-index: 1020`, `width: 100%`.
- **`.header-fixed .app-body`**: `margin-top: 55px` so body content starts below the header.

### 3.3 Sidebar fixed (≥ 992px)

- **`.sidebar-fixed .sidebar`**: `position: fixed`, `z-index: 1019`, `width: 200px`, `height: 100vh`.
- **`.sidebar-fixed .app-header + .app-body .sidebar`**: `height: calc(100vh - 55px)` so it sits under the header.
- **`.app-body .main`** (and footer) get **`margin-left: 200px`** when sidebar is shown (e.g. `.sidebar-show.sidebar-fixed`) so content is not hidden under the sidebar.

Sidebar variants:

- **Compact**: width 150px.
- **Minimized**: width 50px.

So: **left = fixed header + fixed sidebar**; they do not scroll.

---

## 4. CSS: Right Section (Scrollable Main)

### 4.1 Main content area

- **`.app-body`**: `display: flex`, `flex-direction: row`, `flex-grow: 1`, `overflow-x: hidden`.
- **`.app-body .main`**: `flex: 1`, `min-width: 0` (allows flex item to shrink and contain overflow).
- **`.main .container-fluid`**: `padding: 0 30px`.

The **`.main`** block is not given a fixed height or `overflow-y: auto` at the layout level. So:

- The right column grows with its content (tables, cards, filters, etc.).
- **Scrolling** is the **document/viewport scroll**: the window (or the scrollable ancestor) scrolls so that the user sees the full main content. Only the right section “moves” visually; header and sidebar stay fixed.

### 4.2 Breadcrumb (optional fixed)

- With **`.breadcrumb-fixed`**:
  - **`.breadcrumb`**: `position: fixed`, `top: 55px`, with left/right set so it aligns with the main content (e.g. `left: 200px` when sidebar is 200px).
  - **`.main`**: `padding-top: 3.875rem` so content is not hidden under the fixed breadcrumb.
- If breadcrumb is not fixed, it scrolls with the main content.

---

## 5. How Scrolling Works (Full Detail)

1. **Viewport**: The browser viewport is the scroll container (or the scrollable area is the document).
2. **Fixed elements**: Header and sidebar are `position: fixed` and stay in place while the user scrolls.
3. **Main content**: Lives in `.main` and extends vertically with:
   - Breadcrumb (if not fixed)
   - Filters / actions
   - Tables and/or cards
   - Pagination, etc.
4. **Scroll behavior**: As content in `.main` grows, the **page scrolls vertically**. Only the main column scrolls in practice; the left section remains fixed.
5. **No inner scroll on `.main`**: The layout does not use a fixed-height `.main` with `overflow-y: auto`. Content is in the normal flow and scrolls with the document. This keeps one clear scroll region and avoids nested scroll issues.

Summary: **Left = fixed; right = single scroll region (document/viewport).**

---

## 6. Table Design (Inside Right Section)

Tables (e.g. Answer list, Question list) live inside:

`main.main → Container fluid → Route component → table/card UI`.

### 6.1 Placement

- Tables sit inside the scrollable main area (often inside a **Card** or similar wrapper).
- They are not fixed; they scroll with the rest of the main content.

### 6.2 Responsive / horizontal scroll

- Wide tables use horizontal scroll at the **table wrapper** level (e.g. `overflow-x: auto` on a wrapper div or Bootstrap table-responsive).
- This is typically applied in the component (e.g. AnswerList) or via Bootstrap’s `.table-responsive` so that:
  - The **page** still scrolls vertically for the whole dashboard.
  - The **table** scrolls horizontally inside its card/container when needed.

### 6.3 Best practices for tables in this layout

- Wrap table in a **Card** (e.g. `Card` → `CardBody` → table wrapper → table).
- Use a table wrapper with `overflow-x: auto` (or `.table-responsive`) for wide content.
- Do not give the table’s container a fixed height that would create a second vertical scroll unless the spec explicitly requires it (e.g. “sticky table header” or “max height with scroll”). Prefer letting the table grow and the **page** scroll.

---

## 7. Card Design (Inside Right Section)

Cards (e.g. Question detail, Answer detail, AI context) also live inside:

`main.main → Container fluid → Route component → Card(s)`.

### 7.1 Placement

- Cards are in the same scrollable main column as tables.
- They scroll with the page; no fixed positioning at the layout level.

### 7.2 Structure

- **Card**: Outer container (e.g. `Card` from Core UI/Reactstrap).
- **CardHeader**: Title, actions, tabs if needed.
- **CardBody**: Main content (text, lists, forms, or nested tables).

### 7.3 Scrolling inside a card

- **Default**: Card body grows with content; the **page** scrolls so the user can see the full card.
- **Constrained height**: For some views (e.g. transcript or long list), a **CardBody** may use a fixed or max height and `overflow-y: auto` so that:
  - The card stays within the viewport (or a portion of it).
  - Only the **inside** of the card scrolls.
- When doing this:
  - Prefer a **max-height** (e.g. `max-height: 60vh` or `calc(100vh - 200px)`) so that on small viewports the card doesn’t dominate the screen.
  - Ensure the card itself is still inside the scrollable `.main` so the page can scroll to the card and, if needed, past it.

### 7.4 Best practices for cards in this layout

- Use cards to group logical sections (filters, table, detail view).
- Let the main column scroll; add **inner** scroll only where the spec requires a contained scroll region (e.g. transcript list, long code block).
- Use consistent padding (e.g. `Container fluid` + card margins) so alignment matches the rest of the dashboard.

---

## 8. Summary: Layout and Scroll at a Glance

| Area | Element | Position | Scroll |
|------|---------|----------|--------|
| Top bar | `.app-header` | Fixed (55px height) | No |
| Left nav | `.sidebar` | Fixed (200px width on lg+) | Sidebar nav can have its own inner scroll (e.g. `.sidebar-nav` overflow-y) |
| Right content | `.main` | In flow, flex: 1 | **Yes** — this is the only area that scrolls with the page |
| Breadcrumb | `.breadcrumb` | Fixed or in flow (depending on class) | If fixed: no; if in flow: yes with main |
| Tables | Inside `.main` | In flow | With page; horizontal scroll inside wrapper if needed |
| Cards | Inside `.main` | In flow | With page; optional inner vertical scroll on CardBody when specified |

---

## 9. Reference: Key Classes and Files

| What | Where |
|------|--------|
| Layout component | `src/components/Home.js` (DefaultLayout) |
| Layout & sidebar styles | `src/scss/style.css` (e.g. `.app`, `.app-body`, `.main`, `.sidebar-fixed`, `.header-fixed`) |
| Custom theme (sidebar/header colors) | `src/scss/style.css` (e.g. `.header-fixed .app-header`, `.sidebar`, `.sidebar .nav-link`) |
| Table/card examples | Answer list: `src/components/AnswerList.js`; containers: `containers/Answers/`, etc. |

This layout ensures a **fixed left header section** and a **single scrollable right section** containing all work tables and card-based UI, with scroll behavior and optional inner scroll (tables/cards) defined as above.
