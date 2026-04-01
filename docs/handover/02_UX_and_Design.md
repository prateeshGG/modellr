# 02: UX & Design Strategy

This document defines the "Soul" of SchemaForge—its aesthetic principles, interaction models, and the premium design system that differentiates it.

---

## 1. Design Philosophy: "Canvas Supremacy"
The canvas is the core of the experience. All editing tools—panels, sidebars, command palettes—should **float** over the canvas rather than resizing it. This creates an immersive environment for architectural thinking.

## 2. Aesthetics: "Premium / Sleek / Functional"
- **Background**: Dot grid at ~24px spacing, 8% opacity. Low visual noise, high orientation support.
- **Layers**: 
    - **Surface Low**: Table nodes, sidebar.
    - **Surface Base**: Panels, command palette.
- **Visual Elements**:
    - **Icons**: Professional SVG icons via `lucide-react`. Avoid casual emojis in the interface.
    - **Aesthetic Mark**: Glassmorphism (blur + semi-transparent overlays) in modals and AI drawers.
- **Micro-Interactions**:
    - **Hover states**: Subtle border-glows and font-weight shifts.
    - **Transitions**: 260ms spring easing for panels, 400ms for layout shifts.
    - **Ghosting**: During drag-and-drop, a faint "ghost" node stays at the origin to mark initial state.

## 3. Typography: "Geist & Mono"
- **UI Labels**: **Geist Sans**. Professional, high-readability, modern.
- **Data Tokens**: **Geist Mono**. Reserved for table types, code snippets, and SQL tokens.
- **Semantic Rule**: Geist is for the interface; Geist Mono is for the data.

## 4. Visual Components
### Table Nodes
- **Accents**: 4px colored bar on the far left edge of each table.
- **Badges**: 
    - **PK**: Golden-amber. 
    - **FK**: Subtle blue.
- **Interactions**: Double-clicking a field row expands it inline—avoiding sidebar context-switching for quick edits.

## 5. The "Founder Edition" Obsidian Theme
A premium, high-contrast dark theme designed for "Pro/Lifetime" users.
- **Base Color**: Deep obsidian (#0D0D0B).
- **Accents**: Ultraviolet violet and glassmorphic blurs.
- **Feedback**: Exclusive "Shimmer" effects on AI-generated fields.

## 6. Interaction Model: "Cmd+K / Shortcut-First"
- **Command Palette**: The primary navigation tool. Full focus trap, aria-modal="true".
- **Density Toggles**: Status bar provides immediate switching between "Comfortable" (32px rows) and "Compact" (28px rows).
- **Keyboard-First**: 100% of the canvas should be navigable by keyboard (Tab for nodes, Arrows for positioning).
- **Fullscreen Mode**: High-immersion toggle in the sandbox editor to maximize architectural focus.

## 7. Global Dialog System
SchemaForge explicitly avoids blocking native browser components. 
- **DialogModal**: A custom, async-ready modal component replaces `window.alert` and `window.confirm`. 
- **Toast Notifications**: Used for non-critical feedback (e.g. "Schema Saved", "Login Required").
- **Implementation**: Managed via `uiStore.ts` to ensure consistency across the dashboard and marketing pages.

## 8. AI Experience (The "Aesthetic Mark")
- **AI Icon**: ✦ (Violet).
- **Ghost Generation**: Tables materialize on the canvas as faint outlines before the AI populates fields. This reduces perceived latency and looks magical.
- **Why? Chips**: Every AI suggestion has a "Why?" popover to explain normalized choices.
