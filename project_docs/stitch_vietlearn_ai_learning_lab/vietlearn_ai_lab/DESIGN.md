---
name: VietLearn AI Lab
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#464554'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4b41e1'
  on-tertiary: '#ffffff'
  tertiary-container: '#645efb'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#0f0069'
  on-tertiary-fixed-variant: '#3323cc'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Dm Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Dm Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Dm Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Dm Sans
    fontSize: 12px
    fontWeight: '400'
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
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is anchored in the concept of **Intelligent Clarity**. It balances the rigor of academic excellence with the fluid, innovative nature of Artificial Intelligence. The target audience includes students, researchers, and educators who require a distraction-free environment that feels both cutting-edge and dependable.

The visual style follows a **Vibrant Modern** aesthetic with **Glassmorphic** accents. It prioritizes high-quality white space to reduce cognitive load during long study sessions. Elements are structured with precision, using a more energetic color palette and subtle depth to guide the user's focus toward learning content with a sense of modern momentum.

## Colors
The palette is built around "Electric Indigo" and "Vibrant Emerald" to evoke innovation and active growth.

- **Primary (Electric Indigo):** Used for core branding, primary actions, and navigational anchors.
- **Secondary (Vibrant Emerald):** Reserved for success states, progress indicators, and AI-assisted features to signify "active learning" and achievement.
- **Tertiary (Deep Indigo):** Used for interactive highlights and research-specific badges.
- **Neutral:** A range of ultra-clean whites and soft grays to create a luminous, contemporary canvas.
- **AI Accents:** Use the `accent_gradient` specifically for AI-generated suggestions or "Smart Lab" features to distinguish automated insights from static content.

## Typography
The design system utilizes **Space Grotesk** for headlines to provide a distinct, tech-forward geometric character, and **DM Sans** for body and label text to ensure maximum legibility and a friendly, modern feel.

For long-form study material, use `body-lg` with a generous line height (1.6x) to prevent eye fatigue. `display-lg` should be reserved for landing pages or major dashboard milestones. Semantic hierarchy must be strictly followed: titles should always use a heavier weight (`600`+) to provide a clear path for scanning text.

## Layout & Spacing
The layout employs a **12-column fixed grid** for desktop, centered within a maximum container width of 1280px. 

- **Desktop (1024px+):** 12 columns, 24px gutter, 48px margins.
- **Tablet (768px - 1023px):** 8 columns, 16px gutter, 24px margins.
- **Mobile (Below 768px):** 4 columns, 16px gutter, 16px margins.

The spacing rhythm is based on a **4px/8px scale**. Use `lg` and `xl` spacing for vertical section separation to maintain a "breathable," clutter-free environment. Content-heavy pages (like lessons) should use a focused 8-column center-aligned layout to minimize horizontal eye travel.

## Elevation & Depth
Depth is used purposefully to indicate interactivity and information priority. This system avoids heavy drop shadows, opting instead for **tonal layering** and **soft ambient shadows** that feel lighter and more modern.

- **Level 0 (Base):** Neutral off-white background (#FAFAFA).
- **Level 1 (Cards):** 1px border with a subtle 4px blur shadow at 2% opacity.
- **Level 2 (Modals/Popovers):** 12px blur shadow at 8% opacity with a semi-transparent white backdrop (Glassmorphism).
- **AI Elements:** Elements specifically driven by AI (like "Smart Tips") utilize a 2px semi-transparent emerald outline or a very soft secondary-colored glow to signify their "active" status.

## Shapes
The shape language is **Rounded (0.5rem base)**, creating an approachable and modern feel. 

- **Small Components:** Checkboxes and small tags use 4px (`rounded-sm`).
- **Standard Components:** Buttons, Input fields, and List items use 8px (`rounded-md`).
- **Large Components:** Course cards and Study modules use 16px (`rounded-lg`).
- **Pill Shapes:** Used exclusively for status indicators (e.g., "In Progress," "Completed") and search bars.

## Components

### Buttons
- **Primary:** Solid Electric Indigo with white text. High-contrast and clear.
- **Secondary:** White background with Electric Indigo border and text.
- **AI-Action:** Uses the `accent_gradient` with white text and a subtle "sparkle" icon.

### Cards
Cards are the primary container for course modules. They should have a 1px border, 16px padding, and use `rounded-lg`. On hover, they should slightly lift using Level 2 elevation.

### Input Fields
Inputs must be clearly labeled using `label-md`. Use a 1px border that transitions to Electric Indigo on focus. Error states must use a distinct red with an accompanying icon for accessibility.

### Progress Indicators
Progress bars should be thin (8px height) and use the Secondary Emerald color to indicate completion. For AI-calculated "estimated time to master," use a dashed stroke pattern.

### Smart Chips
Used for tags or categories. Chips should have a light background (Primary 5% opacity) and dark text. AI-suggested tags should feature a small emerald dot icon.