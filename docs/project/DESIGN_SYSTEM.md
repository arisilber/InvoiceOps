# Design System & Styling

InvoiceOps uses a custom CSS utility system built on CSS Variables (Design Tokens) to ensure consistency and ease of customization.

## 🎨 Color Palette

| Token | Light Value | Description |
| :--- | :--- | :--- |
| `--primary` | `#6366f1` (Indigo) | Primary actions & branding |
| `--secondary` | `#10b981` (Emerald) | Success states & markers |
| `--background`| `#f8fafc` | Main page background |
| `--foreground`| `#0f172a` | Primary text |
| `--border` | `#e2e8f0` | Line divisions |

## 📐 Spacing & Radius

- **Radius**: `sm (0.5rem)`, `md (0.75rem)`, `lg (1rem)`.
- **Shadows**: Custom `sm`, `md`, `lg` elevation system using box-shadows.

## ✨ Specialized Classes

### `.glass`
Implementation of glassmorphism.
- **Background**: `rgba(255, 255, 255, 0.4)`
- **Backdrop-Filter**: `blur(12px)`
- **Border**: Translucent to define edges.

### `.card`
The primary container for content modules.
- Includes hover lifts (`translateY(-2px)`) for interactivity.
- Consistent padding (`1.5rem`).

### `.btn`
Standardized button styles.
- `.btn-primary`: Brand color background.
- `.btn-secondary`: Ghost/Bordered style.

## 🔡 Typography

- **Headings**: `Outfit` - Chosen for its geometric, modern profile.
- **Body**: `Inter` - Chosen for high legibility and neutral tone.
