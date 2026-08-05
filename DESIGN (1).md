---
name: Ujiankuuu
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#4d556b'
  on-tertiary: '#ffffff'
  tertiary-container: '#656d84'
  on-tertiary-container: '#eef0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system for this platform is rooted in **Modern Minimalism** with a focus on academic integrity and administrative efficiency. It targets students and educators at SMK Jakarta Pusat 1, demanding a UI that feels both professional and approachable. 

The aesthetic draws inspiration from high-end SaaS dashboards (Stripe, Notion) to move away from legacy "educational software" clutters. It prioritizes clarity, utilizing generous whitespace and a disciplined color application to reduce cognitive load during high-stakes examinations. The emotional response should be one of calm, focus, and reliability.

## Colors

The palette is anchored by a deep **Primary Blue (#2563EB)**, signifying trust and authority. 
- **Neutrals**: Utilize a sophisticated range of Slate and Gray scales. Use `#F8FAFC` for page backgrounds and `#FFFFFF` for content cards to create subtle, tiered depth.
- **Semantic Colors**: Use Green for successful exam submissions, Orange for time warnings, and Red for critical errors or expired sessions. 
- **Contrast**: Maintain a minimum contrast ratio of 4.5:1 for all functional text to ensure accessibility for all students.

## Typography

The design system exclusively uses **Inter** for its exceptional legibility and systematic weight distribution.
- **Headings**: Use `display-lg` for dashboard overviews and `headline-md` for exam section titles.
- **Body**: Standardize on `body-md` for exam questions to ensure maximum readability.
- **Labels**: Use `label-caps` for table headers and metadata descriptors.
- **Scale**: On mobile devices, shift displays down one tier in the scale to preserve horizontal real estate.

## Layout & Spacing

This design system employs a **Fluid Grid** with a maximum container width of 1280px for dashboard views.
- **Sidebar**: A fixed 260px sidebar for navigation, collapsing to a 64px icon-only bar on smaller viewports.
- **Rhythm**: Use a 4px/8px base unit. Component internal padding should be `1rem` (16px), while section spacing should be `2rem` (32px).
- **Exam Layout**: Use a single-column centered layout (max-width: 800px) for exam questions to minimize distractions and peripheral movement.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and soft **Ambient Shadows**:
- **Level 0 (Background)**: `#F8FAFC` - The canvas.
- **Level 1 (Cards/Sidebar)**: White surface with a 1px border of `#E2E8F0` and a subtle shadow (Y: 1px, Blur: 3px, Opacity: 5%).
- **Level 2 (Dropdowns/Modals)**: White surface with a more pronounced shadow (Y: 10px, Blur: 15px, Opacity: 10%) to suggest interaction priority.
Avoid heavy blurs; maintain a "flat but lifted" appearance.

## Shapes

The shape language is **Rounded**, utilizing a base radius of `0.5rem` (8px) for standard components and `0.75rem` to `1rem` (12px-16px) for larger containers like exam cards and dashboard widgets. This softening of the UI helps reduce the "stress" associated with testing environments.
- **Inputs & Buttons**: 8px (rounded).
- **Cards & Modals**: 12px or 16px (rounded-lg/xl).
- **Badges**: Fully pill-shaped for status indicators.

## Components

- **Buttons**: Primary buttons are solid `#2563EB` with white text. Secondary buttons use a light gray ghost style. Buttons should have a minimum height of 44px for touch accessibility.
- **Data Tables**: Use a "Borderless" style with subtle horizontal dividers (`#F1F5F9`). Row hovering should trigger a background shift to `#F8FAFC`.
- **Input Fields**: Use a light gray background (`#F1F5F9`) in the default state, shifting to a white background with a 2px blue border on focus.
- **Progress Bars**: Used for exam completion. Use a 8px height with a rounded track. The filler should be Primary Blue.
- **Sidebar**: High contrast text against a light surface. Active states are indicated by a subtle blue left-edge border and a light blue background tint.
- **Cards**: All content must be housed in cards with `1rem` padding and `12px` rounded corners to maintain the modular SaaS aesthetic.
- **Icons**: Use **Lucide** icons at a 20px size for navigation and 16px for inline text actions.