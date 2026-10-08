# CelFrame Studio

CelFrame is a browser-based, frame-by-frame raster animation editor for solo artists. The initial implementation focuses on the short path from drawing a cel to previewing and exporting an animation.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## Current editor

- Draw with pencil, ink, or marker brushes; adjust size, flow, stabilization, and color; save custom brush presets.
- Use a pressure-sensitive stylus where the browser exposes pen pressure.
- Add and duplicate frames, reorder them, change playback FPS, loop playback, and preview adjacent frames with onion skin.
- Add, rename, hide, lock, reorder, and adjust the opacity of raster layers. Undo and redo drawing and project edits.
- Keep work in browser-local autosave, or import/export an editable `.celframe.json` project.
- Export an animated GIF or a numbered PNG sequence in a ZIP. PNG frames can have transparent backgrounds; GIF uses a warm paper background.

The default stage is 960 × 540. Projects are stored in the current browser profile; they are not uploaded or synced. Export project files periodically if you need a portable backup. GIF exports are limited to 60 million output pixels per pass; use PNG sequence export for larger animations.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Brush / eraser | `B` / `E` |
| Play / pause | `Space` |
| Previous / next frame | `[` / `]` |
| Add blank frame | `F` |
| Duplicate frame | `Shift+D` |
| Undo / redo | `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z` |
| Zoom in / out | `+` / `-` |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the staged plan toward a fuller professional animation tool, including advanced brush authoring, richer timeline workflows, production rendering, audio, vector/rigging, and optional collaboration.

## Technical notes

The editor uses React, TypeScript, Vite, and the browser Canvas 2D API. The editable project format stores frame/cel stroke data rather than flattened images, so the initial format is specific to CelFrame and is not an interchange format. Browser pressure input and available canvas memory vary by device; validate large projects and stylus workflows on the target hardware before relying on them for production.
