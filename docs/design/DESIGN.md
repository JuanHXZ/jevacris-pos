---
name: JEVACRIS Narrative System
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e3'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f1fd'
  surface-container: '#f2ecf7'
  surface-container-high: '#ece6f1'
  surface-container-highest: '#e6e0eb'
  on-surface: '#1d1a22'
  on-surface-variant: '#4d444e'
  inverse-surface: '#322f37'
  inverse-on-surface: '#f5eefa'
  outline: '#7e747f'
  outline-variant: '#cfc3cf'
  surface-tint: '#7a4c8c'
  primary: '#010001'
  on-primary: '#ffffff'
  primary-container: '#310344'
  on-primary-container: '#a371b5'
  inverse-primary: '#eab3fc'
  secondary: '#6d5773'
  on-secondary: '#ffffff'
  secondary-container: '#f3d6f9'
  on-secondary-container: '#725b78'
  tertiary: '#000002'
  on-tertiary: '#ffffff'
  tertiary-container: '#21172e'
  on-tertiary-container: '#8d7e9a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#eab3fc'
  on-primary-fixed: '#310344'
  on-primary-fixed-variant: '#613473'
  secondary-fixed: '#f6d9fb'
  secondary-fixed-dim: '#d9bddf'
  on-secondary-fixed: '#27142d'
  on-secondary-fixed-variant: '#543f5b'
  tertiary-fixed: '#eedcfc'
  tertiary-fixed-dim: '#d1c0df'
  on-tertiary-fixed: '#21172d'
  on-tertiary-fixed-variant: '#4e425b'
  background: '#fdf7ff'
  on-background: '#1d1a22'
  surface-variant: '#e6e0eb'
typography:
  display-xl:
    fontFamily: Hanken Grotesk
    fontSize: 4.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 3rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
  tabular-price:
    fontFamily: Hanken Grotesk
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: '1'
  tabular-data:
    fontFamily: Hanken Grotesk
    fontSize: 0.9375rem
    fontWeight: '500'
    lineHeight: '1'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  safe-margin: 48px
  gutter-asymmetric: 32px
  overlap-offset: -24px
---

## Brand & Style
The design system for JEVACRIS rejects the sterile, industrial aesthetic common in inventory management. Instead, it adopts an **Editorial Boutique** style that treats household cleaning products as high-end goods. 

The personality is sophisticated yet approachable, evoking a sense of calm and organized luxury. The visual strategy relies on **Organic Minimalism**—balancing dense information clusters with significant negative space. By utilizing asymmetric layouts and soft, overlapping shapes, the UI moves away from "software" and toward "experience." 

Key characteristics include:
- **Asymmetric Balance:** Intentional weight shifts to guide the eye toward primary actions.
- **Organic Geometry:** Fluid shapes (blobs) that break the monotony of the grid.
- **Tactile Softness:** Elements appear physically soft, inviting interaction through large, rounded targets.

## Colors
The palette is a monochromatic exploration of orchids and wisteria, providing a deep, luxurious atmosphere while maintaining high legibility.

- **Primary (Midnight Orchid):** Reserved for high-priority information, headers, and primary call-to-action buttons. It provides the "anchor" for the brand.
- **Secondary (Dusky Lilac):** Used for supporting UI elements and sub-headers.
- **Accent/Interactive (Iris Mist):** Specifically for hover states, active indicators, and organic background decorations.
- **Surface (Plum Blossom):** The primary color for cards and elevated components to distinguish them from the base.
- **Base (Silver Wisteria):** The canvas color for all screen backgrounds.

## Typography
The typography uses **Hanken Grotesk** for its contemporary, sharp terminals that remain legible even at small scales.

The system relies on extreme scale contrast:
1. **Expressive Headers:** Use `display-xl` for total amounts and "Change" calculations. 
2. **Tabular Numerals:** All financial figures and stock quantities must use `font-variant-numeric: tabular-nums`. This ensures vertical alignment in tables and lists, preventing visual "shimmer" when values update.
3. **Discreet Labels:** Use `label-caps` for metadata to keep it secondary to the core inventory data.

## Layout & Spacing
This system utilizes an **Asymmetric Grid** to create an editorial feel. Avoid perfectly centered layouts.

- **The 60/40 Split:** Often split the screen into a primary functional area (60% width) and a secondary data/summary area (40% width).
- **Overlapping Elements:** Certain organic background shapes (Iris Mist) should bleed behind cards, and specific UI elements can use a negative margin (`overlap-offset`) to sit slightly over neighboring containers.
- **Whitespace:** Use generous `safe-margin` values. Content should breathe; the high-end boutique feel is lost if the UI feels crowded.
- **Responsiveness:** On mobile, the asymmetry collapses into a single column, but maintains large padding and organic shapes to preserve the brand personality.

## Elevation & Depth
Depth is achieved through **Tonal Layering** combined with **Ambient Shadows**.

- **Surface Levels:** The base is Silver Wisteria. Cards and containers sit on top using Plum Blossom.
- **Shadow Profile:** Shadows should be highly diffused and soft. Use a shadow color tinted with Midnight Orchid at a very low opacity (e.g., `rgba(49, 3, 68, 0.08)`) rather than pure black.
- **Blur Radius:** Large blur radii (24px to 48px) create a "floating" effect without harsh edges.
- **Iris Mist Blobs:** Use these as deep background layers (level 0) behind Plum Blossom cards (level 1) to create three-dimensional interest without using traditional drop-shadows everywhere.

## Shapes
The shape language is defined by extreme softness and organic forms.

- **Primary Roundedness:** Use `rounded-xl` (1.5rem) as the standard for all cards and interactive buttons.
- **Blob Shapes:** Use `border-radius` values like `60% 40% 30% 70% / 60% 30% 70% 40%` for decorative background elements to create the "Iris Mist" and "Plum Blossom" blobs.
- **Pill Shapes:** Small chips (Payment/Stock) should always be fully rounded (pill-shaped).

## Components

### Large Tactile Product Buttons
These are the primary interaction points. They should be large containers in **Plum Blossom**, featuring the product name in `headline-md` and the price in `tabular-data`. On hover, the border should transition to **Iris Mist**.

### Sales Summary & Change Calculator
The most prominent element on the sales screen. 
- **Sales Total:** Rendered in `display-xl` using Midnight Orchid.
- **Change Calculator:** A two-part component. "Received" is an input field; "Change" is a large display area. Use Iris Mist background for the change display when the amount is positive.

### Payment Chips (Efectivo/Nequi)
Pill-shaped buttons. Use **Dusky Lilac** for the inactive state and **Midnight Orchid** for the active state. Icons should be minimal and white when active.

### Stock Indicators
Low-stock indicators should not be red (to stay within the palette). Instead, use a subtle **Dusky Lilac** dot with a "pulsing" soft shadow effect or a small Iris Mist label with `label-caps` typography.

### Data Tables
Tables should have no vertical borders. Use `Silver Wisteria` horizontal dividers. Headers must use `label-caps`. Rows should have a subtle hover state that changes the background to a slightly lighter tint of Iris Mist. All numeric columns must be right-aligned.

### Input Fields
Inputs use a "bottom-border only" or a very soft `rounded-lg` Plum Blossom background. The focus state is a thicker **Iris Mist** bottom border.