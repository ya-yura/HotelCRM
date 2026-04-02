# 11 Design System

Sources: `02_principles.md`, `10_frontend.md`

## 1. Design direction

The UI should feel calm, operational, and legible under pressure. It is not decorative. It should use strong contrast, clear grouping, and visible status semantics.

## 2. Tokens

### Spacing

- `space-1`: 4
- `space-2`: 8
- `space-3`: 12
- `space-4`: 16
- `space-5`: 24
- `space-6`: 32

### Radius

- `radius-sm`: 8
- `radius-md`: 12
- `radius-lg`: 16

### Typography

- Font: `Manrope` or `IBM Plex Sans`
- Body size: 16px minimum on mobile
- Small labels: 13px
- Section headers: 20px
- Numeric summary cards: 28px semibold

## 3. Colors

- background: `#F6F3EC`
- surface: `#FFFDF8`
- text-primary: `#1C1A17`
- text-secondary: `#5F5A52`
- border: `#D9D1C5`
- accent: `#146356`
- warning: `#C17C00`
- danger: `#B23A2B`
- info: `#1E5AA8`

## 4. Status colors

- confirmed / available / paid: accent green
- pending / partial / queued: warning amber
- dirty / blocked / unpaid critical: danger red
- occupied / in progress: info blue
- neutral archived states: muted gray

## 5. Component rules

- Cards must show one main number or one main decision
- Buttons: one primary action per viewport section
- Chips: short labels only, never sentence text
- Inputs: clear labels above field, helper text only when needed
- Dialogs: used only for destructive confirmation or conflict resolution

## 6. Accessibility and readability

- 4.5:1 contrast minimum for text
- Touch target at least 44x44
- Color never used as sole status signal; pair with icon/label
- Numbers aligned for rapid scanning in finance and occupancy cards
