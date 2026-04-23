---
name: Velocity Kinetic
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#7b0022'
  on-tertiary: '#ffffff'
  tertiary-container: '#a60031'
  on-tertiary-container: '#ffb0b5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
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
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
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
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-value:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 24px
---

## Brand & Style

This design system is built for the high-energy, data-driven world of competitive sports. The brand personality is **Athletic, Precise, and Empowering**, aimed at coaches and team managers who need to synthesize complex performance metrics at a glance.

The visual style follows a **Corporate Modern** approach with **Glassmorphism** accents. It leverages high-density data visualization balanced by generous white space and soft depth. The interface utilizes translucent layers for secondary information and solid, vibrant containers for primary calls to action, creating a clear "field of play" for team data. The goal is to evoke a sense of professional mastery and forward momentum.

## Colors

This design system utilizes a high-contrast palette to differentiate between action states and data categories. 
- **Deep Indigo (Primary):** Used for navigation, primary branding, and core interactive elements.
- **Teal/Cyan (Secondary):** Represents positive growth, success metrics (wins), and secondary data points.
- **Coral/Red (Accent):** Reserved for alerts, losses, and critical performance "pain points" that require immediate attention.
- **Surface Strategy:** In light mode, surfaces use subtle cool grays to reduce eye strain. In dark mode, surfaces utilize deep navy tones with indigo tints to maintain brand consistency without losing legibility.

## Typography

The typography system relies on **Inter** for its exceptional legibility in data-heavy environments. The hierarchy is strictly enforced through weight and letter spacing rather than just size. 

- **Headlines:** Use tight letter-spacing and bold weights to feel impactful and "headline-ready."
- **Stats:** A dedicated "stat-value" tier ensures that numbers are the hero of the dashboard.
- **Labels:** Small caps or bold uppercase are used for category headers (e.g., "ANA MENÜ") to distinguish them from interactive content.

## Layout & Spacing

This design system employs a **12-column fluid grid** for the main dashboard content, ensuring responsiveness across desktop and tablet views. 

The vertical rhythm is based on a **4px baseline grid**. 
- **Sidebars:** Fixed at 280px to provide a stable anchor for navigation.
- **Cards:** Utilize `lg` (24px) padding to ensure data-heavy charts don't feel cluttered.
- **Gaps:** Standardize 20px gaps between grid items to create clear visual separation without wasting excessive screen real estate.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 
- **Base Layer:** The background is the lowest point, using the neutral background hex.
- **Content Cards:** Raised slightly with a very soft, diffused shadow (Blur: 15px, Opacity: 4%, Color: Primary Tint). 
- **Interactive Hover:** Elements increase in shadow spread and opacity when hovered, providing tactile feedback.
- **Overlays:** Modals and dropdowns use a "Glassmorphism" effect (Backdrop Blur: 10px) with a 1px border stroke to maintain edge definition against complex backgrounds.

## Shapes

The shape language is consistently **Rounded**, reflecting the approachable and modern nature of the platform.
- **Standard Cards:** Use 1rem (16px) corner radius for a friendly, modular look.
- **Buttons & Inputs:** Use 0.5rem (8px) to maintain a professional, structured feel.
- **Tags & Badges:** Use a pill-shaped (full-round) radius to distinguish them from actionable buttons.
- **Progress Bars:** Fully rounded ends to mimic the motion of a tracking disc or ball.

## Components

- **Buttons:** Primary buttons use a solid Indigo gradient. Secondary buttons use a Teal "ghost" style with a 1.5px border. High-energy actions (like "Delete" or "Loss") use Coral.
- **Metric Cards:** Large stat values are top-aligned, with a sparkline or trend indicator (Teal for up, Coral for down) placed at the bottom right.
- **Navigation Items:** Active states use a soft Indigo background tint with a 4px vertical "pill" indicator on the left edge.
- **List Items:** Match rows use a subtle vertical border on the left (Teal for Win, Coral for Loss) to provide instant color-coded context before the user reads the text.
- **Data Tables:** Row hover states use a 50% opacity primary tint. Column headers use the "Label-Bold" typography style for clarity.
- **Input Fields:** Use a subtle inset shadow and 1px neutral border. Focus states trigger a 2px Indigo glow.