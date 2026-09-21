---
name: MahaKaushal Outcome Tracking System
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
  on-surface-variant: '#434750'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747781'
  outline-variant: '#c4c6d2'
  surface-tint: '#3c5d9d'
  primary: '#002353'
  on-primary: '#ffffff'
  primary-container: '#0f3876'
  on-primary-container: '#84a4e8'
  inverse-primary: '#aec6ff'
  secondary: '#a73a00'
  on-secondary: '#ffffff'
  secondary-container: '#fd651e'
  on-secondary-container: '#571a00'
  tertiary: '#002b0f'
  on-tertiary: '#ffffff'
  tertiary-container: '#00441b'
  on-tertiary-container: '#56b76d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#214583'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#7f2b00'
  tertiary-fixed: '#95f8a7'
  tertiary-fixed-dim: '#79db8d'
  on-tertiary-fixed: '#00210a'
  on-tertiary-fixed-variant: '#005323'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Noto Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a dignified, high-accountability institutional standard for the Government of Maharashtra’s skill development and outcome monitoring ecosystem. It bridges civic gravitas with contemporary digital product design, serving multiple stakeholder tiers: departmental officers, training providers, field verifiers, employers, and candidates tracking placement milestones.

The visual direction follows a **Corporate / Modern Civic** model. It departs from legacy bureaucratic portals by employing disciplined spatial cadence, strict typographic proportion, clean surface containment, and purposeful chromatic hierarchy. The interface projects reliability, administrative precision, and socio-economic empowerment. Every touchpoint conveys procedural integrity while maintaining high legibility for multilingual operations across English and Marathi (Devanagari script).

## Colors

The color palette anchors on institutional stability through deep Maharashtra State navy blue, energized by vibrant national saffron and substantiated by verification emerald. 

- **Primary (`#0f3876`, deep navy `#092c5e`):** The definitive administrative anchor. Utilized for application navigation bars, primary actions, critical metrics, active table states, and official headers.
- **Secondary (`#ea580c`, supporting `#f97316`):** The civic saffron driver. Expresses active trajectory, high-visibility interactive triggers, pending verifications, call-to-action indicators, and alert states requiring user intervention.
- **Tertiary (`#15803d`):** The validation emerald. Designated strictly for certified states: confirmed placements, wage verification validations, successfully settled DBT subsidies, and compliant batch audits.
- **Neutrals (`#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#64748b`, `#0f172a`):** Crisp, cool slate tones that establish structural contrast without ocular fatigue during prolonged data entry and audit review cycles. Dark mode is omitted to preserve compliance with accessibility directives across standard departmental workstations.

## Typography

Noto Sans serves as the universal type engine across all viewports and administrative tiers. It delivers parity between Latin alphanumeric data and Devanagari text strings (Marathi language localization), mitigating glyph clipping, disparate x-heights, or vertical alignment shifts when switching languages dynamically.

Typographic hierarchy enforces strict vertical cadence:
- **Headlines:** Set in bold and semi-bold weights for KPI dashboards, portal section headers, and candidate dossier banners. Letter spacing is kept neutral to prevent rendering anomalies on varied public sector monitor configurations.
- **Body:** Standardized at 14px for general application surfaces and complex data sheets, scaling to 16px for public advisory announcements and step-by-step submission guides.
- **Labels & Microcopy:** Used for field statuses, table meta-headers, and compliance stamps, enforcing crisp weight distinction (500/600) to stand out against high-density data matrices.

## Layout & Spacing

The layout is grounded in a disciplined 12-column responsive fluid grid designed to accommodate dense administrative telemetry, statutory reports, and candidate pipeline boards.

- **Desktop (1280px and above):** 12 columns, 24px gutters (`gutter`), 32px canvas margins (`margin`), with an absolute content bounding cap of 1440px for operational dashboards.
- **Tablet (768px - 1279px):** 8 columns, 16px gutters (`gutter-sm`), 24px margins. Tabular registries switch horizontally scrollable containers with fixed candidate identifier anchors.
- **Mobile (below 768px):** 4 columns, 16px gutters, 16px canvas margins (`margin-sm`). Multi-column audit forms stack vertically into single-column functional groups.

The spacing rhythm strictly aligns to a 4px/8px incremental base scale. Layout containers prioritize high information density while preserving breathing room around transactional action zones.

## Elevation & Depth

Visual hierarchy relies on structural containment, surface separation, and low-contrast perimeter definition rather than dramatic shadow projections, preserving clarity across uncalibrated government display terminals.

- **Canvas Base:** `#f8fafc` serves as the systemic canvas underlayer.
- **Surface Elevation 1 (Cards, Tabular Panels):** Pristine white (`#ffffff`) background bordered with a high-definition 1px perimeter stroke of `#e2e8f0`. Shadow is minimal: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Surface Elevation 2 (Dropdowns, Popovers, Audit Flyouts):** Pristine white (`#ffffff`) overlaying a 1px border of `#cbd5e1`, paired with a structured administrative shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)`.
- **Surface Elevation 3 (Modal Dialogs, Verification Overlays):** Pristine white (`#ffffff`) framed with `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`, dimming the application background with an official slate veil (`rgba(15, 23, 42, 0.45)`).

## Shapes

The design system uses a **Soft** shape archetype (`roundedness: 1`). Corner radii are deliberately restrained to reflect institutional authority and align cleanly with structured data grids.

- **Input controls, table rows, standard badges, and buttons:** 4px radius (`0.25rem`).
- **Cards, dashboard panels, verification dossiers, and alerts:** 8px radius (`0.5rem`).
- **Modals, sliding sidebars, and critical executive widgets:** 12px radius (`0.75rem`).
- **Pill overrides:** Strictly reserved for system status badges (e.g., "Placed", "Pending Audit", "Aadhaar Verified") using full 9999px rounded boundaries.

## Components

### Buttons
- **Primary:** Filled solid navy (`#0f3876`), text white, 4px radius, 8px 16px padding for standard sizes. On hover: shifts to `#092c5e`. Focus ring: 2px offset with 2px stroke in `#ea580c`.
- **Secondary (Action):** Filled solid saffron (`#ea580c`), text white, 4px radius. Used for transactional forward progress (e.g., "Approve Placement", "Generate Certificate"). Hover: `#c2410c`.
- **Outline / Ghost:** 1px border in `#0f3876`, transparent background, text `#0f3876`. Hover fills with `#f1f5f9`.
- **Destructive:** 1px border in `#dc2626` or solid red fill for batch rejections and audit disqualifications.

### Inputs & Selectors
- Text fields use a 1px `#cbd5e1` outline over `#ffffff`, with 8px 12px padding and 4px radius. Focus triggers a 1.5px border of `#0f3876` and an ambient `#0f38761a` outer glow.
- Inline Devanagari toggles and language switches sit flush right within input groups.
- Helper labels sit at 12px font size with `#64748b`. Required field flags display an explicit red asterisk (`#dc2626`).

### Badges & Chips
- Status markers utilize low-saturation tinted backgrounds paired with deep high-contrast text:
  - **Verified / Employed:** Background `#dcfce7`, text `#14532d`, 1px border `#86efac`.
  - **In Process / Verification Pending:** Background `#ffedd5`, text `#9a3412`, 1px border `#fdba74`.
  - **Discrepancy / Rejected:** Background `#fee2e2`, text `#991b1b`, 1px border `#fca5a5`.
  - **Institutional / Batch Code:** Background `#f1f5f9`, text `#0f3876`, 1px border `#cbd5e1`.

### Cards & Layout Containers
- Constructed on `#ffffff` surfaces bounded by 1px `#e2e8f0` structural borders.
- Headers within cards use a subtle `#f8fafc` background divider line (`#e2e8f0`) to clearly isolate filter toolbars and aggregate metric totals from record rows.

### Data Tables
- Header cells: `#f1f5f9` fill, uppercase 11px semi-bold text in `#475569`, 8px 16px padding.
- Data rows: `#ffffff` fill with alternating hover states (`#f8fafc`), 1px bottom divider `#f1f5f9`. Row actions use concentrated icon-plus-label button groups.

### Official Header & Emblem Bar
- A dual-layer portal banner: the top statutory utility strip features the Government of Maharashtra bilingual seal, national emblem clearance, accessibility tools (contrast, font resizing), and Marathi/English toggle. The lower masthead houses the primary identity and core navigation tiers.