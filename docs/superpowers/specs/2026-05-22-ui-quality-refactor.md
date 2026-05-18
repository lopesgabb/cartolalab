# Design Spec: UI Quality & Tailwind Refactor

**Topic:** Codebase Cleanup and Maintenance Debt Reduction
**Date:** 2026-05-22
**Status:** Approved

## Goals
1.  **Eliminate Inline Styles**: Convert React `style={{}}` objects to Tailwind utility classes.
2.  **CSS-First Interactions**: Replace JavaScript `onMouseOver/Out` handlers with Tailwind `hover:` utilities.
3.  **Theme Standardization**: Centralize visual tokens (blur, colors, shadows) in `globals.css`.
4.  **Component Consistency**: Ensure repeating patterns (containers, rows, panels) use shared classes.

## Proposed Changes

### 1. Theme Enhancements (`src/app/globals.css`)
Expand the `@theme` block with semantic tokens and add reusable component classes.

**New Tokens:**
- `--blur-header: 16px`
- `--blur-card: 12px`
- `--glass-bg-header: rgba(10, 15, 26, 0.8)`
- `--border-accent-glow: rgba(0, 255, 136, 0.2)`

**New Component Classes:**
- `.container-max`: `max-w-[1400px] mx-auto px-6`
- `.glass-header`: Sticky, translucent background with backdrop-filter.
- `.interactive-row`: Table row hover effect using `hover:bg-[var(--color-bg-hover)]`.
- `.interactive-card`: Card lift and shadow effect on hover.

### 2. Component Refactoring

#### `src/components/RankingCard.tsx`
- Replace inline table styles with Tailwind utilities.
- Remove `onMouseOver`/`onMouseOut` from `tr`.
- Apply `.interactive-row` or equivalent Tailwind classes.

#### `src/components/EmAlta.tsx`
- Refactor the grid layout to use Tailwind grid utilities.
- Remove manual transform/shadow management in JS.
- Use Tailwind's `hover:-translate-y-0.5` and `hover:shadow-[var(--shadow-premium)]`.

#### `src/components/Header.tsx`
- Utilize `.glass-header` and `.container-max`.
- Refactor navigation links to use Tailwind for conditional active/hover states.

#### `src/app/page.tsx`
- Wrap the main content in `.container-max`.
- Refactor the Market Status banner and section headers to use centralized tokens.

## Verification Plan
1.  **Visual Regression**: Manually verify that the UI looks identical or improved after refactoring.
2.  **Lint Check**: Ensure no remaining large inline style objects (except for truly dynamic values).
3.  **Responsiveness**: Verify that Tailwind grid utilities handle breakpoints correctly.
