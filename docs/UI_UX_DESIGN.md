# UI/UX & Frontend Design System
**Crime Predictive Hotspot Mapping System**
Last updated: 2026-05-08
Document type: AI-design-tool-ready specification (Claude Design / Stitch / v0 / Figma Make compatible)

---

## How to read this document

This file is the **single source of truth** for product design and frontend implementation. It is written so that:

1. A senior product designer can produce Figma files from it.
2. An AI design tool (Claude Design, Stitch, v0) can generate screens, components, and JSX directly from the prose.
3. A frontend developer can hand-pick any section and ship it without further clarification.

Every screen has an explicit purpose, hierarchy, primary action, and edge-state list. Every component has tokens. Every token has a value. Treat this as **production specification, not creative direction**.

Sister documents:
- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture
- [API_REFERENCE.md](API_REFERENCE.md) — endpoint contracts feeding the UI
- [AI_IMPLEMENTATION_PLAN.md](AI_IMPLEMENTATION_PLAN.md) — task list for shipping

---

## Table of Contents

1. [Product Vision & UX Strategy](#1-product-vision)
2. [Design Principles](#2-design-principles)
3. [User Personas](#3-user-personas)
4. [Information Architecture](#4-information-architecture)
5. [User Flows](#5-user-flows)
6. [Design System — Tokens](#6-design-system-tokens)
7. [Component Library](#7-component-library)
8. [Screen Specifications — Wireframes](#8-screen-specifications)
9. [High-Fidelity Visual Direction](#9-high-fidelity-direction)
10. [Responsive System](#10-responsive-system)
11. [Accessibility (WCAG 2.2 AA)](#11-accessibility)
12. [Animation & Microinteractions](#12-animation)
13. [Empty States, Errors, Loading](#13-states)
14. [Onboarding](#14-onboarding)
15. [Theming — Light & Dark](#15-theming)
16. [Frontend Architecture](#16-frontend-architecture)
17. [React Component Structure](#17-component-structure)
18. [State Management](#18-state-management)
19. [API Integration Layer](#19-api-integration)
20. [Performance Strategy](#20-performance)
21. [Iconography & Illustration](#21-iconography)
22. [Developer Handoff Checklist](#22-handoff)
23. [AI Design Tool Prompts](#23-ai-prompts)

---

## 1. Product Vision & UX Strategy
<a id="1-product-vision"></a>

### Product in one sentence
A real-time crime intelligence dashboard for Bihar Police that turns FIR data into hotspots, forecasts, and patrol routes — operable by a station officer with five minutes of training and trusted by a senior analyst with twenty years of experience.

### Three UX bets

1. **Map is the home, not the chart.** Officers think geographically. The first thing they see at every login is *the map of their jurisdiction with today's risk*. Numbers come second.
2. **Insight before interface.** Every screen leads with a sentence in plain English ("Patna Central recorded 23% more thefts this week vs last") *before* showing the chart that proves it. The chart is evidence; the sentence is the headline.
3. **Field-grade resilience.** The product runs on a 5-year-old laptop on rural Bihar broadband. No bloat. No 5MB hero images. No client-side heavy libraries. Skeleton loaders < 200ms, full data ≤ 2s on 4G.

### Tone & Voice

- **Authoritative, not bureaucratic.** "23 thefts in the last 7 days," not "It is hereby noted that 23 thefts have been registered."
- **Confident about uncertainty.** "Forecast: 18–25 incidents next week (80% confidence)." Show ranges, never false precision.
- **Hindi/English bilingual.** Every label and primary CTA exists in both. Default = English; toggle = Hindi (Devanagari).

### Design vision (one paragraph)
A clean, dense, enterprise-grade interface — the visual energy of **Linear** combined with the data clarity of **Stripe Dashboard** and the spatial sophistication of **Mapbox Studio**. Generous use of whitespace inside cards but tight overall density. Subtle motion (200–300ms eases, no bounces). Restrained palette built around a single accent (deep blue) with an alert palette (amber/red) reserved exclusively for risk indicators — never for marketing fluff.

---

## 2. Design Principles
<a id="2-design-principles"></a>

| # | Principle | What it means in practice |
|---|---|---|
| P1 | **Geography first** | Every analytic view defaults to a map. Tables and charts are secondary tabs, not equal peers. |
| P2 | **One primary action per screen** | If users can't tell where to click first, the screen has failed. Never two equally weighted CTAs. |
| P3 | **Color = meaning, not decoration** | Red = critical, amber = warning, green = safe. We never use red for "delete" if red also means "high crime risk" on the same screen — context wins. |
| P4 | **Numbers need anchors** | "23 incidents" alone is meaningless. Always pair with a comparison ("vs 18 last week, +27%") or a target ("budget: 30/week"). |
| P5 | **Skeletons, not spinners** | Loading state must hint at the shape of the content. Spinners only when shape is genuinely unknown. |
| P6 | **No hidden state** | Filter applied? Show a chip. Sort changed? Show the column highlight. Date range narrowed? Show the range above the data. |
| P7 | **Trust through evidence** | Predictions show their confidence. ML outputs link to "why this score" (SHAP). Dashboards link to the source FIRs. No opaque magic. |
| P8 | **Forgive the field** | Officers register FIRs at 11pm under stress. Generous tap targets (44px), strong undo affordance, autosave drafts, escape-friendly modals. |
| P9 | **Density without claustrophobia** | Lots of data per screen, but breathing room *inside* each card. Borders are subtle (1px on `border-default`), shadows are flat (sm/md only). |
| P10 | **Print-friendly** | Officers will print this. Every dashboard has a "Print view" CSS that strips chrome. |

---

## 3. User Personas
<a id="3-user-personas"></a>

### Persona 1 — Station House Officer (SHO)
- **Role:** OFFICER
- **Day in the life:** Registers 5–15 FIRs/day, plans next-shift patrol, checks if any geo-fence alerts fired
- **Tech comfort:** Medium. Uses WhatsApp, reports in Excel.
- **Primary screens:** FIR Create, FIR List, Hotspot Map, Patrol Routes, Notifications
- **Top frustration today:** Re-typing victim/accused details that exist in earlier FIRs
- **Win condition:** "Register a complete FIR in under 90 seconds"

### Persona 2 — District Crime Analyst
- **Role:** ANALYST
- **Day in the life:** Pulls weekly trend reports for SP, investigates spike alerts, runs zone comparisons
- **Tech comfort:** High. Comfortable with Excel pivot tables, knows what a percentile is.
- **Primary screens:** Analytics, Forecast, Zone Compare, Reports, Behavioral
- **Top frustration today:** Data lives in 3 places (CCTNS, Excel, paper), no unified view
- **Win condition:** "Generate the SP's Monday morning brief in 10 minutes flat"

### Persona 3 — Senior Officer / Admin
- **Role:** ADMIN
- **Day in the life:** Reviews force performance, approves new user accounts, configures geo-fences, audits sensitive cases
- **Tech comfort:** Low–medium. Wants overview, delegates detail.
- **Primary screens:** Dashboard, Officer Performance, Audit Log, User Management, Geo-Fences
- **Top frustration today:** No visibility across 38 districts simultaneously
- **Win condition:** "See state-wide risk in 30 seconds at 8am every day"

### Persona 4 — Field Constable (mobile only)
- **Role:** OFFICER (mobile)
- **Day in the life:** On patrol, receives route, marks stops complete, logs incidents
- **Tech comfort:** Low. Android phone, inconsistent signal.
- **Primary screens:** Patrol Route (map), Quick FIR (offline-capable PWA), Notifications
- **Top frustration today:** Apps that demand 4G to do anything
- **Win condition:** "Mark a patrol stop complete with one thumb"

---

## 4. Information Architecture
<a id="4-information-architecture"></a>

### Top-level navigation (left sidebar, 240px wide, collapsible to 64px)

```
🏠  Dashboard               ── overview, KPIs, alerts
🗺️  Hotspots               ── map, clusters, heatmap, time-slider
📋  FIRs                    ── list, search, create, bulk import
📈  Analytics               ── forecasts, trends, behavioral
🚓  Patrol                  ── routes, units, logs
🚧  Road Safety (IRAD)      ── accident hotspots
🛡️  Women Safety            ── women-crime KDE layer
🔔  Geo-Fences              ── boundaries, alert config
📊  Reports                 ── exports, scheduled emails
                            ─────
👥  Users         (admin)
📜  Audit Log     (admin)
⚙️  Settings
👤  Profile
```

### Hierarchy & grouping

- **Operational** (used daily): Dashboard, Hotspots, FIRs
- **Analytical** (used weekly): Analytics, Reports, Patrol
- **Specialized layers**: Road Safety, Women Safety
- **Configuration** (admin): Geo-Fences, Users, Audit Log, Settings

Visually separate operational from analytical with a 1px divider in the sidebar.

### Right-rail context panel (drawer, 360px wide, slides in)
Used for *contextual detail* — clicking a hotspot, a FIR row, a unit on the map opens this panel without leaving the parent screen. **Reduces page navigation by ~40% in expected workflows.**

### URL structure

```
/                           landing
/login
/dashboard
/dashboard/hotspots?zone=patna&from=2026-01-01&to=2026-04-30
/dashboard/firs?status=open&q=theft
/dashboard/firs/new
/dashboard/firs/:id
/dashboard/analytics
/dashboard/analytics/forecast?zone=patna
/dashboard/analytics/compare?zones=patna,gaya
/dashboard/patrol
/dashboard/patrol/routes/:id
/dashboard/irad
/dashboard/women-safety
/dashboard/geo-fences
/dashboard/reports
/admin/users
/admin/audit
/settings
```

**Filters live in the URL, not in component state.** Every meaningful filter combo must be a shareable, bookmarkable URL.

---

## 5. User Flows
<a id="5-user-flows"></a>

### Flow A — Officer registers an FIR (target: 90 seconds)

```
[Login] ──▶ [Dashboard] ──▶ click "Register FIR" (top-right primary CTA)
   │
   ▼
[Modal opens — NOT new page; reduces context loss]
   │
   ├─ Step 1/3: Incident
   │    • Crime type (autocomplete, IPC sections appear inline)
   │    • Date/time (defaults to "now"; tap to change)
   │    • Description (multiline; spaCy NER suggests entities)
   │
   ├─ Step 2/3: Location
   │    • Pick from map (default: officer's station coords)
   │    • OR type address (geocoded)
   │    • Zone auto-filled from polygon containment
   │
   ├─ Step 3/3: People
   │    • Victim name(s), age, gender, contact (encrypted)
   │    • Accused (optional)
   │    • Witnesses (optional)
   │
   ▼
[Submit] ──▶ [Toast: "FIR-2026-04-28-001 registered"] ──▶ [Closes modal, returns to Dashboard]
                                                              │
                                                              ▼
                                                    [SSE event broadcasts to all dashboards]
```

**Optimizations:** Step 1 alone is enough to save as draft (autosave every 5s). Steps 2 and 3 can be filled later. The keyboard shortcut `Cmd/Ctrl+Enter` submits at any step.

### Flow B — Analyst investigates a crime spike

```
[Dashboard] ──▶ Notification banner: "Spike detected: thefts in Patna Central, +180% last 24h"
   │
   ▼
[Click banner] ──▶ [Hotspot Map filtered to Patna Central, last 24h]
   │
   ├─ See cluster on map
   ├─ Click cluster ──▶ Right-rail opens with cluster stats
   ├─ Click "Show contributing FIRs" ──▶ FIR list filters automatically
   │
   ▼
[Compare] ──▶ click "Compare to last 4 weeks" ──▶ [Time-slider animation]
   │
   ▼
[Analyze] ──▶ click "Why this spike?" ──▶ [SHAP explanation panel]
   │
   ▼
[Action] ──▶ click "Dispatch patrol" ──▶ [Patrol routes pre-populated with hotspot]
```

### Flow C — Admin sets up a geo-fence

```
[Geo-Fences page] ──▶ [Create] ──▶ [Map opens in draw mode]
   │
   ├─ Draw polygon (Leaflet draw plugin)
   ├─ Name fence ("School zones — Patna Sadar")
   ├─ Trigger: any FIR with crime_type IN [theft, assault, harassment]
   ├─ Notify: roles = [OFFICER, ADMIN] within 5km of fence
   │
   ▼
[Save] ──▶ [Toast confirmation] ──▶ [Fence appears as blue overlay on all maps]
```

### Flow D — Mobile officer completes a patrol stop

```
[PWA opens to Patrol Route] ──▶ [Map shows assigned route, 8 stops, current = Stop 3]
   │
   ├─ Officer arrives at Stop 3 (GPS within 50m)
   ├─ App auto-prompts: "Mark Stop 3 complete?"
   │
   ▼
[Tap Yes] ──▶ [Optional incident log: "Anything to report?"]
   │
   ▼
[Tap No] ──▶ [Stop 3 turns green, route advances to Stop 4 with directions]
```

### Flow E — First-time login (onboarding)

```
[Login] ──▶ [Welcome modal: "Welcome, SHO Singh. Let's set up your dashboard in 3 steps."]
   │
   ├─ Step 1: Confirm assigned zone (pre-filled from user profile; can edit)
   ├─ Step 2: Pick alert subscriptions (geo-fence triggers, daily digest, weekly report)
   ├─ Step 3: Quick tour (4 tooltip pops: nav, map, FIR button, notifications)
   │
   ▼
[Skip available at every step]
   │
   ▼
[Dashboard, fully primed]
```

---

## 6. Design System — Tokens
<a id="6-design-system-tokens"></a>

All tokens are CSS custom properties, mirrored as Tailwind theme extensions. Token names follow the pattern `--{category}-{semantic}-{state}`.

### 7.1 Color palette

#### Brand & neutrals (semantic)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-base` | `#FBFBFC` | `#0B0D10` | Page background |
| `--bg-surface` | `#FFFFFF` | `#15181D` | Cards, modals |
| `--bg-surface-raised` | `#FFFFFF` | `#1B1F25` | Popovers, dropdowns |
| `--bg-subtle` | `#F4F5F7` | `#1F232A` | Hovered rows, selected state |
| `--bg-muted` | `#EDEFF2` | `#272C34` | Disabled bg, dividers fill |
| `--border-default` | `#E4E7EB` | `#272C34` | Card borders, table dividers |
| `--border-strong` | `#CBD0D7` | `#3A4049` | Input borders, separators |
| `--border-focus` | `#3B6EFF` | `#5B8AFF` | Focus rings (always visible) |
| `--fg-primary` | `#0B0D10` | `#F4F5F7` | Body text |
| `--fg-secondary` | `#4A5159` | `#A6ADB6` | Secondary text, captions |
| `--fg-tertiary` | `#7B838D` | `#7C8591` | Placeholder, helper text |
| `--fg-on-accent` | `#FFFFFF` | `#FFFFFF` | Text on filled buttons |

#### Accent (single brand color; do not invent secondary brand)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--accent-50` | `#EFF4FF` | `#0F1A33` | Tints |
| `--accent-100` | `#DBE6FF` | `#162648` | Hovers on tinted bg |
| `--accent-500` | `#3B6EFF` | `#5B8AFF` | Primary CTAs, links |
| `--accent-600` | `#2A55D6` | `#3B6EFF` | CTA hover |
| `--accent-700` | `#1F40A8` | `#2A55D6` | CTA active/pressed |

#### Risk palette (reserved exclusively for crime/risk semantics — never marketing)
| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--risk-low` | `#16A34A` | `#22C55E` | Low risk, safe, success |
| `--risk-low-bg` | `#DCFCE7` | `#0E2818` | Tint background |
| `--risk-medium` | `#D97706` | `#F59E0B` | Caution, watch |
| `--risk-medium-bg` | `#FEF3C7` | `#2A1F08` | Tint background |
| `--risk-high` | `#DC2626` | `#EF4444` | High risk, alert |
| `--risk-high-bg` | `#FEE2E2` | `#2C0F0F` | Tint background |
| `--risk-critical` | `#7F1D1D` | `#B91C1C` | Critical / spike |
| `--risk-critical-bg` | `#FECACA` | `#3B0E0E` | Tint background |

#### Map-specific
| Token | Value | Usage |
|---|---|---|
| `--map-cluster-radius-low` | `#22C55E` 60% opacity | DBSCAN cluster (small) |
| `--map-cluster-radius-mid` | `#F59E0B` 60% opacity | DBSCAN cluster (medium) |
| `--map-cluster-radius-high` | `#EF4444` 60% opacity | DBSCAN cluster (large) |
| `--map-heat-gradient` | linear: `#3B6EFF` → `#F59E0B` → `#EF4444` | KDE heatmap |
| `--map-zone-stroke` | `#3B6EFF` 1.5px | Zone polygon outline |
| `--map-zone-fill` | `#3B6EFF` 8% | Zone polygon fill |

### 7.2 Typography

**Font stack:**
```css
--font-sans: "Inter", "Noto Sans Devanagari", -apple-system, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

`Noto Sans Devanagari` is included so Hindi text renders consistently with English in the same line height.

**Type scale (1.250 ratio, modular):**

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `text-display-2xl` | 56px / 3.5rem | 1.1 | 700 | Marketing only |
| `text-display-xl` | 44px / 2.75rem | 1.15 | 700 | Marketing only |
| `text-display-lg` | 32px / 2rem | 1.2 | 700 | Page titles (rare) |
| `text-h1` | 28px / 1.75rem | 1.25 | 600 | Dashboard page heading |
| `text-h2` | 22px / 1.375rem | 1.3 | 600 | Card section heading |
| `text-h3` | 18px / 1.125rem | 1.4 | 600 | Card title |
| `text-body-lg` | 16px / 1rem | 1.5 | 400 | Reading body |
| `text-body` | 14px / 0.875rem | 1.5 | 400 | Default UI text |
| `text-body-sm` | 13px / 0.8125rem | 1.45 | 400 | Table cells, dense UI |
| `text-caption` | 12px / 0.75rem | 1.4 | 500 | Labels, metadata |
| `text-overline` | 11px / 0.6875rem | 1.4 | 600 | All-caps section eyebrows |
| `text-stat` | 32px / 2rem | 1.1 | 700 | KPI numbers |
| `text-stat-sm` | 22px / 1.375rem | 1.1 | 700 | Inline KPI |
| `text-mono` | 13px / 0.8125rem | 1.45 | 500 | FIR IDs, codes, coordinates |

**Tracking:** `-0.02em` on display sizes, `-0.01em` on h1–h3, `0` on body, `+0.06em` on overline.

### 7.3 Spacing scale (4px base)

```
--space-0: 0
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px       ← default card padding
--space-5: 20px
--space-6: 24px       ← default section gap
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-24: 96px
```

### 7.4 Radii

```
--radius-sm: 4px      ← chips, tags
--radius-md: 6px      ← buttons, inputs
--radius-lg: 10px     ← cards
--radius-xl: 14px     ← modals
--radius-2xl: 20px    ← sidesheets
--radius-full: 9999px ← pills, avatars
```

### 7.5 Shadows (flat, never floaty)

```
--shadow-xs: 0 1px 2px rgba(11,13,16,0.04)
--shadow-sm: 0 1px 2px rgba(11,13,16,0.06), 0 1px 3px rgba(11,13,16,0.05)
--shadow-md: 0 4px 8px rgba(11,13,16,0.06), 0 2px 4px rgba(11,13,16,0.06)
--shadow-lg: 0 12px 24px rgba(11,13,16,0.08), 0 4px 8px rgba(11,13,16,0.06)
--shadow-xl: 0 24px 48px rgba(11,13,16,0.12)
--shadow-focus-ring: 0 0 0 3px rgba(59,110,255,0.32)
```

In dark mode, replace with elevated surface colors (Material You approach) since shadows don't read on dark backgrounds.

### 7.6 Motion

```
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)        /* fast in, slow out — most UI */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)    /* symmetric — page transitions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* gentle overshoot — playful only */

--duration-instant: 80ms       /* hovers */
--duration-fast: 160ms          /* small UI (toasts, tooltips) */
--duration-default: 240ms       /* most transitions */
--duration-slow: 360ms          /* page-level, drawers */
--duration-deliberate: 600ms    /* time-slider, map flyTo */
```

**Reduced motion:** wrap all motion in `@media (prefers-reduced-motion: no-preference)` — defaults to instant (`--duration-instant`).

### 7.7 Z-index

```
--z-base: 0
--z-dropdown: 10
--z-sticky: 20
--z-overlay: 30
--z-drawer: 40
--z-modal: 50
--z-toast: 60
--z-tooltip: 70
--z-debug: 9999
```

### 7.8 Breakpoints

```
--bp-sm: 640px      mobile landscape, small tablet portrait
--bp-md: 768px      tablet
--bp-lg: 1024px     small laptop  ← sidebar collapses below this
--bp-xl: 1280px     desktop  ← default design canvas
--bp-2xl: 1536px    large desktop
```

---

## 7. Component Library
<a id="7-component-library"></a>

Built on **shadcn/ui** (Radix primitives + Tailwind). Every component below maps to a shadcn component or is a small composition of them. **All components have accessible default states (focus ring, ARIA labels, keyboard nav).**

### 8.1 Button

| Variant | Use | Style |
|---|---|---|
| `primary` | One per screen | Filled `--accent-500`, white text |
| `secondary` | Common alternates | Border `--border-strong`, surface bg |
| `ghost` | Tertiary actions | No bg, text only, hover `--bg-subtle` |
| `destructive` | Delete, revoke | Border `--risk-high`, text `--risk-high`; on hover, fill |
| `link` | Inline | Underline, `--accent-500` |

Sizes: `sm` (28px), `md` (36px, default), `lg` (44px, mobile/CTAs).
States: default, hover, active, focus-visible, disabled, loading (spinner replaces icon, text persists).

### 8.2 Input
- Height 36px (md), 44px (lg/mobile)
- Border `--border-strong`; focus border `--accent-500` + 3px focus ring
- Label above input, helper text below, error text `--risk-high`
- Icon slot left and right (e.g., search 🔍, clear ×)

### 8.3 Select / Combobox
Radix Select + cmdk for searchable. Always searchable when options > 7.

### 8.4 Date range picker
Single-month popover on mobile, two-month on desktop. Presets in left rail: Today, Yesterday, Last 7 days, Last 30 days, Last 90 days, Year to date, All time, Custom.

### 8.5 Card
- Background `--bg-surface`, border `--border-default`, radius `--radius-lg`
- Padding `--space-4` (16px) for compact, `--space-6` (24px) for spacious
- Optional header with title (h3) + actions (right-aligned)
- Optional footer separated by 1px `--border-default`

### 8.6 Stat card (the workhorse of the dashboard)

```
┌──────────────────────────────────────────┐
│ FIRS REGISTERED THIS WEEK         ⓘ     │   ← overline + tooltip icon
│                                          │
│ 1,247                       ↑12.3%      │   ← stat number + trend chip
│                            vs last week  │
│                                          │
│ ┌────────────────────────────────────┐  │   ← inline sparkline (60×24)
│ │  ╱╲      ╱╲                        │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Trend chip rules:** ↑ green if good direction, red if bad; semantic depends on metric (more FIRs = bad; more arrests = good).

### 8.7 Table
- Sticky header
- Row hover `--bg-subtle`, zebra optional (turn off by default for density)
- Sort indicators on column headers
- Row click → opens right-rail context panel; double-click → full page
- Bulk select: checkbox col, sticky bulk-action bar appears when ≥1 row selected
- Empty state: see Section 13

### 8.8 Tabs
Underline style (Linear/Vercel-inspired), not pill. Active tab `--accent-500` text + 2px underline `--accent-500`.

### 8.9 Filter chip bar
Horizontally scrollable on mobile. Each chip is a removable filter (× icon). "Clear all" button when ≥2 chips active.

### 8.10 Modal / Dialog
- Centered on desktop, full-screen on mobile (`<sm`)
- Max width 560px (default), 720px (form-heavy), 960px (data-heavy)
- Padding 24px, footer with primary right, cancel left
- ESC dismisses; click outside dismisses unless dirty (warn)

### 8.11 Drawer / Side sheet
- Right side, 360px desktop / 100% mobile
- Header sticky, scrollable body, sticky footer if action present
- Used for: row detail, geo-fence config, FIR preview, cluster detail

### 8.12 Toast
- Bottom-right desktop, top mobile
- Auto-dismiss 5s (info), 8s (success), persistent (error)
- Close × always available; "Undo" affordance for destructive actions, persists for 10s

### 8.13 Banner / Alert
- Inline, full-width, used for system-wide messages (degraded ML, scheduled maintenance, geo-fence breach)
- Variants: info, warning, critical
- Dismissible per session (localStorage flag)

### 8.14 Skeleton loaders
Every async-loaded component must have a skeleton. Approximate shape with grey blocks. Pulse animation 1.5s. **Never spinners for known shapes.**

### 8.15 Map
Wrapped Leaflet in `<MapContainer>`. Custom controls right-side: zoom, layer toggle, fullscreen, screenshot. Cluster icons sized by count (16, 24, 32, 48px). Heatmap toggle. Time-slider attached bottom.

### 8.16 Chart wrappers (Recharts)
- `<LineChart>` for time series
- `<BarChart>` for zone comparison
- `<AreaChart>` for forecast confidence bands
- All charts: 16px ticks, `--fg-tertiary` axis lines, `--accent-500` primary series, gridlines `--bg-muted`
- Always include a tooltip with x and y values; tooltip background `--bg-surface-raised` + `--shadow-md`

### 8.17 Avatar
Initials on `--bg-subtle` if no photo. Sizes 24, 32, 40, 56.

### 8.18 Badge / Tag
Small (h-5), pill, semantic color: status (open=blue, closed=grey, urgent=red), risk level (low/med/high), role (admin/officer/analyst).

### 8.19 Tooltip
Radix tooltip; 200ms delay; max width 280px; arrow pointer; `--bg-surface-raised` bg + `--shadow-md`.

### 8.20 Command palette (Cmd/Ctrl+K)
Global. Searches FIRs, zones, users, navigates pages. Vercel/Linear-style. Critical for power users.

### 8.21 Loaders, progress
- Linear progress bar at top of page during route transition (Next.js navigation)
- Circular spinner only inside buttons during submission
- Indeterminate spinner only when result shape unknown

---

## 8. Screen Specifications — Wireframes
<a id="8-screen-specifications"></a>

Each screen below is described in **structural prose**: layout regions, content, primary action, secondary actions, edge states. AI design tools should use these to generate wireframes; high-fidelity renderings use Section 6 + Section 9.

### 9.1 Login

**Layout:** Two-column (60/40 split desktop, single column mobile)

- **Left column** (decorative, hidden < md): Subtle map illustration of Bihar with abstract crime data points pulsing slowly. Top-left: logo + product name. Bottom-left: tagline ("Predictive intelligence for Bihar Police") + small text "Government of Bihar" with crest.
- **Right column**: Centered card, max 380px wide.
  - Heading: "Welcome back"
  - Subheading: "Log in to continue" (muted)
  - Email input (with icon)
  - Password input (with show/hide toggle)
  - Primary button: "Sign in" (full width)
  - Below: "Forgot password?" link, right-aligned
  - Below: small text "First time? Contact your station admin"

**States:** error (incorrect credentials), locked (account locked banner above form), 2FA challenge (separate next step).

### 9.2 Dashboard (home)

**Layout:** Sidebar (left, 240px) + main (flex-1) + optional right-rail (360px on demand)

**Main content (top to bottom):**

1. **Page header** (sticky)
   - Left: h1 "Good morning, SHO Singh" + date (small, muted)
   - Right: Date range picker • "Register FIR" primary CTA • Notifications bell • Avatar menu

2. **Banner row** (only when active)
   - Geo-fence breach, ML service degraded, etc. Dismissible.

3. **KPI grid** (4 cols desktop, 2 cols tablet, 1 col mobile)
   - FIRs this week (vs last) — sparkline
   - Open cases — % of total
   - Avg response time — ↑ or ↓
   - Active patrol units — out of total

4. **Map preview card** (full width, 320px tall)
   - Compact hotspot map of officer's zone
   - "Open full map →" link top-right
   - Inline filter chips: crime type, last 7d default

5. **Two-column row** (1:1)
   - **Left:** "Recent FIRs" — 5-row table with status badges, clickable
   - **Right:** "This week's forecast" — line chart with 7-day projection, confidence band

6. **Bottom row** (3 columns)
   - **Top crime types** — horizontal bar
   - **Top hotspots** — list with risk badges, "View on map →"
   - **Officer leaderboard** (admin only) — top 5 by FIRs registered

**Empty states:** No FIRs yet → CTA "Register your first FIR".

### 9.3 Hotspot Map (`/dashboard/hotspots`)

**Layout:** Full-bleed map. Floating panels overlay it.

- **Top-left floating bar** (filters): zone selector, crime type multi-select, date range, "Apply" button. Collapsible.
- **Top-right floating control stack**: zoom +/−, layer toggle (clusters / heatmap / both), fullscreen, share URL, screenshot.
- **Bottom floating time-slider** (full width minus 80px margins): play/pause, scrubber, speed (1x/2x/4x/8x), date label.
- **Right-rail** (when a cluster is clicked): cluster stats, contributing FIRs (paginated), "Show in FIR list" link, "Generate patrol route" CTA.

**Interactions:**
- Click empty map → close any open panel
- Click cluster → right-rail opens, cluster outlines briefly
- Click heatmap cell → tooltip with density score
- Drag time-slider → map updates with 100ms debounce
- Press play → animates 1 day per 200ms

**Edge states:**
- No data → "No incidents in selected range" overlay with reset filter button
- ML service down → fallback text "Showing raw FIR points; clustering unavailable" with retry button

### 9.4 FIR List (`/dashboard/firs`)

**Layout:** Sidebar + main.

- **Page header**: h1 "FIRs" + chip count "(1,247 results)" • Right: "Bulk import" • "Register FIR" primary
- **Filter rail** (left of table, 240px, collapsible): status, crime type, zone, date range, registered_by, victim_gender, has_attachments
- **Search bar** (above table, full width): icon + placeholder "Search FIR no, description, location, victim name…" + saved filters dropdown
- **Active filter chip bar** below search
- **Table**: FIR No (mono) • Date • Crime type • Zone • Status badge • Victim • Officer • Actions (kebab menu)
- **Sticky bulk action bar** when ≥1 row selected: "Export CSV", "Mark closed", "Assign officer"
- **Pagination** below: page X of Y, items-per-page (25/50/100)

**Right-rail** (on row click): full FIR preview with all fields, attachments, audit trail, edit button.

### 9.5 FIR Create (modal, 720px wide)

**Stepper at top:** ● Incident → ○ Location → ○ People → Submit

Same as Flow A above. Each step has:
- Form fields
- "Save draft" button (autosaves but explicit save reassures)
- Back / Next buttons in footer
- "Submit" replaces "Next" on Step 3

**Edge states:** validation errors inline below each field, draft restored banner on reopen, network error toast with retry.

### 9.6 FIR Detail (`/dashboard/firs/:id`)

**Layout:** Two-column.

- **Left column (60%)**:
  - Header: FIR No (large mono) • status badge • registered date • registered by
  - Section "Incident": crime type, classification, description (NER-highlighted entities)
  - Section "Location": map preview (200px tall) + address + zone badge
  - Section "People": victim, accused, witnesses (with gender, age, contact masked)
  - Section "Timeline": investigation events
  - Section "Attachments": image grid + document list
- **Right column (40%, sticky)**:
  - Quick actions: edit, close, escalate, generate report
  - Related FIRs (same victim, same address, same accused) — surfaced via NLP
  - Audit log (compact)

### 9.7 Analytics (`/dashboard/analytics`)

**Layout:** Tabs across the top:
`Forecasts • Seasonal trends • Behavioral clusters • Risk scores • Zone compare • Women safety • Anomalies`

**Forecast tab:**
- Zone selector + crime type
- Big chart (full width, 400px tall) — historical + 30-day forecast with confidence band
- Side panel: prediction summary in plain English, accuracy metric (MAE), "How was this calculated?" link → modal explaining Prophet
- Below: forecast vs actual table (last 30 days)

**Zone compare tab:**
- Multi-select zones (max 6)
- Side-by-side bar chart of metrics: total FIRs, top 3 crime types, avg response time, risk score
- Below: matrix table of all zones × all metrics, sortable

### 9.8 Behavioral (`/dashboard/behavioral`)

- Scatter plot showing zones on 2D embedding (PCA on crime profile)
- Cluster colors
- Hover → zone label + cluster description ("High-theft, low-violence")
- Side panel: cluster definitions, member zones list

### 9.9 Patrol Routes (`/dashboard/patrol`)

- Tab 1: Active routes (cards with route map preview, assigned unit, progress bar, ETA to next stop)
- Tab 2: Generate route (form: zone, num stops, num units, time window) → "Generate" CTA → result map with stops numbered + OR-Tools metadata
- Tab 3: Past routes (table with completion %, incidents encountered, exportable)

### 9.10 IRAD Road Safety (`/dashboard/irad`)

- Map of accident hotspots (KDE) with severity color encoding
- Filters: severity, road type, weather, time of day
- Right-rail on click: contributing accidents

### 9.11 Women Safety (`/dashboard/women-safety`)

- Map with KDE specifically weighted on women-safety crime classifications
- Toggle: heatmap / clusters / individual incidents
- Side stat panel: total incidents, top 5 zones, trend vs last quarter
- Note banner: "This view shows only crimes flagged as women-safety relevant per IPC sections X, Y, Z"

### 9.12 Geo-Fences (`/dashboard/geo-fences`)

- Map + sidebar list of all fences
- Click "Create" → enter draw mode (cursor changes, instructions overlay)
- Each fence card: name, polygon area, trigger conditions, last alert, edit/delete

### 9.13 Reports (`/dashboard/reports`)

- Tab 1: Quick reports — pre-built templates (weekly digest, monthly SP brief, incident summary), one-click PDF/CSV
- Tab 2: Scheduled reports (admin) — cron config, recipients, format
- Tab 3: Report archive — history of generated reports, download

### 9.14 Notifications (drawer, opened from bell)

- Tabs: All • Alerts • Mentions • System
- Notification rows: icon (semantic), title, body, time-ago, "View" link
- Header right: "Mark all read" + filter
- Empty state: "You're all caught up"

### 9.15 Users / Admin (`/admin/users`)

- Table: name, email, role, station, last login, status, actions
- "Invite user" CTA → modal
- Role change inline (admin can demote/promote)

### 9.16 Audit Log (`/admin/audit`)

- Filter rail: actor, entity, action, date range
- Table (dense, mono font for IDs): timestamp, actor, action, entity, IP, user-agent, before/after diff (expandable)
- Export CSV

### 9.17 Settings (`/settings`)

- Tabs: Profile • Preferences • Notifications • API tokens (admin) • Theme
- Each tab: form with Save button (sticky at bottom)

---

## 9. High-Fidelity Visual Direction
<a id="9-high-fidelity-direction"></a>

### Reference moodboard (textual)

| Aspect | Reference | What we take |
|---|---|---|
| Density & sidebar | Linear | Crisp sidebar, instant transitions, command palette |
| Stat cards | Stripe Dashboard | Calm KPIs with sparklines, no chart-junk |
| Maps | Mapbox Studio | Subtle base map, strong data overlays |
| Whitespace | Notion | Generous interior padding, tight outer density |
| Typography | Vercel | Inter, clean h-scale, no decorative type |
| Microinteraction | Framer | Subtle eases, never bouncy unless playful |
| Data tables | Retool, Airtable | Sticky headers, inline edit, zebra optional |
| Forms | Stripe Elements | Floating labels, immediate validation |
| Empty states | Dropbox, Linear | Friendly illustration + clear CTA |

### Visual rules

1. **Single accent.** No teal-as-secondary-brand. Risk palette is for risk only; brand is `--accent-500`.
2. **Borders > shadows.** Cards lift via `1px solid --border-default`, not `box-shadow`. Shadows reserved for floating layers (modal, popover, dropdown).
3. **Charts: no chart-junk.** No 3D, no gradients-for-decoration, no drop shadows on bars. Axis lines `--fg-tertiary`. Highlight a single series with brand color, others muted.
4. **Maps: muted base, vivid data.** Use OSM with a custom tile filter (`grayscale(40%) opacity(85%)`) so data overlays pop.
5. **Imagery: rare and purposeful.** No stock photos. Hero illustrations only on landing/login/empty states. Style: line-based (1.5px), single-color tints from accent palette.
6. **Iconography: Lucide only.** 16/20/24px sizes, 1.5px stroke. No mixing icon libraries.
7. **No gradients.** Except: KDE heatmap gradient (functional) and one subtle hero ramp on the landing page.
8. **Cursors:** `pointer` only on truly clickable. `grab` on draggable map. `crosshair` on draw mode.

### "Linear-grade polish" checklist (applies to every screen)

- [ ] Skeleton loader matches final layout
- [ ] Hover state on every interactive element
- [ ] Focus ring visible & meets 3:1 contrast
- [ ] Empty state designed (not just blank)
- [ ] Error state designed
- [ ] Loading > 200ms shows skeleton, > 2s shows progress
- [ ] Mobile breakpoint tested in DevTools
- [ ] Dark mode renders correctly (no untokenized colors)
- [ ] All copy in both English + Hindi keys
- [ ] Keyboard nav reachable for every action

---

## 10. Responsive System
<a id="10-responsive-system"></a>

### Breakpoint behavior matrix

| Region | < sm (mobile) | sm–md (tablet) | md–lg | lg+ (desktop) |
|---|---|---|---|---|
| Sidebar | Hidden, hamburger | Drawer overlay | Collapsed (64px) | Expanded (240px) |
| KPI grid | 1 col | 2 col | 3 col | 4 col |
| Map controls | Bottom sheet | Bottom sheet | Floating | Floating |
| Right-rail | Bottom sheet | Drawer | Drawer | Inline |
| FIR table | Card list | Card list | Table | Table |
| Modal | Full-screen | Full-screen | Centered | Centered |
| Time-slider | Above fold | Above fold | Floating bottom | Floating bottom |

### Mobile-first principles

- **Tap targets ≥ 44px.**
- **Bottom navigation** on mobile dashboard for the 5 most-used screens (Home, Map, FIRs, Patrol, Profile).
- **Pull-to-refresh** on lists (PWA gesture).
- **Long-press** = bulk select on touch.
- **Swipe right on FIR row** = quick actions (close, assign).
- **Form fields** full width, input mode hints (`numeric`, `tel`), autocomplete attributes.

### Container width

```css
.container { max-width: 1440px; padding: 0 24px; margin: 0 auto; }
```

Above 1440px, content centers with extra whitespace — never stretches data-dense layouts to ultrawide.

### Grid

- **12-column** on desktop, gutter 24px
- **8-column** on tablet, gutter 16px
- **4-column** on mobile, gutter 12px

---

## 11. Accessibility (WCAG 2.2 AA)
<a id="11-accessibility"></a>

**Hard requirements:**
- All text 4.5:1 contrast (3:1 for large ≥ 18px / ≥ 14px bold)
- All interactive 3:1 contrast against adjacent colors
- Focus indicator: 2px solid `--border-focus` + 3px ring offset, never outline:none without replacement
- All images have `alt`; decorative ones `alt=""`
- All form fields have `<label>` (visible or `aria-label`)
- Errors announced to screen readers via `aria-live="polite"`
- Color is never the only signal — pair with icon, text, or shape (e.g., risk badge has color + word)
- Keyboard reachable: every action, every modal, every drawer
- Focus trap in modals, returned to trigger on close
- Skip-to-content link at top of page
- Lang switching: `<html lang="en">` toggles to `lang="hi"` when Hindi is selected

**Touch:** tap targets ≥ 44×44px, spacing ≥ 8px between adjacent targets.

**Cognitive:** no auto-advancing carousels, no time-out without warning + extension, error messages plain-language ("Email address is missing the @ sign"), instructions before action.

**Internationalization:** Hindi (Devanagari) renders at the same x-height as English using Noto Sans Devanagari. Don't shrink Hindi to fit.

**Audit hooks:** axe-core in CI, Lighthouse score ≥ 95 on every PR, manual screen reader test (NVDA + VoiceOver) per release.

---

## 12. Animation & Microinteractions
<a id="12-animation"></a>

**Philosophy:** motion serves comprehension or delight. Never decoration. Default to subtle.

### Inventory

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | Fade + 4px slide up | 240ms | `ease-out` |
| Modal open | Backdrop fade + scale 0.98→1 | 200ms | `ease-out` |
| Drawer open | Slide from right | 280ms | `ease-out` |
| Toast appear | Slide up + fade | 200ms | `ease-out` |
| Button press | Scale 0.98 | 80ms | linear |
| Hover (button, card) | bg color | 120ms | linear |
| Skeleton pulse | opacity 0.5↔1 | 1500ms | `ease-in-out`, infinite |
| Tooltip | fade | 100ms | `ease-out`, 200ms delay |
| Map flyTo | translate + zoom | 600ms | `ease-in-out` |
| Cluster pop on hover | scale 1→1.1 | 120ms | `ease-out` |
| Number counter (KPI) | tween from old to new | 600ms | `ease-out` |
| Chart line draw | stroke-dashoffset 0 → length | 800ms | `ease-out` (only on first paint) |
| Time-slider scrub | data update | 100ms debounced | linear |
| FIR submit success | Checkmark draw + green pulse | 400ms | `ease-spring` |
| Notification bell | shake (on new alert) | 600ms | `ease-spring`, 1x only |

**Rules:**
- All wrapped in `prefers-reduced-motion: no-preference` media query.
- Never animate width/height of containing layouts (causes reflow). Animate transform/opacity only.
- Stagger children only on initial mount (not on filter change — feels janky).

### Microinteraction examples

- **FIR registered toast** has a tiny progress bar showing the auto-dismiss countdown — gives sense of control.
- **Filter chip removal** animates the chip shrinking + fading in 160ms before the table refilters.
- **Map marker click** ripples briefly (concentric circle, fade out 400ms).
- **Risk badge change** (e.g., zone risk going from low → high) flashes the new color once on load.

---

## 13. Empty States, Errors, Loading
<a id="13-states"></a>

### Empty states (designed, not blank)

Pattern: 80×80 illustration + h3 heading + 1-line subhead + primary CTA (when applicable).

| Screen | Empty copy | CTA |
|---|---|---|
| Dashboard | "Welcome aboard. Register your first FIR to begin seeing patterns." | Register FIR |
| FIR list | "No FIRs match your filters." | Clear filters |
| Hotspot map | "No incidents in this range." | Reset range |
| Notifications | "You're all caught up." | — |
| Reports archive | "No reports yet." | Generate report |
| Patrol routes | "No active routes." | Generate route |

### Error states

| Type | UI |
|---|---|
| Network offline | Top banner "You're offline. Showing cached data."; retry chip |
| API 5xx | Inline empty: "Something went wrong on our side." + retry |
| API 401 | Auto-redirect to login |
| API 403 | Inline empty: "You don't have permission to see this." |
| ML service down | Inline non-blocking banner: "Predictions unavailable. Showing raw data." |
| Validation | Inline below field, red text, icon |
| Bulk import error | Modal with row-by-row error list, downloadable CSV of failures |

### Loading states

| Trigger | UI |
|---|---|
| Page navigation | Top progress bar (Next.js router) |
| Async data | Skeleton matching layout |
| Button submit | Spinner inside button, label persists, button disabled |
| Bulk operation | Progress modal with cancel |
| Export | Toast "Export started. We'll notify you when ready." (job queued) |

---

## 14. Onboarding
<a id="14-onboarding"></a>

### First-login wizard
3 steps (Section 5, Flow E): zone confirmation, alert subscriptions, dashboard tour.

### Feature discovery
- **Spotlight tour** on first visit to a major page (Hotspots, Analytics) — 2–4 tooltips max.
- **"What's new"** modal on first login after a release; lists 1–3 highlights.
- **Empty-state CTAs** double as onboarding (e.g., FIR list empty → "Register your first FIR").

### Help affordances
- `?` icon top-right → help panel with searchable docs
- Inline tooltip `ⓘ` next to non-obvious labels
- Command palette has "Help" section with shortcuts to docs

### Progress tracking (stretch)
Profile shows onboarding checklist: ☑ first FIR registered, ☑ first hotspot map opened, ☐ first patrol route generated. Subtle, dismissible.

---

## 15. Theming — Light & Dark
<a id="15-theming"></a>

### Strategy
**Token-driven theming.** Light is default. Dark uses the same component code via CSS custom properties — never duplicate components. System preference detected on first load; manual toggle in Settings persists in localStorage.

```css
:root { /* light values */ }
:root[data-theme='dark'] { /* dark values */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { /* dark values */ }
}
```

### Dark-mode pitfalls (and our rules)
- **Never pure black** (`#000`). Use `--bg-base: #0B0D10` — preserves depth.
- **Elevation via lighter surface, not shadow.** `--bg-surface-raised` is brighter than `--bg-surface`.
- **Saturate down on dark.** Risk colors lighten 1 step (e.g., red `#EF4444` not `#DC2626`) to maintain perceived brightness.
- **Map base layer** swaps to a dark tileset (CartoDB Dark Matter) — but data overlays keep their hue, just with reduced saturation.

### High contrast variant
Future iteration: `[data-theme='high-contrast']` with WCAG AAA-level token overrides for visually impaired users.

---

## 16. Frontend Architecture
<a id="16-frontend-architecture"></a>

### Stack (already chosen — not changing)
- **Framework:** Next.js 15 App Router, React 19, TypeScript strict
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix)
- **State:** React local state + URL state (nuqs) + TanStack Query for server state
- **Maps:** Leaflet + react-leaflet + leaflet.heat + leaflet.markercluster
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod (shared with backend)
- **Real-time:** native EventSource (SSE)
- **i18n:** next-intl
- **Tables:** TanStack Table v8
- **Date:** date-fns
- **Icons:** Lucide
- **Testing:** Vitest + Testing Library + Playwright (E2E)

### Folder layout

```
frontend/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← root, theme provider, query client
│   ├── (marketing)/                  ← landing, login (public)
│   │   ├── page.tsx
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx                ← sidebar, top bar
│   │   ├── page.tsx                  ← /dashboard
│   │   ├── hotspots/page.tsx
│   │   ├── firs/page.tsx
│   │   ├── firs/[id]/page.tsx
│   │   ├── firs/new/page.tsx
│   │   ├── analytics/...
│   │   ├── patrol/...
│   │   └── ...
│   ├── admin/...
│   └── api/                          ← Next.js route handlers (BFF if needed)
├── components/
│   ├── ui/                           ← shadcn primitives (button, input, dialog, ...)
│   ├── layout/                       ← Sidebar, TopBar, RightRail, BottomNav
│   ├── map/                          ← MapContainer, ClusterLayer, HeatLayer, Controls
│   ├── chart/                        ← LineChart, BarChart, AreaChart wrappers
│   ├── fir/                          ← FIRForm, FIRTable, FIRRow, FIRDetailPanel
│   ├── hotspot/                      ← HotspotFilters, ClusterDetail, TimeSlider
│   ├── analytics/                    ← ForecastChart, ZoneCompare, ...
│   ├── patrol/                       ← RouteCard, RouteMap, ...
│   ├── feedback/                     ← Toast, Banner, EmptyState, ErrorBoundary
│   └── data/                         ← Table, Pagination, FilterChip, DateRangePicker
├── hooks/
│   ├── use-firs.ts                   ← TanStack Query wrapper for FIR endpoints
│   ├── use-hotspots.ts
│   ├── use-sse.ts                    ← EventSource hook
│   ├── use-permissions.ts            ← role-based gate
│   └── use-debounced-filter.ts
├── lib/
│   ├── api-client.ts                 ← fetch wrapper, credentials, error normalization
│   ├── csrf.ts
│   ├── format.ts                     ← date, number, currency formatters (i18n-aware)
│   ├── geo.ts                        ← haversine, polygon utils for client
│   └── constants.ts                  ← roles, statuses, crime types enum
├── stores/                           ← (only if Zustand needed for cross-cutting UI)
│   └── ui-store.ts                   ← sidebar collapsed, theme, recent searches
├── locales/
│   ├── en.json
│   └── hi.json
├── styles/
│   └── globals.css                   ← Tailwind directives, CSS custom properties
├── types/
│   ├── api.ts                        ← API response types (mirror backend Zod)
│   └── domain.ts                     ← FIR, Zone, Hotspot, etc.
├── public/
└── tailwind.config.ts                ← extends with our tokens
```

### Routing rules
- **All authenticated routes** under `app/dashboard/` use a shared layout with sidebar.
- **Loading UI** via `loading.tsx` per segment (App Router).
- **Error boundary** via `error.tsx` per segment.
- **Not-found** via `not-found.tsx`.
- **Search params are state.** Use nuqs to keep filters in URL.

### Server vs client components
- **Server components by default.** Only mark `"use client"` when interactivity, state, or browser APIs are needed.
- **Map, charts, modals, forms** = client.
- **Data tables** = server fetching, client interactivity (TanStack Table renders client-side).
- **Streaming** UI: Suspense boundaries around heavy data sections (e.g., dashboard's bottom-row charts) so KPI grid renders first.

---

## 17. React Component Structure
<a id="17-component-structure"></a>

### Component composition rules

1. **One component, one responsibility.** A component that fetches data AND renders 6 sub-views is two components.
2. **Container/Presenter** for complex screens: `FIRsPage` (data orchestration) → `FIRTable` (presentation, props-driven).
3. **Headless first.** Build `useFIRTable` hook holding sorting/filtering/pagination logic. The visual `FIRTable` is a thin wrapper. Same hook can power a mobile card list.
4. **Compound components for complex UI.** `<Dialog><Dialog.Trigger/><Dialog.Content/></Dialog>` style — already what shadcn/Radix gives us.
5. **No props drilling deeper than 2 levels.** Lift to context or query.

### Naming conventions
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`
- Types: `PascalCase` for types/interfaces
- Files match default export name

### Example: FIR table

```tsx
// components/fir/fir-table.tsx
"use client";
import { useFIRsQuery } from "@/hooks/use-firs";
import { useFIRTableState } from "@/hooks/use-fir-table-state";
import { DataTable } from "@/components/data/data-table";
import { firTableColumns } from "./fir-table-columns";

export function FIRTable() {
  const { filters, sort, page, setSort, setPage, setFilters } = useFIRTableState();
  const { data, isLoading, error } = useFIRsQuery({ filters, sort, page });

  if (error) return <ErrorState onRetry={...} />;
  return (
    <DataTable
      columns={firTableColumns}
      data={data?.items ?? []}
      isLoading={isLoading}
      pagination={{ page, total: data?.total, onChange: setPage }}
      sorting={sort}
      onSortChange={setSort}
      emptyState={<EmptyFIRs onClearFilters={() => setFilters({})} />}
    />
  );
}
```

### Component contract template

Every shared component has a header comment with:
```
/**
 * <Name>
 * Purpose: 1-line
 * Props: see <Props> type
 * Used by: list of screens
 * A11y: keyboard nav, ARIA roles
 */
```

---

## 18. State Management
<a id="18-state-management"></a>

### Hierarchy of state (in order of preference)

1. **URL state** (nuqs) — filters, sort, page, search query, selected zones, date ranges. **Anything that should be shareable lives here.**
2. **Server state** (TanStack Query) — anything from API. Query keys are arrays mirroring URL state.
3. **Local component state** (useState/useReducer) — open/closed, hover, form drafts.
4. **Cross-cutting UI state** (Zustand) — sidebar collapsed, theme, command palette open, recent searches. Only when prop drilling is impractical.
5. **Avoid global state for server data** — TanStack Query is the cache; don't duplicate.

### Query key pattern

```ts
// lib/query-keys.ts
export const queryKeys = {
  firs: (filters: FIRFilters) => ["firs", filters] as const,
  fir: (id: string) => ["fir", id] as const,
  hotspots: (params: HotspotParams) => ["hotspots", params] as const,
  forecast: (zoneId: string) => ["forecast", zoneId] as const,
  // ...
};
```

### Mutations

```ts
const createFIR = useMutation({
  mutationFn: (input: FIRInput) => api.firs.create(input),
  onSuccess: (newFIR) => {
    queryClient.invalidateQueries({ queryKey: ["firs"] });
    queryClient.setQueryData(["fir", newFIR.id], newFIR);
    toast.success(`FIR ${newFIR.fir_no} registered`);
  },
  onError: (err) => toast.error(parseAPIError(err)),
});
```

### Optimistic updates
For likely-to-succeed mutations (mark FIR closed, mark patrol stop done), update cache immediately, rollback on error. Always pair with toast feedback.

### SSE integration
SSE events trigger query invalidation:
```ts
useSSE("/api/v1/events", {
  "fir.created": () => queryClient.invalidateQueries({ queryKey: ["firs"] }),
  "spike.detected": (payload) => {
    toast.warning(`Spike: ${payload.message}`);
    queryClient.invalidateQueries({ queryKey: ["hotspots"] });
  },
});
```

### Persistence
- Theme + locale + sidebar collapsed: localStorage
- Recent searches (last 5): localStorage
- Form drafts: localStorage with TTL (auto-expire after 24h)
- TanStack Query cache: in-memory only (no persistence — security)

---

## 19. API Integration Layer
<a id="19-api-integration"></a>

### API client (`lib/api-client.ts`)

```ts
class APIError extends Error {
  constructor(public status: number, public code: string, public details?: any) { ... }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCSRFTokenFromCookie(),
      ...opts.headers,
    },
    ...opts,
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, opts);
    redirectToLogin();
    throw new APIError(401, "UNAUTHORIZED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body.code ?? "UNKNOWN", body);
  }

  return res.json();
}
```

### Domain wrappers (per resource)

```ts
// lib/api/firs.ts
export const firs = {
  list: (filters: FIRFilters) =>
    request<Paged<FIR>>(`/firs?${qs(filters)}`),
  get: (id: string) =>
    request<FIR>(`/firs/${id}`),
  create: (input: FIRInput) =>
    request<FIR>(`/firs`, { method: "POST", body: JSON.stringify(input) }),
  bulkImport: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ imported: number; failed: number }>(`/firs/bulk`, {
      method: "POST",
      body: fd,
      headers: {}, // let browser set boundary
    });
  },
};
```

### Error normalization
All errors from API are `APIError` with consistent shape:
```ts
{ status: number, code: string, message: string, details?: any }
```
The `parseAPIError(e: unknown): string` helper turns this into a user-facing string for toasts.

### Real-time
SSE only. WebSocket reserved for future bi-directional features.

---

## 20. Performance Strategy
<a id="20-performance"></a>

**Targets:**
- LCP < 2.5s on 4G, mid-range Android
- CLS < 0.05
- INP < 200ms
- JS bundle (gzipped) < 200KB initial route, < 500KB total
- Image total per page < 200KB

### Tactics

| Lever | Implementation |
|---|---|
| Code-splitting | App Router auto-splits per route; dynamic imports for Map, Charts |
| Map import | `dynamic(() => import("react-leaflet"), { ssr: false })` — avoid hydration mismatch + cuts SSR cost |
| Image optimization | `next/image` with width/height, AVIF/WebP, lazy below fold |
| Font optimization | `next/font` with `display: swap`, preload Inter, subset Devanagari |
| Tree-shake icons | `lucide-react` per-icon import |
| Recharts | Memoize data, throttle resize listener |
| Tables | Virtualize when rows > 100 (TanStack Virtual) |
| Markers | Cluster ≥ 50 points; LOD switch (heatmap > clusters > raw) by zoom level |
| Caching | TanStack Query `staleTime: 30s` for lists, `60s` for analytics |
| Prefetch | Hover on FIR row → `queryClient.prefetchQuery` for detail |
| Service worker | PWA caches shell + last-fetched data; offline FIR draft saving |
| Compression | Brotli at Nginx; backend already gzips JSON |
| Critical CSS | App Router automatic |
| Avoid re-renders | `React.memo` on map sub-layers, `useCallback` for stable handlers |
| Web Vitals telemetry | Send to backend `/api/v1/metrics/web-vitals` for monitoring |

### Bundle audit
Run `next build --analyze` per release; investigate any chunk > 100KB.

---

## 21. Iconography & Illustration
<a id="21-iconography"></a>

### Icons
- **Library:** Lucide
- **Sizes:** 16 (inline text), 20 (default UI), 24 (large CTAs, headers)
- **Stroke:** 1.5px
- **Color:** inherits from text color
- **Pairing:** Always pair icons with text labels in primary nav and CTAs (no icon-only buttons except in toolbars where context is unambiguous)

### Illustration style
- Line-based, single accent color (`--accent-500`) on light tint background (`--accent-50`)
- 1.5px stroke matching icons
- Subtle, abstract, geometric — no human figures, no characters
- Used in: empty states, onboarding cards, login left-column hero, marketing landing page
- Format: SVG, inlined for color theming
- Sizes: 80×80 (empty states), 240×240 (onboarding), 480×480+ (hero)

### Map markers
Custom SVG markers, sized 24px (low-density) → 48px (high-density), background fill from risk palette, white drop shadow ring for contrast against map.

### Logo / Mark
Wordmark "CrimeMap" + abstract "C" mark formed by a stylized polygon (zone) with a target dot. Provided in SVG, 24px and 32px variants. Bilingual lockup (English on top, Hindi below) for official documents.

---

## 22. Developer Handoff Checklist
<a id="22-handoff"></a>

### Per design (every Figma frame → ticket)

- [ ] **Wireframe** approved by PM
- [ ] **Hi-fi** approved by design lead
- [ ] **All states** designed (loading, empty, error, success, hover, focus, active, disabled)
- [ ] **Responsive** breakpoints designed (sm, md, lg)
- [ ] **Dark mode** rendered
- [ ] **A11y** notes (focus order, ARIA roles, keyboard shortcuts)
- [ ] **Tokens** referenced (no raw hex, no raw px outside spacing scale)
- [ ] **Component spec** — which shadcn/our components compose this screen
- [ ] **Data contract** — exact API endpoints + response shape
- [ ] **Edge cases** documented (long names, missing fields, zero data, max data)
- [ ] **Microinteractions** annotated (hover, transition, loading)
- [ ] **Copy** finalized (en + hi)
- [ ] **i18n** keys created in `locales/en.json` + `locales/hi.json`
- [ ] **Analytics events** defined (what to track on click/view)
- [ ] **Performance budget** — does this screen fit our LCP target?

### Per release

- [ ] Lighthouse ≥ 95 (Performance, A11y, Best Practices, SEO)
- [ ] axe-core 0 violations
- [ ] Bundle size diff reviewed
- [ ] Visual regression tests pass (Playwright snapshots)
- [ ] All TODOs resolved or ticketed
- [ ] CHANGELOG entry with screenshots

---

## 23. AI Design Tool Prompts
<a id="23-ai-prompts"></a>

This section contains **ready-to-paste prompts** for AI design tools (Claude Design, Stitch, v0, Figma Make). Each prompt references this document so the tool inherits the design system.

### 23.1 Master context block (paste once per session)

```
You are designing screens for a Crime Predictive Hotspot Mapping System for Bihar Police.

DESIGN SYSTEM (use exactly):
- Font: Inter + Noto Sans Devanagari
- Spacing: 4px base scale (4, 8, 12, 16, 24, 32, 48, 64)
- Radii: 4 / 6 / 10 / 14 / 20 / 9999
- Brand accent: #3B6EFF (light) / #5B8AFF (dark) — single accent only
- Risk palette: low #16A34A, medium #D97706, high #DC2626, critical #7F1D1D
- Backgrounds: page #FBFBFC light / #0B0D10 dark; surface #FFFFFF / #15181D
- Borders preferred over shadows. Shadows only for floating overlays.
- Icons: Lucide, 1.5px stroke, 16/20/24px
- Density: dashboard-grade (Linear / Stripe / Vercel as references)
- Components: shadcn/ui primitives (button, input, card, dialog, dropdown, tabs)

PRINCIPLES:
1. Map-first for any spatial view
2. One primary CTA per screen
3. Color = meaning (risk palette only for risk, never decoration)
4. Numbers always anchored with comparisons
5. Skeletons not spinners
6. WCAG 2.2 AA — 4.5:1 contrast, focus rings on every interactive
7. Bilingual: every label in English + Hindi (Devanagari)

Always design with: empty state, loading skeleton, error state, hover state, focus state, dark-mode variant.
```

### 23.2 Screen prompts

**Dashboard:**
```
Generate the home dashboard screen.
Layout: 240px left sidebar (8 items) + main flex area + optional 360px right rail.
Top: page header with greeting, date, date range picker, primary CTA "Register FIR", notification bell, avatar.
Below header: 4-column KPI grid (FIRs this week with trend; open cases; avg response time; active patrols), each KPI is a stat card with sparkline.
Below KPIs: full-width hotspot map preview card (320px tall) with filter chips and "Open full map" link.
Below: 1:1 two-column split — left "Recent FIRs" 5-row table with status badges; right "This week's forecast" line chart with confidence band.
Bottom: 3-column row — top crime types horizontal bar; top hotspots list with risk badges; officer leaderboard.
Use the design system. Render light + dark variants.
```

**Hotspot Map:**
```
Generate the hotspot map screen.
Full-bleed Leaflet map. Floating UI: top-left filter bar (zone, crime type, date range, apply); top-right control stack (zoom +/−, layer toggle, fullscreen, share, screenshot); bottom full-width time-slider with play/pause and speed control.
Right-side drawer (360px) opens on cluster click — shows cluster stats, contributing FIRs list, "Generate patrol route" CTA.
Cluster markers sized by count, colored by risk palette. KDE heatmap toggle.
Empty state when no data in range. Banner if ML service degraded.
```

**FIR Create modal:**
```
Generate a 720px modal for FIR creation with a 3-step stepper at top (Incident → Location → People).
Step 1: crime type autocomplete with IPC sections, date/time picker (default now), description multiline with NER entity highlighting.
Step 2: map picker for location + address geocoding input, zone auto-filled.
Step 3: victim/accused/witness fields.
Footer: "Save draft" left, "Back" + "Next/Submit" right.
Show validation errors inline. Show autosaved draft banner on reopen.
```

**FIR List:**
```
Generate the FIR list screen.
Header with title + count + bulk import + register CTA. 240px collapsible filter rail (status, crime type, zone, date range, registered_by, victim_gender, has_attachments). Search bar full-width above table. Active filter chips.
Table columns: FIR No (mono) | Date | Crime type | Zone | Status badge | Victim | Officer | Actions kebab. Sticky header. Hover row highlight. Click row → right rail with FIR preview.
Sticky bulk action bar when ≥1 selected. Pagination footer.
Show empty state, loading skeleton (5 rows), error state.
```

**Analytics — Forecast tab:**
```
Generate the forecast analytics view.
Top: zone selector + crime type selector + accuracy badge ("MAE 4.2").
Main: full-width line chart, 400px tall, historical data left, 30-day forecast right with confidence band shaded. X axis = date, Y axis = incident count.
Right side panel: plain-English summary ("Patna Central is forecast to see 18-25 thefts next week, 12% above 4-week average"), "How was this calculated?" link.
Below chart: table of last 30 days actual vs predicted.
```

### 23.3 Component prompts

**Stat card:**
```
Generate a stat card component, 280×140px, card style (radius 10, 1px border, 16px padding, surface bg). Top: 12px overline label "FIRS THIS WEEK", info icon right. Center: 32px stat number "1,247" + green trend chip "↑12.3%" with "vs last week" caption below. Bottom: 60×24 sparkline. Hoverable; light + dark variants.
```

**Risk badge:**
```
Generate a risk badge — pill shape, h-5 (20px), rounded-full, 4px horizontal padding. Variants: low (green tint bg + green text), medium (amber tint + amber text), high (red tint + red text), critical (dark red tint + dark red text). Always pair color with word + dot icon left.
```

**Map control stack:**
```
Generate a vertical floating button stack for map controls. White surface, radius 10, shadow-md. Buttons: zoom in (+), zoom out (−), divider, layer toggle (stacked squares icon), fullscreen, share link, screenshot. Each button 40×40, ghost style with hover bg subtle, focus ring on tab.
```

### 23.4 How to use this section

1. Paste **23.1** at the start of a chat with the AI design tool to load context.
2. Paste a **screen prompt** (23.2) to generate that screen.
3. Drill into specific components with **23.3** prompts.
4. Iterate — ask the tool to "add the empty state" or "show the dark mode" or "add the mobile breakpoint".

---

## Appendix A — Domain glossary (for designers/AI)

| Term | Plain meaning |
|---|---|
| FIR | First Information Report — police case record |
| Zone | A police jurisdiction (district, subdivision, station) |
| IPC | Indian Penal Code — what law was broken |
| Hotspot | Geographic cluster of incidents |
| KDE | Kernel Density Estimation — smooth heatmap |
| DBSCAN | Algorithm that groups points by proximity |
| PAI | Predictive Accuracy Index — measures hotspot quality |
| SHO | Station House Officer — runs a police station |
| CCTNS | Crime & Criminal Tracking Network — gov data system |
| IRAD | Integrated Road Accident Database |
| Geo-fence | Drawn boundary that triggers alerts |
| Spike | Anomalous increase in crime |
| Near-repeat | Crimes happening close in space + time after another |

## Appendix B — Cross-document map

| If you need… | Read |
|---|---|
| Why it's built this way | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What endpoints exist | [API_REFERENCE.md](API_REFERENCE.md) |
| Database fields | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| ML algorithm details | [ML_ALGORITHMS.md](ML_ALGORITHMS.md) |
| Local dev setup | [SETUP.md](SETUP.md) |
| What to build next | [AI_IMPLEMENTATION_PLAN.md](AI_IMPLEMENTATION_PLAN.md) |
| Env vars | [ENV_REFERENCE.md](ENV_REFERENCE.md) |

---

*End of UI/UX & Frontend Design specification.*
