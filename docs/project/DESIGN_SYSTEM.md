# Design System & Styling

InvoiceOps uses a custom CSS utility system built on CSS Variables (Design Tokens) to ensure consistency and ease of customization. The design follows enterprise-grade principles prioritizing clarity, accuracy, and trust.

## 🎨 Color Palette

| Token | Light Value | Description |
| :--- | :--- | :--- |
| `--primary` | `#007AFF` (System Blue) | Primary actions & branding - professional, trustworthy |
| `--primary-hover` | `#0051D5` | Hover state for primary actions |
| `--secondary` | `#10b981` (Emerald) | Success states & markers |
| `--background`| `#ffffff` | Main page background - clean, professional |
| `--foreground`| `#1d1d1f` | Primary text - high contrast for readability |
| `--border` | `#d2d2d7` | Line divisions - subtle, clear |

## 📐 Spacing & Radius

- **Radius**: `sm (0.375rem)`, `md (0.5rem)`, `lg (0.75rem)` - minimal, professional rounding
- **Shadows**: Minimal shadows only where functionally necessary for depth (modals, dropdowns)

## ✨ Specialized Classes

### `.glass`
Implementation of glassmorphism for overlays.
- **Background**: `rgba(255, 255, 255, 0.95)`
- **Backdrop-Filter**: `blur(20px)`
- **Border**: Subtle border for edge definition

### `.card`
The primary container for content modules.
- Clean borders instead of shadows
- Consistent padding (`1.5rem`)
- Subtle hover states via border color changes

### `.btn`
Standardized button styles following Apple HIG principles.
- `.btn-primary`: System blue background, clear call-to-action
- `.btn-secondary`: Ghost/Bordered style for secondary actions
- No scale transforms - clean, professional interactions

## 🔡 Typography

- **Headings**: `Inter` - System font for consistency and clarity
- **Body**: `Inter` - High legibility, neutral tone, optimized for financial data
- **Font Weight**: 600 for headings, 400-500 for body text
- **Letter Spacing**: Minimal negative tracking for headings (-0.01em)

## 🎯 Design Principles

1. **Clarity**: High contrast, clear typography, unambiguous interactions
2. **Accuracy**: Precise spacing, consistent alignment, reliable data presentation
3. **Trust**: Professional color palette, minimal decorative elements, focus on content
4. **Efficiency**: Clean flows inspired by WhatsApp's simplicity, Apple HIG compliance
