# CelFrame Studio roadmap

## Product direction

CelFrame is a browser-based studio for independent and professional solo animators. The product leads with hand-drawn, frame-by-frame raster animation, custom brushes, keyboard-driven editing, and dependable rendering. Its first goal is a clear, recoverable workflow—not parity with every established desktop animation package.

## Stage 0 — Technical foundation

**Status: initial foundation in place; compatibility and performance targets remain open.**

- Browser application built with React, TypeScript, Vite, and Canvas 2D.
- Local-first project autosave and editable JSON project files; no account or cloud dependency.
- Typed project model for layers, frames, cels, brush presets, and stroke data.
- Remaining decisions: formally supported browsers/devices, canvas/frame limits, storage recovery policy, and accessibility targets.

## Stage 1 — First useful animation

**Status: core workflow implemented; further hardening and user validation remain.**

- Drawing canvas with pencil, ink, marker, eraser, color, pressure input when available, stroke stabilization, and saved custom presets.
- Frame timeline with blank/duplicate/delete/reorder, playback, FPS, loop control, and previous/next onion skin.
- Layers/cels with visibility, lock, opacity, reorder, rename, and deletion.
- Undo/redo, keyboard shortcuts, local autosave, editable project import/export, animated GIF export, and ZIP-packed PNG sequence export.
- Next quality gate: add broader workflow tests and verify memory/performance on larger projects and target stylus devices.

## Stage 2 — Professional drawing and timeline workflow

- Expand brush authoring with pressure curves, spacing, tips/textures, richer preset management, and documented import/export.
- Add selection, lasso, fill, transform/move, line and shape tools, sampling, palette management, and non-destructive cel operations.
- Improve timing/exposure workflows with range selection, holds, markers, labels, configurable onion-skin ranges, and longer-timeline navigation.
- Add reference images, guides, symmetry, workspace preferences, command search, and configurable key bindings.
- Improve project thumbnails, versioning, autosave status, and recovery flows.

## Stage 3 — Production projects and rendering

- Version and migrate the native project schema; validate packaged assets and preserve recoverability.
- Add render settings for frame range, output dimensions, scale, background/transparency, FPS, and file naming.
- Move heavy rendering off the UI thread where practical; support progress, cancellation, memory safeguards, and clear failure recovery.
- Add interchange formats based on demonstrated demand and verified browser/library support; explain fidelity limits.
- Evaluate WebM/MP4 support per browser and retain PNG sequences as a reliable handoff path.

## Stage 4 — Advanced animation and assistance

- Evaluate audio import, waveform/timeline synchronization, scrubbing, and audio-aware output.
- Add optional, reversible assistance such as stroke cleanup, palette suggestions, and previewable in-between/reference suggestions. Never overwrite artwork without explicit confirmation.
- Scope vector animation, rigging, compositing/effects, and camera/multiplane workflows as distinct expansions rather than MVP dependencies.

## Stage 5 — Optional ecosystem

- Consider portable sharing, extension points, and collaboration only after user demand, data-handling, and security requirements are understood.
- Keep core editing usable without an account, cloud storage, or network access unless product direction explicitly changes.

## Product principles

- Drawing and frame-by-frame iteration stay central.
- Frequent actions are discoverable, shortcut-friendly, and reversible.
- Undo/redo, save/recovery, and render status are essential creative tools.
- Assistance remains opt-in and previewable; the animator owns every authored frame.
- Supported formats, device input, and performance limits are described honestly and tested before being promised.
