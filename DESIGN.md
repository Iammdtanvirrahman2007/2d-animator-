---
name: CelFrame Studio
description: A working animator's registration desk for frame-by-frame drawing.
colors:
  shell: "#202a2b"
  rail: "#263232"
  panel: "#293535"
  panel-raised: "#303d3c"
  panel-hover: "#354442"
  line: "#3b4947"
  line-quiet: "#34413f"
  text: "#edf0e9"
  text-secondary: "#aab6ae"
  text-dim: "#84928a"
  accent: "#f07858"
  accent-strong: "#ff8a68"
  accent-wash: "rgba(240, 120, 88, 0.14)"
  teal: "#81b9b2"
  paper: "#faf9f4"
  ink: "#263b3b"
  export-ink: "#241f1c"
typography:
  display:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.055em"
  title:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 400
  micro:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 400
  small:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  compact:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  symbol:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
  large-symbol:
    fontFamily: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 400
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "8px"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  xs: "3px"
  hairline: "2px"
  sm: "4px"
  md: "5px"
  tool: "6px"
  preset: "7px"
  lg: "8px"
  badge: "9px"
  pill: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-export:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.export-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: "35px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "34px"
  button-tool-selected:
    backgroundColor: "{colors.accent-wash}"
    textColor: "#ffe7d9"
    rounded: "{rounded.lg}"
    padding: "6px 2px"
  input-project:
    backgroundColor: "transparent"
    textColor: "#e5ebe3"
    rounded: "{rounded.md}"
    padding: "7px 9px"
---

# Design System: CelFrame Studio

## Overview

**Creative North Star: "The Animator's Registration Desk"**

CelFrame feels like a practical animation bench: measured, tactile, and calm enough to keep attention on the drawing. The interface is compact working equipment, not a gallery or a marketing page. Ink-slate controls frame a warm paper stage; registration marks and exposure-sheet cues make the hand-drawn workflow legible.

The drawing surface has visual priority. Tools, brush settings, layers, and timeline remain close to the canvas, with clear separation provided by tonal changes and fine rules. This is a focused editor direction, not a claim that every professional animation workflow is already supported.

**Key Characteristics:**
- Warm paper against ink-slate work rails.
- Vermilion marks the main action and selected frame; muted teal signals drawing and registration details.
- Dense, compact controls use restrained sans-serif type and small monospace measurements.
- Soft stage depth distinguishes the artwork from the flatter surrounding chrome.

## Colors

The palette is a low-glare slate workbench, punctuated by a warm vermilion action color and a quiet teal registration color.

### Primary
- **Registration Vermilion** (`#f07858`): Main export action, selected tool and frame accents, and small emphasis marks. Keep it selective so active work reads immediately.
- **Soft Vermilion** (`#ff8a68`): Brighter active and hover accent.

### Secondary
- **Registration Teal** (`#81b9b2`): Drawing cues, registration marks, and restrained secondary emphasis.

### Neutral
- **Ink Slate** (`#202a2b`): Main application shell.
- **Rail Slate** (`#263232`): Tool rail and inset chrome.
- **Panel Slate** (`#293535`): Inspector surface.
- **Raised Slate** (`#303d3c`): Raised controls and small surfaces.
- **Hover Slate** (`#354442`): Hovered neutral controls.
- **Quiet Rule** (`#3b4947`): Major dividers and panel edges.
- **Subtle Rule** (`#34413f`): Low-emphasis separators.
- **Studio White** (`#edf0e9`): Primary interface text.
- **Secondary Sage** (`#aab6ae`): Supporting text and quiet controls.
- **Dim Sage** (`#84928a`): De-emphasized labels.
- **Warm Paper** (`#faf9f4`): Drawing stage and light-table surface.
- **Drawing Ink** (`#263b3b`): Default artwork color on paper.

**The One-Accent Rule.** Reserve vermilion for selection and primary action; do not spread it across neutral chrome.

## Typography

**Display Font:** "Avenir Next", Avenir, "Segoe UI", ui-sans-serif, system-ui, sans-serif  
**Body Font:** "Avenir Next", Avenir, "Segoe UI", ui-sans-serif, system-ui, sans-serif  
**Label/Mono Font:** ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace

**Character:** The sans-serif is compact and legible at working-interface sizes. Monospace is for measurements, frame labels, and compact technical metadata, not general prose.

### Hierarchy
- **Display** (800, 15px, 1.15): Product wordmark.
- **Title** (700, 10–11px): Inspector section names, timeline heading, and compact controls.
- **Body** (400–600, 9–13px): Settings, tool names, and supporting interface copy.
- **Label** (400, 7–10px, tracked): Frame counts, project metadata, measurements, and uppercase rail labels.
- **Symbols** (400, 16–21px): Compact line icons and stage registration details.

**The Measurement Rule.** Use monospace where users compare values or scan frame/project metadata; keep explanatory copy in the sans-serif.

## Layout

The desktop editor is a full-height working surface: a 64px project bar above a 70px tool rail, flexible stage, and 291px inspector; a 180px timeline spans the width beneath the work area. At narrower desktop widths the side rails contract while the stage keeps a usable minimum width. At 720px and below, tools become a horizontal strip, the drawing stage remains first, and timeline/transport moves directly after the stage so playback and frame navigation do not sit below the settings inspector. The inspector then follows the timeline in normal page flow.

Use a compact 4/8px control rhythm, 16px section padding, and larger 24px separations for distinct regions. Let the canvas occupy the largest flexible area. Keep the timeline horizontal and scroll its frames rather than squeezing thumbnails.

## Elevation & Depth

The chrome relies on tonal layering and thin borders rather than floating cards. The paper stage is the exception: a crisp edge and soft, offset shadows lift it from the dotted slate viewport. Use elevation to separate the artwork plane, not as decoration on every control.

**The Paper-Plane Rule.** Keep depth on the drawing surface; use color and dividers to organize the surrounding editor.

## Shapes

Most controls use restrained 4–5px corners; buttons and tool targets stay compact and rectangular. A few larger 6–8px shapes identify the tool selection and brand mark. The circular play control and tiny round state indicators are purposeful exceptions. Borders are thin and tonal; avoid pill-shaped general controls.

## Components

### Buttons
- **Shape:** Compact, predominantly 4–5px corners.
- **Primary:** Export is a vermilion-filled, dark-text action with 13px horizontal padding and a 35px height.
- **Secondary / Ghost:** Quiet project and timeline actions sit on transparent backgrounds until hover, when they gain a slate surface and subtle border.
- **Tool state:** Selected tools use a light vermilion wash and brighter icon/text, not a full bright fill.
- **Focus:** Keep the visible 2px vermilion focus outline with a 2px offset.

### Inputs / Fields
- **Style:** Project name and brush controls sit directly in the inspector or project bar; use restrained borders and slate surfaces rather than card-like field containers.
- **Focus:** A visible vermilion outline; project title also gains a quiet slate fill and border on hover/focus.

### Navigation
- **Desktop:** The top project bar carries project identity and file actions; the vertical tool rail groups drawing operations; the inspector stays beside the stage.
- **Mobile:** Keep tool access in the first horizontal strip and put the timeline directly below the drawing stage. Preserve accessible names when compact actions become icon-only.
- **Active state:** Use vermilion for the chosen tool/frame and teal for restrained drawing/registration cues.

### Drawing Stage
Use a warm off-white paper plane against a muted dotted slate viewport. Registration marks sit just inside the stage corners. Keep drawing interaction on the paper and reserve its soft shadow for separating this central work surface.

### Exposure Timeline
Treat frames as a horizontally navigable exposure sheet with readable frame numbers, small artwork thumbnails, a clear selected frame/playhead, and transport controls near the frame strip.

## Do's and Don'ts

### Do:
- **Do** keep the paper stage the primary visual anchor.
- **Do** use the existing slate, paper, vermilion, and teal palette values.
- **Do** use monospace for values and compact frame/project metadata.
- **Do** keep playback and the timeline close to the drawing surface at every viewport size.
- **Do** label icon-only actions for assistive technology and provide visible keyboard focus.

### Don't:
- **Don't** use vermilion as a general-purpose panel fill.
- **Don't** add gradients, glass effects, or decorative shadows to the flat editor chrome.
- **Don't** let settings displace the drawing stage or hide mobile playback controls below the inspector.
- **Don't** use monospace as a costume for ordinary explanatory text.
