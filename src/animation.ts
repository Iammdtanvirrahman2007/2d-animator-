export type DrawingTool = "brush" | "eraser";
export type BrushKind = "pencil" | "ink" | "marker";

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  size: number;
  opacity: number;
  tool: DrawingTool;
  brush: BrushKind;
  pressure: boolean;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface AnimationFrame {
  id: string;
  cels: Record<string, Stroke[]>;
}

export interface AnimationProject {
  formatVersion: 1;
  title: string;
  width: number;
  height: number;
  fps: number;
  loop: boolean;
  layers: Layer[];
  frames: AnimationFrame[];
}

export interface BrushPreset {
  id: string;
  name: string;
  brush: BrushKind;
  size: number;
  opacity: number;
  pressure: boolean;
  stabilization: number;
}

export const DEFAULT_PRESETS: BrushPreset[] = [
  { id: "graphite", name: "Graphite", brush: "pencil", size: 5, opacity: 76, pressure: true, stabilization: 18 },
  { id: "studio-ink", name: "Studio ink", brush: "ink", size: 4, opacity: 100, pressure: true, stabilization: 30 },
  { id: "marker-wash", name: "Marker wash", brush: "marker", size: 18, opacity: 48, pressure: false, stabilization: 8 },
];

export function createId(): string {
  return crypto.randomUUID();
}

export function createBlankProject(title = "Untitled animation"): AnimationProject {
  const layerId = createId();
  return {
    formatVersion: 1,
    title,
    width: 960,
    height: 540,
    fps: 12,
    loop: true,
    layers: [{ id: layerId, name: "Drawing", visible: true, locked: false, opacity: 100 }],
    frames: [{ id: createId(), cels: { [layerId]: [] } }],
  };
}

export function parseProject(value: unknown): AnimationProject {
  if (!value || typeof value !== "object") {
    throw new Error("This file does not contain a CelFrame project.");
  }

  const candidate = value as Partial<AnimationProject>;
  const layers = Array.isArray(candidate.layers) ? candidate.layers : [];
  const frames = Array.isArray(candidate.frames) ? candidate.frames : [];
  const layerIds = new Set(layers.map((layer) => layer?.id));
  const validCanvas =
    Number.isInteger(candidate.width) &&
    Number.isInteger(candidate.height) &&
    (candidate.width ?? 0) >= 64 &&
    (candidate.width ?? 0) <= 4096 &&
    (candidate.height ?? 0) >= 64 &&
    (candidate.height ?? 0) <= 4096 &&
    (candidate.width ?? 0) * (candidate.height ?? 0) <= 8_000_000;
  const validLayers =
    layers.length > 0 &&
    layers.length <= 64 &&
    layers.every(
      (layer) =>
        !!layer &&
        typeof layer.id === "string" &&
        layer.id.length > 0 &&
        typeof layer.name === "string" &&
        layer.name.length <= 80 &&
        typeof layer.visible === "boolean" &&
        typeof layer.locked === "boolean" &&
        Number.isFinite(layer.opacity) &&
        layer.opacity >= 0 &&
        layer.opacity <= 100,
    ) &&
    layerIds.size === layers.length;
  const validFrames =
    frames.length > 0 &&
    frames.length <= 600 &&
    frames.every((frame) => {
      if (!frame || typeof frame.id !== "string" || !frame.id || !frame.cels) return false;
      const celIds = Object.keys(frame.cels);
      if (celIds.length !== layers.length || celIds.some((id) => !layerIds.has(id))) return false;
      return Object.values(frame.cels).every(
        (strokes) =>
          Array.isArray(strokes) &&
          strokes.length <= 50_000 &&
          strokes.every(
            (stroke) =>
              !!stroke &&
              typeof stroke.id === "string" &&
              ["brush", "eraser"].includes(stroke.tool) &&
              ["pencil", "ink", "marker"].includes(stroke.brush) &&
              typeof stroke.color === "string" &&
              /^#[\da-f]{6}$/i.test(stroke.color) &&
              Number.isFinite(stroke.size) &&
              stroke.size > 0 &&
              stroke.size <= 512 &&
              Number.isFinite(stroke.opacity) &&
              stroke.opacity >= 0 &&
              stroke.opacity <= 100 &&
              typeof stroke.pressure === "boolean" &&
              Array.isArray(stroke.points) &&
              stroke.points.length > 0 &&
              stroke.points.length <= 20_000 &&
              stroke.points.every(
                (point) =>
                  Number.isFinite(point.x) &&
                  Number.isFinite(point.y) &&
                  Math.abs(point.x) <= 20_000 &&
                  Math.abs(point.y) <= 20_000 &&
                  Number.isFinite(point.pressure) &&
                  point.pressure >= 0 &&
                  point.pressure <= 2,
              ),
          ),
      );
    });

  if (
    candidate.formatVersion !== 1 ||
    typeof candidate.title !== "string" ||
    candidate.title.length > 200 ||
    !validCanvas ||
    !validLayers ||
    !validFrames ||
    new Set(frames.map((frame) => frame.id)).size !== frames.length
  ) {
    throw new Error(
      "The selected file is not a supported CelFrame project or exceeds the browser's canvas limits.",
    );
  }

  const fps = Number(candidate.fps);
  if (!Number.isFinite(fps) || fps < 1 || fps > 60) {
    throw new Error("The project has an invalid frame rate.");
  }

  return candidate as AnimationProject;
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.points.length === 0) return;

  context.save();
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.globalAlpha = stroke.tool === "eraser" ? 1 : stroke.opacity / 100;
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";
  const brushOpacity = stroke.brush === "pencil" ? 0.78 : stroke.brush === "marker" ? 0.5 : 1;
  context.globalAlpha *= brushOpacity;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      (stroke.size * (stroke.pressure ? Math.max(0.12, point.pressure) : 1)) / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
    return;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const previous = stroke.points[index - 1];
    const current = stroke.points[index];
    const pressure = stroke.pressure ? (previous.pressure + current.pressure) / 2 : 1;
    context.lineWidth = stroke.size * Math.max(0.12, pressure);
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
  }
  context.restore();
}

function drawLayer(
  context: CanvasRenderingContext2D,
  project: AnimationProject,
  frameIndex: number,
  layerId: string,
  previewStroke?: Stroke | null,
): void {
  const layer = project.layers.find((candidate) => candidate.id === layerId);
  const frame = project.frames[frameIndex];
  if (!layer || !frame || !layer.visible) return;

  const scratch = document.createElement("canvas");
  scratch.width = project.width;
  scratch.height = project.height;
  const scratchContext = scratch.getContext("2d");
  if (!scratchContext) throw new Error("Your browser could not create a drawing surface.");

  for (const stroke of frame.cels[layerId] ?? []) drawStroke(scratchContext, stroke);
  if (previewStroke && !layer.locked) drawStroke(scratchContext, previewStroke);

  context.save();
  context.globalAlpha = layer.opacity / 100;
  context.drawImage(scratch, 0, 0);
  context.restore();
}

export function drawAnimationFrame(
  context: CanvasRenderingContext2D,
  project: AnimationProject,
  frameIndex: number,
  onionSkin = false,
  previewStroke?: Stroke | null,
  activeLayerId?: string,
): void {
  context.clearRect(0, 0, project.width, project.height);

  const drawGhost = (index: number, tint: string): void => {
    const ghost = document.createElement("canvas");
    ghost.width = project.width;
    ghost.height = project.height;
    const ghostContext = ghost.getContext("2d");
    if (!ghostContext) throw new Error("Your browser could not render an onion-skin frame.");

    for (const layer of project.layers) drawLayer(ghostContext, project, index, layer.id);
    ghostContext.globalCompositeOperation = "source-in";
    ghostContext.fillStyle = tint;
    ghostContext.fillRect(0, 0, project.width, project.height);

    context.save();
    context.globalAlpha = 0.3;
    context.drawImage(ghost, 0, 0);
    context.restore();
  };

  if (onionSkin && frameIndex > 0) drawGhost(frameIndex - 1, "#59aeb0");
  if (onionSkin && frameIndex < project.frames.length - 1) {
    drawGhost(frameIndex + 1, "#df7657");
  }

  const frame = project.frames[frameIndex];
  if (!frame) return;
  for (const layer of project.layers) {
    drawLayer(
      context,
      project,
      frameIndex,
      layer.id,
      layer.id === activeLayerId ? previewStroke : undefined,
    );
  }
}

export function drawExportFrame(
  context: CanvasRenderingContext2D,
  project: AnimationProject,
  frameIndex: number,
  background: string | null = "#faf9f4",
): void {
  context.clearRect(0, 0, project.width, project.height);
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, project.width, project.height);
  }
  for (const layer of project.layers) drawLayer(context, project, frameIndex, layer.id);
}
