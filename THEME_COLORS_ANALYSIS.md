# Elixir Application Theme Colors Analysis

## Primary Color Palette

Based on the Elixir application's theme configuration, here are the main colors used:

### Brand Colors

1. **FDH Blue (Primary)** - `#154E9E`
   - Used for: Primary backgrounds, buttons, sidebar, headers
   - Tailwind class: `bg-fdh-blue`, `text-fdhBlue`
   - Usage: Main brand color, navigation, primary actions

2. **FDH Light Blue** - `#1e62c7`
   - Used for: Active states, hover effects
   - CSS class: `bg-fdh-light-blue`
   - Usage: Active sidebar items, interactive elements

3. **FDH Orange (Accent)** - `#f59e0b`
   - Used for: Accent elements, icons, dividers, CTA buttons
   - Tailwind class: `bg-fdh-orange`, `text-fdh-orange`, `text-fdhOrange`
   - Usage: Icons, highlights, call-to-action elements, borders

4. **FDH Navy Blue** - `#012d81`
   - Used for: Deeper accent, icons
   - Tailwind class: `text-fdhNavyBlue`
   - Usage: Icons and specific UI elements

5. **Brand Color (Alternative)** - `#FD4F00`
   - Defined in Tailwind config but less commonly used
   - Tailwind class: `brand`

## Color Usage Patterns

### Sidebar
- Background: FDH Blue (`#154E9E`)
- Icons: FDH Orange (`#f59e0b`)
- Active state: FDH Light Blue (`#1e62c7`)
- Dividers: FDH Orange (`#f59e0b`)
- Text: White

### Buttons
- Primary: FDH Blue (`#154E9E`) with hover to darker blue (`#012d81`)
- Secondary/CTA: FDH Orange (`#f59e0b`) with hover to darker orange

### Forms & Inputs
- Focus rings: FDH Blue (`#154E9E`)
- Checkboxes: FDH Blue border and fill
- Radio buttons: FDH Blue

### Text
- Headings: FDH Blue (`#154E9E`)
- Icons: FDH Orange (`#f59e0b`)
- Body: Default gray/white depending on background

## Typography
- Font family: 'Poppins', sans-serif

## Component Styling

### Cards
- Box shadow: `0 2px 4px rgba(0, 0, 0, 0.1)`

### Sidebar Items
- Hover: `rgba(255, 255, 255, 0.2)` background
- Transform on hover: `translateX(5px)`

### Scrollbars (Sidebar)
- Track: `rgba(255, 255, 255, 0.1)`
- Thumb: `rgba(255, 255, 255, 0.3)`
- Thumb hover: `rgba(255, 255, 255, 0.5)`

## Recommended Migration to Next.js

To maintain brand consistency, update the Next.js admin panel with these colors:

```css
:root {
  --fdh-blue: #154E9E;
  --fdh-light-blue: #1e62c7;
  --fdh-orange: #f59e0b;
  --fdh-navy-blue: #012d81;
  --brand: #FD4F00;
}
```

### Tailwind Config Addition
```javascript
theme: {
  extend: {
    colors: {
      brand: "#FD4F00",
      fdhOrange: "#f59e0b",
      fdhBlue: "#154E9E",
      fdhLightBlue: "#1e62c7",
      fdhNavyBlue: "#012d81",
    }
  }
}
```
