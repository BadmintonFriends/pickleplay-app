# PicklePlay Design System

## 1. Atmosphere & Identity

PicklePlay is a compact mobile-first tournament utility: dark, court-lit, and quick to scan. The signature is optic yellow on layered ink surfaces, used only for actions, selected states, and live tournament emphasis.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--background` | `oklch(0.92 0.006 80)` | `oklch(0.13 0.01 0)` | App background |
| Surface/card | `--card` | `oklch(0.97 0.003 80)` | `oklch(0.17 0.005 0)` | Cards, menus, modals |
| Surface/muted | `--muted` | `oklch(0.88 0.005 80)` | `oklch(0.22 0.005 0)` | Inputs, subtle rows |
| Surface/ink | `--ink-3` | `oklch(0.90 0.005 80)` | `oklch(0.22 0.005 0)` | Form fields |
| Text/primary | `--foreground` | `oklch(0.15 0.01 0)` | `oklch(0.98 0 0)` | Main copy |
| Text/secondary | `--muted-foreground` | `oklch(0.42 0.01 0)` | `oklch(0.65 0 0)` | Hints, metadata |
| Border/default | `--border` | `oklch(0.83 0.008 80)` | `oklch(0.25 0 0 / 0.5)` | Dividers |
| Accent/primary | `--primary` | `oklch(0.82 0.22 120)` | `oklch(0.92 0.22 120)` | CTAs, selected states |
| Accent/hover | `--optic-deep` | `oklch(0.70 0.20 120)` | `oklch(0.83 0.2 120)` | CTA hover |
| Status/error | `--destructive` | `oklch(0.55 0.22 25)` | `oklch(0.58 0.22 25)` | Errors and destructive actions |

### Rules

- Accent is functional, never decorative.
- Community moderation actions use warning/destructive color only at the action surface.
- Do not add raw colors in feature code; use existing Tailwind tokens.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 18px | 700 | 1.4 | 0 | Mobile page titles |
| H2 | 16px | 700 | 1.4 | 0 | Dialog and card headings |
| Body | 14px | 400 | 1.5 | 0 | Default content |
| Body/sm | 12px | 400 | 1.45 | 0 | Metadata and helper text |
| Caption | 10px | 700 | 1.3 | 0 | Badges and compact labels |

### Font Stack

- Primary: `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif`
- Display: `Archivo Black`, `sans-serif`

## 4. Spacing & Layout

### Base Unit

All spacing uses 4px increments.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon and tight inline gaps |
| `--space-2` | 8px | Compact buttons, list rows |
| `--space-3` | 12px | Header and menu padding |
| `--space-4` | 16px | Page side padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Dialog padding |

### Grid

- App max width: 480px on desktop.
- Primary target: mobile viewport, full-width content with 16px side padding.

## 5. Components

### Header Bar
- **Structure**: sticky top bar, 48px height, icon buttons at edges.
- **States**: hover uses `bg-muted`; focus keeps default ring.
- **Accessibility**: icon-only buttons need text labels when not visually obvious.

### Card / Modal
- **Structure**: `bg-card`, rounded 16px, `border-line-strong`.
- **Spacing**: 20-24px inner padding.
- **States**: destructive choices use red/orange text, not full red surfaces unless confirming.

### Form Control
- **Structure**: tokenized `Input`, `Textarea`, `Checkbox`.
- **States**: disabled opacity, focus ring, active primary border.
- **Accessibility**: labels are visible for required profile fields and consent rows.

### Community Action Menu
- **Structure**: compact popover menu with text and lucide icons.
- **Variants**: edit, delete, report, hide, pin.
- **States**: hover row background; destructive/report actions use semantic text color.

## 6. Motion & Interaction

- Micro interactions use 100-200ms transitions.
- Loading uses existing spinner icons.
- File upload must use native file picker activation via label/input for WebView compatibility.

## 7. Depth & Surface

Strategy: mixed tonal shift plus subtle borders.

- Primary depth comes from `bg-background`, `bg-card`, `bg-muted`, and `bg-ink-3`.
- Borders use `border-line` and `border-line-strong`.
- Shadows are reserved for popovers, menus, and modals.
