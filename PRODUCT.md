# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Independent and professional 2D animators working solo, creating hand-drawn animation in a browser.

## Product Purpose

Create a focused 2D animation studio that makes frame-by-frame drawing and playback approachable without sacrificing the tools solo animators need. Success means an animator can draw, organize, review, save, and render a short animation in one dependable workflow.

## Positioning

The product is intended to pair a direct drawing surface and customizable brushes with a practical frame timeline, discoverable shortcuts, and essential assistance in one approachable browser-based workspace. This is a product direction, not a claim that those capabilities are already implemented.

## Operating Context

The primary workflow is hand-drawn, frame-by-frame raster animation by a solo creator. The user should be able to concentrate on artwork while moving quickly between frames, playback, and output.

## Capabilities and Constraints

- Confirmed product focus: frame-by-frame raster animation, custom brushes, useful intelligent assistance, keyboard shortcuts, ease of use, and rendering/export.
- The first browser implementation uses React, TypeScript, Vite, and Canvas 2D. It stores editable projects and brush presets in browser local storage and supports CelFrame JSON, GIF, and zipped PNG-sequence export.
- Projects store stroke/cel data rather than flattened images. Export and project-size limits are implementation safeguards, not production performance guarantees.
- Stylus pressure is best-effort where exposed by the browser. Supported browsers, touch/stylus device coverage, storage recovery expectations, accessibility conformance, and performance targets still need broader validation.
- Vector animation, rigging, compositing, audio, collaboration, and cloud services are future scope, not assumed launch requirements.
- Rendering must report support and failures honestly; output compatibility must not be implied before implementation and verification.

## Evidence on Hand

No existing product implementation, customer evidence, format-compatibility evidence, or brand assets were present in the repository.

## Product Principles

- Keep drawing and frame-by-frame iteration at the center of the experience.
- Make frequent actions discoverable and efficient through keyboard shortcuts.
- Protect creative work with undo/redo, reliable save/recovery, and clear export status.
- Keep assistance optional, previewable, and reversible.
- Prefer a coherent and dependable core workflow over a broad but shallow list of features.

## Accessibility & Inclusion

Keyboard access and clear interaction feedback are product requirements. Stylus pressure and touch support are open technical decisions; do not promise either until verified in supported browsers.
