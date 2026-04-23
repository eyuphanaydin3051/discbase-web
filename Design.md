---
name: Discbase Core
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#d4c0d7'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#9d8ba0'
  outline-variant: '#504254'
  surface-tint: '#ebb2ff'
  primary: '#ebb2ff'
  on-primary: '#520072'
  primary-container: '#bc13fe'
  on-primary-container: '#ffffff'
  inverse-primary: '#9800d0'
  secondary: '#dcfdff'
  on-secondary: '#00373a'
  secondary-container: '#00f1fd'
  on-secondary-container: '#006a6f'
  tertiary: '#bec2ff'
  on-tertiary: '#202676'
  tertiary-container: '#696fc1'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#ebb2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#74009f'
  secondary-fixed: '#6ff6ff'
  secondary-fixed-dim: '#00dce6'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bec2ff'
  on-tertiary-fixed: '#060a62'
  on-tertiary-fixed-variant: '#383e8d'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 40px
  container-max: 1440px
---

## Brand & Style

The brand identity for Discbase is rooted in the "Digital Frontier"—a high-tech, futuristic aesthetic that bridges the gap between hardware architecture and software fluidity. It is designed for a tech-savvy audience that values speed, precision, and innovation. 

Transitioning to a **Dark-Mode "Command Center"** interface, the visual style reflects a "Deep-Space Research" environment. It utilizes a sophisticated blend of **Dark Glassmorphism** and high-energy neon accents. The interface feels like a premium, tactical head-up display (HUD)—stealthy, professional, and ultra-precise. The goal is to evoke an emotional response of total control and technological mastery, making the user feel like they are operating a cutting-edge mainframe from the heart of a secure data vault.

## Colors

The palette is optimized for dark-mode, utilizing high-energy neon accents that pierce through a deep, multi-layered obsidian foundation.

- **Primary (Neon Purple):** Used for primary actions, critical branding, and focal points. It provides a sharp, vibrant glow against dark surfaces.
- **Secondary (Cyan):** Used for data visualization, "active" states, and highlights. It offers a refreshing, high-tech contrast that remains piercingly legible in low-light contexts.
- **Tertiary (Electric Cobalt):** In this dark-mode context, Cobalt serves as a deep structural shadow and a low-energy accent for secondary UI elements, providing depth without breaking the dark aesthetic.
- **Surface & Neutrals:** Deep slates and charcoals (Neutral) are used for container differentiation, maintaining a clean, technical hardware aesthetic that reduces eye strain.

Gradients are essential; use a linear transition from Neon Purple to Cyan for "active" or "processing" states to mimic the brand's digital energy flowing through the system.

## Typography

The typography system is unified under a single, high-performance typeface to maximize technical clarity and functional minimalism.

**Inter** is utilized across all levels—headlines, body, and labels. This creates a cohesive, streamlined appearance that feels like a modern software interface. Headlines utilize the bolder weights of Inter to provide hierarchy through scale and weight rather than stylistic contrast, ensuring the UI feels integrated and precise.

For functional elements, label styles frequently use uppercase with increased letter-spacing to reinforce the "instrument panel" look, ensuring that even complex data remains highly legible and scannable against dark, high-contrast backgrounds.

## Layout & Spacing

This design system employs a **Fixed Grid** model within a fluid container. A 12-column grid is used for desktop layouts, with generous gutters to allow the dark glassmorphic backgrounds to breathe. 

The spacing rhythm is strictly based on a **4px baseline grid**. Components should be aligned to this grid to maintain a "mathematically perfect" technical appearance. In layouts, utilize asymmetrical spacing where one side of the screen holds a dense "data module" while the other provides "negative space" to keep the UI from feeling cluttered.

## Elevation & Depth

Depth is achieved through **Dark Glassmorphism** and **Inner Radiance** to create a sense of layered translucency within the tactical environment.

1.  **Backdrop Blur:** All container surfaces must use a `backdrop-filter: blur(12px)` combined with a semi-transparent dark fill (approx 20-40% black or deep slate opacity).
2.  **Inner Glow:** Use a 1px inner border (stroke) with low opacity primary or secondary color to define the edges of "glass" cards. This creates a "powered-on" effect where edges appear to catch the light of the UI.
3.  **Tonal Layers:** Use increasingly lighter shades of dark slate to suggest that "glass" panes are closer to the user. Avoid heavy drop shadows; instead, use subtle, colored outer glows (tinted with Purple or Cobalt) for high-priority elements.

## Shapes

The shape language is **Technical & Sharp**. While glassmorphism often trends towards very rounded corners, this design system uses a restricted radius (4px to 8px) to maintain an industrial, "circuit-board" feel. 

Avoid circles for everything except the brand logo or specific user avatars. Buttons and cards should feel like precisely cut pieces of synthetic acrylic. Decorative "notches" (45-degree clipped corners) are encouraged for large section headers or primary call-to-action containers to reinforce the futuristic theme.

## Components

- **Buttons:** Primary buttons use a solid Neon Purple or a Purple-to-Cyan gradient. Text must be high-contrast white.
- **Glass Cards:** The standard container. Must have a subtle 1px border and a backdrop blur. For high-priority cards, add a "corner highlight"—a small 2px thick line segments on just two corners in the secondary color.
- **Inputs:** Clean, dark-tinted backgrounds with a bottom-only border that turns Cyan when focused. Use monospaced fonts for numerical input to enhance the "terminal" feel.
- **Chips/Tags:** Small, sharp-edged pills with low-opacity Cyan or Purple fills and vibrant, high-contrast text.
- **Circuit Lines:** Non-interactive decorative elements—thin 1px lines in Slate or low-opacity Cobalt that connect components, mimicking the traces on a PCB.
- **Data Readouts:** Use the label-sm typography for small, "system-status" style text modules that appear near the edges of cards.