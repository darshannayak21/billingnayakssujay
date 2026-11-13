# Nayaks Sujay: Design Style

Clean, modern, Apple-like. White space first, one strong accent, thin lines, quiet gray for secondary text.

Origin: the Technovision 2026 Round 2 schedule PDF (Zero Syntax), which used a blue accent. For Nayaks Sujay the accent is swapped to the hotel orange. Everything else stays the same.

## Colors

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--text` | `#111111` | Primary text, headlines |
| `--text-2` | `#333333` | Body text |
| `--text-3` | `#6B6B6B` | Labels, secondary text, column labels |
| `--text-4` | `#9A9A9A` | Second line of a headline |
| `--accent` | `#F26B1D` | Tags, pills, table group headers, key highlights |
| `--accent-tint` | `#FFF3EA` | Soft orange fill (room cells, total rows) |
| `--accent-line` | `#E8D3C2` | Borders on tinted cells |
| `--card` | `#F6F6F6` | Light gray rounded cards |
| `--line` | `#D4D4D4` | Thin dividers and table grid |

Rule: one accent only. Orange is for highlights, never large backgrounds. The last card in a row of cards can be solid orange with white text.

## Typography

Font: **Inter** (fallback: `-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`)

| Role | Weight | Size | Notes |
|---|---|---|---|
| Headline | 700 | 21 to 40 | Letter spacing -0.02em, line height 1.05. Second line in `--text-4` |
| Hero number | 700 | 48 to 72 | Pair with an orange pill tag |
| Section title | 500 | 14 to 18 | Color `--text` |
| Body | 400 | 12 to 14 | Color `--text-2` |
| Label / column title | 500 | 9 to 10 | UPPERCASE, letter spacing 0.07em, color `--text-3` |
| Pill tag | 500 | 9 | UPPERCASE, letter spacing 0.12em, white on orange, fully rounded |
| Footer | 500 | 9 | Color `--text-3`, page number in `--text` |

Use Medium (500) for headings and emphasis, Regular (400) for body. Keep Bold (700) for big headlines and totals only.

## Layout

- Generous padding. Nothing touches the edges (8 mm margin in print, 24 px minimum on screen).
- Top bar: product or section name on the left in gray, current section on the right with a dark (`#111`) underline, 0.45 mm thick.
- Big bold headline, second line gray.
- Cards: `--card` background, radius 12 to 16 px, small icon, title, short text. Cards sit in a row of three, the last one in solid orange with white text.
- Dividers: 1 px `--line`, never heavy boxes.
- Footer: document name and date on the left, page number like `01 / 03` on the right.

## Tables

- White background, thin `--line` grid.
- Column labels: small uppercase gray.
- Header underline in orange, 0.45 mm.
- Group headers (for example Advance, T. Business): solid orange, white text, bold, letter spacing 0.12em.
- First column (room number): `--accent-tint` fill, Medium weight, centered.
- New floor or section: orange line on top of the first row.
- Total row: `--accent-tint` fill, bold text, dark `#111` line on top.

## Components

- **Pill tag:** orange fill, white text, radius 999px, padding 4px 10px.
- **Primary button:** orange fill, white text, radius 12px, height 44px, Medium 500.
- **Secondary button:** white fill, 1 px `--line` border, `--text` color.
- **Input field:** white, 1 px `--line` border, radius 10px, focus border `--accent`.
- **Status colors:** keep to orange, gray and near-black. Add green or red only where meaning requires it (paid, refund).

## CSS starter

```css
:root {
  --bg: #FFFFFF;
  --text: #111111;
  --text-2: #333333;
  --text-3: #6B6B6B;
  --text-4: #9A9A9A;
  --accent: #F26B1D;
  --accent-tint: #FFF3EA;
  --accent-line: #E8D3C2;
  --card: #F6F6F6;
  --line: #D4D4D4;
  --radius: 14px;
  font-family: Inter, -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
}
body { background: var(--bg); color: var(--text-2); }
h1 { font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; color: var(--text); }
h1 span { color: var(--text-4); }
.label { font-size: 10px; font-weight: 500; letter-spacing: .07em; text-transform: uppercase; color: var(--text-3); }
.pill { background: var(--accent); color: #fff; font-size: 9px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
.card { background: var(--card); border-radius: var(--radius); padding: 20px; }
.card.accent { background: var(--accent); color: #fff; }
.divider { border-top: 1px solid var(--line); }
```
