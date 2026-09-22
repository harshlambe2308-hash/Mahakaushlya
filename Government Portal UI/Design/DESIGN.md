---
name: MahaKaushal Civic Enterprise System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474f'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6d0'
  surface-tint: '#485e8a'
  primary: '#001435'
  on-primary: '#ffffff'
  primary-container: '#0f2952'
  on-primary-container: '#7b91c0'
  inverse-primary: '#b0c7f9'
  secondary: '#a63b00'
  on-secondary: '#ffffff'
  secondary-container: '#fc671e'
  on-secondary-container: '#561b00'
  tertiary: '#001b06'
  on-tertiary: '#ffffff'
  tertiary-container: '#003211'
  on-tertiary-container: '#1ea74d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b0c7f9'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#304671'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb598'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
This design system embodies the executive authority, statutory trust, and progressive governance of the Government of Maharashtra’s skill development and employment mission (*कौशल्यापासून रोजगारापर्यंत*). Designed for administrative officers, district magistrates, training partners, and verification officers, it delivers high operational efficiency across large volumes of civic data.

The aesthetic follows **Corporate / Modern** principles with high information density, structural rigor, and uncompromising clarity. It balances sovereign dignity—signified by deep institutional navy blues and tricolor-inspired accents—with modern ergonomic data visualization, crisp tabular layouts, and clear administrative workflows. The interface projects reliability, regulatory precision, speed, and zero ambiguity.

## Colors
The palette is derived directly from the institutional emblem and the state identity:

- **Primary (`#0F2952`)**: Deep Navy Blue represents institutional authority, governance, stability, and statutory accountability. Used for the main masthead, executive side navigation, key headers, and core brand anchoring.
- **Secondary (`#E8590C`)**: Vibrant Maharashtra Saffron / Deep Orange drives primary calls-to-action, key administrative review actions, active navigational highlights, and progress milestones.
- **Tertiary (`#16A34A`)**: Forest Green evokes national progress, successful placement verification, approved accreditation states, and positive audit metrics.
- **Neutral (`#64748B`)**: Slate neutral family ranging from deep charcoal (`#0F172A`) for high-contrast legible data text down to light tinted slates (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`) for resilient table zebra striping and card boundaries.

### Semantic Status Palette
- **Verified / Approved**: Background `#F0FDF4`, Border `#BBF7D0`, Text `#15803D`
- **Pending Verification**: Background `#FFFBEB`, Border `#FDE68A`, Text `#B45309`
- **Action Required / Flagged**: Background `#FEF2F2`, Border `#FECACA`, Text `#B91C1C`
- **Under Review / Processing**: Background `#EFF6FF`, Border `#BFDBFE`, Text `#1D4ED8`

## Typography
The typographic hierarchy prioritizes rapid scannability, legal compliance, and multi-lingual bilingual parity (English and Marathi/Devanagari scripts). 

- **Inter** provides neutral, optical clarity for English enterprise labels, numeric financial metrics, candidate Aadhaar/registration IDs, and administrative data grids. Tabular figures (`font-variant-numeric: tabular-nums`) must be enabled on all numerical outputs to align currency, roll numbers, and placement counts.
- **Noto Sans** is utilized for Devanagari bilingual institutional subtitles (*कौशल्यापासून रोजगारापर्यंत*), statutory terms, status labels, and localization elements, matching the baseline, stroke weight, and x-height of Inter.

## Layout & Spacing
The layout architecture leverages a 12-column responsive fluid grid structured for dense desktop workflows, scaling gracefully to field-officer tablets:

- **Desktop (1280px and above)**: Collapsible persistent left navigation (240px wide or 64px compact), fixed 56px top institutional header, fluid main canvas with 24px margins (`margin-lg`) and 20px gutters (`gutter-lg`). Grid structures support 4-card metric summaries, 8/4 split verification workflows, and 12-column master data registers.
- **Tablet (768px - 1279px)**: 8-column layout, left navigation automatically collapses to an off-canvas drawer with standard icon rail, 16px margins (`margin-md`), and 16px gutters (`gutter`).
- **Mobile (< 768px)**: 4-column reflow, full-width analytical cards, horizontal scroll overflow enabled on high-density data tables, bottom-docked primary action bars for field inspectors.

Vertical rhythm relies strictly on an 8px base grid with 4px sub-increments for high-density components such as data grids, badge padding, and form row spacing.

## Elevation & Depth
This design system rejects heavy floating drop shadows and blur-heavy glassmorphism in favor of structured **tonal layering and crisp low-contrast structural borders**. This ensures maximum legibility under varying office display conditions and meets rigorous public-sector accessibility standards.

- **Canvas Base (Level 0)**: `#F8FAFC` background tinted with cool slate.
- **Surface Cards & Table Containers (Level 1)**: Pure `#FFFFFF` surface bounded by a crisp 1px solid `#E2E8F0` hairline border with a soft ambient definition: `box-shadow: 0 1px 3px 0 rgba(15, 41, 82, 0.04), 0 1px 2px -1px rgba(15, 41, 82, 0.04)`.
- **Active Navigation / Hover States (Level 2)**: Crisp card elevation using `box-shadow: 0 4px 6px -1px rgba(15, 41, 82, 0.07), 0 2px 4px -2px rgba(15, 41, 82, 0.05)`.
- **Administrative Modals & Flyout Drawers (Level 3)**: `#FFFFFF` elevation with deep directional grounding: `box-shadow: 0 20px 25px -5px rgba(15, 41, 82, 0.12), 0 8px 10px -6px rgba(15, 41, 82, 0.08)`. Backdrops use `#0F2952` with 40% opacity (`rgba(15, 41, 82, 0.40)`) to maintain brand continuity.

## Shapes
In line with an institutional, data-intensive administrative dashboard, this design system uses **Soft (`1`)** shape geometry:

- **Controls & Inputs**: 4px radius (`0.25rem`) provides clean, sharp structural alignment across compact administrative forms and aligned data tables.
- **KPI & Dashboard Cards**: 6px to 8px radius (`0.375rem` to `0.5rem`) creates distinct panel separation while avoiding excessive, frivolous curves.
- **Status Badges & Indicator Tags**: Rounded pill (`9999px`) or soft capsule (4px) to distinguish classification tags from functional clickable buttons.
- **Decorative Elements**: Geometric line dividers inspired by the emblem's clean vector cuts, using 2px accent base rules in Maharashtra Saffron (`#E8590C`) and Green (`#16A34A`).

## Components

### 1. Official Header & Navigation
- **State Identity Masthead**: 56px height. Left side contains the Maharashtra Emblem alongside the MahaKaushal mark with bilingual lockup (*Government of Maharashtra / कौशल्यापासून रोजगारापर्यंत*).
- **Executive Sidebar**: Dark Navy (`#0F2952`) themed. Active nav items display a 3px left border in vibrant Saffron (`#E8590C`), white text, and `#183B70` background fill. Inactive items use `#94A3B8`.

### 2. Administrative Metric & KPI Cards
- White surface, 1px `#E2E8F0` border.
- Features a 3px colored accent stripe at the top edge corresponding to domain health (Saffron for pipeline candidates, Forest Green for completed placements, Deep Navy for accredited centers).
- Metric figure displayed in `headline-xl` using tabular numbers, paired with micro trend indicator badges (+12.4% vs last cycle).

### 3. Data Tables (High Density)
- **Header**: `#F1F5F9` background, 11px uppercase bold slate typography (`#475569`), 10px vertical cell padding.
- **Row**: Alternating subtle zebra striping (`#FFFFFF` to `#F8FAFC`). Hover state highlights row in `#F1F5F9` with a subtle primary border.
- Inline actionable tools: Quick-view drawer button, approval checkmark button, and PDF dossier download icon.

### 4. Buttons & CTAs
- **Primary CTA**: Background `#E8590C`, hover `#D9480F`, white bold text, 4px border radius. Used for official submissions, candidate approvals, and export executions.
- **Secondary / Authority Action**: Background `#0F2952`, hover `#183B70`, white text. Used for system configuration, batch assignments, and filter applications.
- **Tertiary / Neutral**: Background transparent, 1px border in `#CBD5E1`, text `#334155`.
- **Destructive**: Background `#DC2626`, hover `#B91C1C`, white text.

### 5. Status Badges & Pills
- Compact height (22px), 4px padding-x, 11px font weight 600.
- **Verified / Placed**: `#DCFCE7` background, `#166534` text with leading 6px green bullet.
- **Action Required / Flagged**: `#FEE2E2` background, `#991B1B` text with alert icon.
- **Pending Scrutiny**: `#FEF3C7` background, `#92400E` text.

### 6. Form Controls
- Height: 36px (compact administrative baseline).
- Border: 1px solid `#CBD5E1`, background `#FFFFFF`. Focus ring: 2px offset ring in `#0F2952`.
- Mandatory field indicator: Maharashtra Saffron asterisk (`*`).