---
name: Indigo Nexus
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#918fa0'
  outline-variant: '#464554'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1f00a4'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#5148d7'
  secondary: '#6bd8cb'
  on-secondary: '#003732'
  secondary-container: '#29a195'
  on-secondary-container: '#00302b'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#a60031'
  on-tertiary-container: '#ffb0b5'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

# Indigo Nexus Design System

## Brand & Style
Indigo Nexus is a professional, modern, and reliable design system designed for high-performance SaaS applications. The brand personality is grounded in trust and precision, shifting away from aggressive warmth toward a balanced, tech-forward aesthetic. It evokes an emotional response of clarity and efficiency through a "Corporate Modern" style that borrows the best practices of clean digital interfaces. The visual language emphasizes clarity, using a refined color palette and approachable geometry to guide users through complex workflows with ease.

## Colors
The color palette is built around a deep Indigo primary (#4338CA) that signals stability and intelligence. This is complemented by a Teal secondary (#0D9488) for success states and secondary actions, and a Rose tertiary (#F43F5E) to draw attention to critical highlights or specialized data points. The neutral palette uses Slate (#64748B) to provide a cool, professional backdrop that maintains high legibility. The system operates in a Dark color mode, utilizing deep, sophisticated surfaces with subtle tinted neutrals to define hierarchy and reduce eye strain in professional environments.

## Typography
The system utilizes Inter across all levels to ensure maximum readability on digital screens. Headlines are bold and assertive, providing a clear map of the page content. Body text is optimized for long-form reading with generous line heights. Labels and small utility text use a medium weight to maintain visibility even at smaller scales. The typographic rhythm is designed to be functional and neutral, allowing the content to take center stage.

## Layout & Spacing
The layout philosophy follows a strict 8px grid system, ensuring a consistent vertical and horizontal rhythm. All margins and paddings are derived from the base 8px unit (Spacing 2). The system uses a fluid grid approach for main content areas, allowing the UI to adapt seamlessly to different viewport sizes while maintaining standard gutters of 16px and outer margins of 24px for balanced whitespace.

## Elevation & Depth
In this dark mode environment, visual hierarchy is conveyed through tonal layers and subtle luminosity. Rather than relying on heavy shadows, the system utilizes surface-container tiers—where higher elevation elements use slightly lighter slate-tinted backgrounds—to separate different functional areas. When shadows are used, they are extra-diffused and low-opacity, serving more as a soft glow or a subtle dark-on-dark offset to create a sense of natural depth that feels light and modern.

## Shapes
The design system moves away from sharp edges to a friendly and professional Rounded aesthetic. Standard UI components like buttons and input fields feature a 0.5rem (8px) corner radius. Larger containers, such as cards, utilize a 1rem (16px) radius, while extra-large components like modals or hero sections use a 1.5rem (24px) radius. This consistent rounding creates a cohesive, modern look that feels accessible and polished.

## Components
Components are designed with clarity and consistency at their core. 
- **Buttons:** Feature 8px rounded corners, utilizing the Indigo primary for main actions and the Teal secondary for supporting actions.
- **Input Fields:** Use a dark, Slate-tinted background with a subtle border and a clear focus state in Indigo.
- **Cards:** Defined by soft 16px corners and tonal surface variations to lift them from the primary background.
- **Chips & Labels:** Use the tertiary Rose or secondary Teal colors with low-opacity backgrounds for status indicators, ensuring they pop against the dark UI.
- **Checkboxes & Radios:** Adopt the 8px rounding logic for a unified geometric language across the entire interface.