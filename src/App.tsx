import {
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FilePlus2,
  FileUp,
  Film,
  Layers,
  Lock,
  PaintBucket,
  MoveDown,
  MoveUp,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createBlankProject,
  createId,
  DEFAULT_PRESETS,
  drawAnimationFrame,
  drawExportFrame,
  parseProject,
  type AnimationFrame,
  type AnimationProject,
  type BrushKind,
  type BrushPreset,
  type DrawingTool,
  type Layer,
  type Stroke,
  type StrokePoint,
} from "./animation";
import { downloadProject, exportGif, exportPngSequence } from "./exporters";
import "./styles.css";

const PROJECT_STORAGE_KEY = "celframe-studio-project-v1";
const PRESET_STORAGE_KEY = "celframe-studio-brush-presets-v1";
const MAX_HISTORY = 80;

type StatusMessage = { text: string; kind: "info" | "success" | "error" };
type ModalName = "export" | "shortcuts" | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function loadSavedProject(): { project: AnimationProject; warning: string | null } {
  try {
    const saved = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    return {
      project: saved ? parseProject(JSON.parse(saved)) : createBlankProject(),
      warning: null,
    };
  } catch (error) {
    return {
      project: createBlankProject(),
      warning: `The saved project could not be opened: ${errorMessage(error)}. Import a project file or start a new one.`,
    };
  }
}

function loadBrushPresets(): { presets: BrushPreset[]; warning: string | null } {
  try {
    const saved = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!saved) return { presets: DEFAULT_PRESETS, warning: null };
    const parsed: unknown = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (preset) =>
          typeof preset.id === "string" &&
          typeof preset.name === "string" &&
          ["pencil", "ink", "marker"].includes(preset.brush) &&
          Number.isFinite(preset.size) &&
          Number.isFinite(preset.opacity) &&
          Number.isFinite(preset.stabilization) &&
          typeof preset.pressure === "boolean",
      )
    ) {
      throw new Error("The saved brush presets are not valid.");
    }
    return { presets: parsed as BrushPreset[], warning: null };
  } catch (error) {
    return {
      presets: DEFAULT_PRESETS,
      warning: `Saved brush presets could not be opened: ${errorMessage(error)}.`,
    };
  }
}

function thumbnailDataUrl(project: AnimationProject, frameIndex: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = 144;
  canvas.height = 81;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.fillStyle = "#faf9f4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / project.width, canvas.height / project.height);
  drawExportFrame(context, project, frameIndex, null);
  context.restore();
  return canvas.toDataURL("image/png");
}

function FrameThumbnail({
  project,
  frameIndex,
}: {
  project: AnimationProject;
  frameIndex: number;
}) {
  const source = useMemo(
    () => thumbnailDataUrl(project, frameIndex),
    [project, frameIndex],
  );
  return source ? <img src={source} alt="" draggable={false} /> : <span className="thumb-empty" />;
}

function App() {
  const [initial] = useState(loadSavedProject);
  const [initialBrushes] = useState(loadBrushPresets);
  const [project, setProject] = useState(initial.project);
  const [currentFrameId, setCurrentFrameId] = useState(initial.project.frames[0].id);
  const [activeLayerId, setActiveLayerId] = useState(initial.project.layers[0].id);
  const [tool, setTool] = useState<DrawingTool>("brush");
  const [selectedBrush, setSelectedBrush] = useState<BrushKind>("pencil");
  const [color, setColor] = useState("#263b3b");
  const [size, setSize] = useState(5);
  const [opacity, setOpacity] = useState(76);
  const [stabilization, setStabilization] = useState(18);
  const [pressure, setPressure] = useState(true);
  const [fillTolerance, setFillTolerance] = useState(32);
  const [fillGap, setFillGap] = useState(4);
  const [fillOpacity, setFillOpacity] = useState(100);
  const [fillMode, setFillMode] = useState<"contiguous" | "all">("contiguous");
  const [fillPreserveAlpha, setFillPreserveAlpha] = useState(false);
  const [presets, setPresets] = useState(initialBrushes.presets);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState("graphite");
  const [onionSkin, setOnionSkin] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [playbackStart, setPlaybackStart] = useState(0);
  const [playbackEnd, setPlaybackEnd] = useState(Math.max(0, initial.project.frames.length - 1));
  const [stageSize, setStageSize] = useState(640);
  const [modal, setModal] = useState<ModalName>(null);
  const [transparentExport, setTransparentExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<StatusMessage>(
    initial.warning || initialBrushes.warning
      ? { text: initial.warning ?? initialBrushes.warning!, kind: "error" }
      : { text: "Ready to draw", kind: "info" },
  );
  const [historyVersion, setHistoryVersion] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [openLayerMenuId, setOpenLayerMenuId] = useState<string | null>(null);
  const [objectMode, setObjectMode] = useState(false);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const objectDragRef = useRef<{ startX: number; startY: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const previewStrokeRef = useRef<Stroke | null>(null);
  const historyRef = useRef<AnimationProject[]>([initial.project]);
  const historyCursorRef = useRef(0);
  const skipFirstAutosaveRef = useRef(true);
  const currentFrameIndex = Math.max(
    0,
    project.frames.findIndex((frame) => frame.id === currentFrameId),
  );
  const currentFrame = project.frames[currentFrameIndex];
  const activeLayer = project.layers.find((layer) => layer.id === activeLayerId);

  const announce = useCallback((text: string, kind: StatusMessage["kind"] = "info") => {
    setStatus({ text, kind });
  }, []);

  const commitProject = useCallback((next: AnimationProject) => {
    const nextHistory = historyRef.current.slice(0, historyCursorRef.current + 1);
    nextHistory.push(next);
    if (nextHistory.length > MAX_HISTORY) nextHistory.shift();
    historyRef.current = nextHistory;
    historyCursorRef.current = nextHistory.length - 1;
    setProject(next);
    setHistoryVersion((version) => version + 1);
  }, []);

  const replaceProject = useCallback((next: AnimationProject) => {
    historyRef.current = [next];
    historyCursorRef.current = 0;
    setProject(next);
    setCurrentFrameId(next.frames[0].id);
    setActiveLayerId(next.layers[0].id);
    setHistoryVersion((version) => version + 1);
    setPlaying(false);
    setZoom(1);
  }, []);

  const paintStage = useCallback(
    (previewStroke: Stroke | null = null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const expectedWidth = Math.round(project.width * ratio);
      const expectedHeight = Math.round(project.height * ratio);
      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        announce("The drawing canvas could not be created in this browser.", "error");
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      try {
        drawAnimationFrame(
          context,
          project,
          currentFrameIndex,
          onionSkin,
          previewStroke,
          activeLayerId,
        );
        if (objectMode && selectedStrokeIds.length) {
          const strokes = (currentFrame?.cels[activeLayerId] ?? []).filter((stroke) => selectedStrokeIds.includes(stroke.id));
          const points = strokes.flatMap((stroke) => stroke.points);
          if (points.length) {
            const minX = Math.min(...points.map((p) => p.x)); const maxX = Math.max(...points.map((p) => p.x));
            const minY = Math.min(...points.map((p) => p.y)); const maxY = Math.max(...points.map((p) => p.y));
            context.save(); context.strokeStyle = "#3d6bff"; context.lineWidth = 1.5 / ratio; context.setLineDash([7 / ratio, 4 / ratio]);
            context.strokeRect(minX, minY, maxX - minX, maxY - minY); context.setLineDash([]); context.fillStyle = "#3d6bff";
            for (const [x, y] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) context.fillRect(x - 4 / ratio, y - 4 / ratio, 8 / ratio, 8 / ratio);
            context.restore();
          }
        }
      } catch (error) {
        announce(`Canvas render failed: ${errorMessage(error)}`, "error");
      }
    },
    [activeLayerId, announce, currentFrame, currentFrameIndex, objectMode, onionSkin, project, selectedStrokeIds],
  );

  useEffect(() => {
    paintStage(previewStrokeRef.current);
  }, [paintStage]);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      const availableWidth = Math.max(320, viewport.clientWidth - 96);
      const availableHeight = Math.max(200, viewport.clientHeight - 96);
      const fittedWidth = Math.min(availableWidth, (availableHeight * project.width) / project.height);
      setStageSize(Math.round(fittedWidth));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [project.height, project.width]);

  useEffect(() => {
    if (skipFirstAutosaveRef.current) {
      skipFirstAutosaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
        announce("Saved in this browser", "success");
      } catch (error) {
        announce(
          `Autosave failed: ${errorMessage(error)}. Export a project file to keep a copy.`,
          "error",
        );
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [announce, project]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      announce(`Brush presets could not be saved: ${errorMessage(error)}`, "error");
    }
  }, [announce, presets]);

  useEffect(() => {
    if (!project.frames.some((frame) => frame.id === currentFrameId)) {
      setCurrentFrameId(project.frames[Math.min(currentFrameIndex, project.frames.length - 1)].id);
    }
    if (!project.layers.some((layer) => layer.id === activeLayerId)) {
      setActiveLayerId(project.layers.at(-1)?.id ?? project.layers[0].id);
    }
  }, [activeLayerId, currentFrameId, currentFrameIndex, project]);

  useEffect(() => {
    const maxFrame = Math.max(0, project.frames.length - 1);
    setPlaybackStart((value) => Math.min(value, maxFrame));
    setPlaybackEnd((value) => Math.max(Math.min(value, maxFrame), Math.min(playbackStart, maxFrame)));
  }, [project.frames.length, playbackStart]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCurrentFrameId((frameId) => {
        const index = project.frames.findIndex((frame) => frame.id === frameId);
        const start = Math.min(playbackStart, project.frames.length - 1);
        const end = Math.max(start, Math.min(playbackEnd, project.frames.length - 1));
        if (index < end) return project.frames[index + 1].id;
        if (project.loop) return project.frames[start].id;
        setPlaying(false);
        return frameId;
      });
    }, 1000 / project.fps);
    return () => window.clearInterval(timer);
  }, [playing, playbackEnd, playbackStart, project.fps, project.frames, project.loop]);

  useEffect(() => {
    const selected = timelineRef.current?.querySelector<HTMLElement>(
      `[data-frame-id="${currentFrameId}"]`,
    );
    selected?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentFrameId]);

  const undo = useCallback(() => {
    if (historyCursorRef.current === 0) return;
    historyCursorRef.current -= 1;
    setProject(historyRef.current[historyCursorRef.current]);
    setHistoryVersion((version) => version + 1);
    announce("Undo", "info");
  }, [announce]);

  const redo = useCallback(() => {
    if (historyCursorRef.current >= historyRef.current.length - 1) return;
    historyCursorRef.current += 1;
    setProject(historyRef.current[historyCursorRef.current]);
    setHistoryVersion((version) => version + 1);
    announce("Redo", "info");
  }, [announce]);

  const canUndo = useMemo(() => historyCursorRef.current > 0, [historyVersion]);
  const canRedo = useMemo(
    () => historyCursorRef.current < historyRef.current.length - 1,
    [historyVersion],
  );

  const goToFrame = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(project.frames.length - 1, Math.round(index)));
    setCurrentFrameId(project.frames[clamped].id);
    setPlaying(false);
  }, [project.frames]);

  const addFrame = useCallback(
    (duplicate: boolean) => {
      const frame: AnimationFrame = {
        id: createId(),
        cels: Object.fromEntries(
          project.layers.map((layer) => [
            layer.id,
            duplicate
              ? [...(currentFrame.cels[layer.id] ?? [])]
              : [],
          ]),
        ),
      };
      const frames = [...project.frames];
      frames.splice(currentFrameIndex + 1, 0, frame);
      commitProject({ ...project, frames });
      setCurrentFrameId(frame.id);
      announce(duplicate ? "Frame duplicated" : "Blank frame added", "success");
    },
    [announce, commitProject, currentFrame, currentFrameIndex, project],
  );

  const deleteFrame = useCallback(() => {
    if (project.frames.length === 1) {
      announce("An animation needs at least one frame.", "error");
      return;
    }
    const frames = project.frames.filter((frame) => frame.id !== currentFrameId);
    const selectedIndex = Math.max(0, currentFrameIndex - 1);
    commitProject({ ...project, frames });
    setCurrentFrameId(frames[selectedIndex].id);
    announce("Frame deleted", "success");
  }, [announce, commitProject, currentFrameId, currentFrameIndex, project]);

  const moveFrame = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = currentFrameIndex + direction;
      if (nextIndex < 0 || nextIndex >= project.frames.length) return;
      const frames = [...project.frames];
      [frames[currentFrameIndex], frames[nextIndex]] = [frames[nextIndex], frames[currentFrameIndex]];
      commitProject({ ...project, frames });
      announce("Frame order updated", "success");
    },
    [announce, commitProject, currentFrameIndex, project],
  );

  const addLayer = useCallback(() => {
    const layer: Layer = {
      id: createId(),
      name: `Layer ${project.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
    };
    const frames = project.frames.map((frame) => ({
      ...frame,
      cels: { ...frame.cels, [layer.id]: [] },
    }));
    commitProject({ ...project, layers: [...project.layers, layer], frames });
    setActiveLayerId(layer.id);
    announce("Layer added", "success");
  }, [announce, commitProject, project]);

  const changeLayer = useCallback(
    (layerId: string, change: Partial<Layer>) => {
      commitProject({
        ...project,
        layers: project.layers.map((layer) =>
          layer.id === layerId ? { ...layer, ...change } : layer,
        ),
      });
    },
    [commitProject, project],
  );

  const renameLayer = (layerId: string, name: string) => {
    changeLayer(layerId, { name });
  };

  const renameProject = (title: string) => {
    const next = { ...project, title };
    historyRef.current[historyCursorRef.current] = next;
    setProject(next);
  };

  const moveLayer = useCallback(
    (layerId: string, direction: -1 | 1) => {
      const index = project.layers.findIndex((layer) => layer.id === layerId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= project.layers.length) return;
      const layers = [...project.layers];
      [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
      commitProject({ ...project, layers });
    },
    [commitProject, project],
  );

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (project.layers.length === 1) {
        announce("Keep at least one layer in the project.", "error");
        return;
      }
      const layers = project.layers.filter((layer) => layer.id !== layerId);
      const frames = project.frames.map((frame) => {
        const cels = { ...frame.cels };
        delete cels[layerId];
        return { ...frame, cels };
      });
      commitProject({ ...project, layers, frames });
      if (activeLayerId === layerId) setActiveLayerId(layers.at(-1)!.id);
      announce("Layer deleted", "success");
    },
    [activeLayerId, announce, commitProject, project],
  );

  const applyFillAt = useCallback((x: number, y: number) => {
    if (!currentFrame || !activeLayer || activeLayer.locked || !activeLayer.visible) return;
    const sourceLayers = fillMode === "all" ? project.layers.filter((layer) => layer.visible) : [activeLayer];
    const candidates = sourceLayers.flatMap((sourceLayer) => (currentFrame.cels[sourceLayer.id] ?? []).map((stroke, index) => ({ stroke, index, layerId: sourceLayer.id })))
      .map(({ stroke, index, layerId }) => {
        if (stroke.tool === "fill" || stroke.points.length < 3) return null;
        const first = stroke.points[0];
        const last = stroke.points.at(-1)!;
        if (Math.hypot(first.x - last.x, first.y - last.y) > Math.max(12 + fillGap * 3, stroke.size * 2.5 + fillGap)) return null;
        let inside = false;
        for (let i = 0, j = stroke.points.length - 1; i < stroke.points.length; j = i++) {
          const a = stroke.points[i];
          const b = stroke.points[j];
          const crosses = (a.y > y) !== (b.y > y);
          if (crosses && x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x) inside = !inside;
        }
        if (!inside) return null;
        let area = 0;
        for (let i = 0, j = stroke.points.length - 1; i < stroke.points.length; j = i++) {
          area += stroke.points[j].x * stroke.points[i].y - stroke.points[i].x * stroke.points[j].y;
        }
        return { stroke, index, layerId, area: Math.abs(area) / 2 };
      })
      .filter((value): value is { stroke: Stroke; index: number; layerId: string; area: number } => value !== null)
      .sort((a, b) => a.area - b.area);
    const target = candidates[0];
    if (!target) {
      announce("Fill needs a closed outline on the current layer.", "error");
      return;
    }
    const fillStroke: Stroke = {
      id: createId(),
      points: target.stroke.points.map((point) => ({ ...point })),
      color,
      size: 1,
      opacity: fillOpacity,
      tool: "fill",
      brush: "ink",
      pressure: false,
    };
    const targetStrokes = currentFrame.cels[target.layerId] ?? [];
    const nextStrokes = [...targetStrokes];
    nextStrokes.splice(target.index, 0, fillStroke);
    const frames = project.frames.map((frame) =>
      frame.id === currentFrame.id
        ? { ...frame, cels: { ...frame.cels, [target.layerId]: nextStrokes } }
        : frame,
    );
    commitProject({ ...project, frames });
    announce("Area filled", "success");
  }, [activeLayer, activeLayerId, announce, color, commitProject, currentFrame, fillGap, fillMode, fillOpacity, project]);

  const distanceToStroke = (x: number, y: number, stroke: Stroke) => {
    let best = Infinity;
    for (let i = 1; i < stroke.points.length; i += 1) {
      const a = stroke.points[i - 1], b = stroke.points[i];
      const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / d));
      best = Math.min(best, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
    }
    const first = stroke.points[0];
    return first ? Math.min(best, Math.hypot(x - first.x, y - first.y)) : best;
  };

  const transformSelected = useCallback((transform: (point: StrokePoint, cx: number, cy: number) => StrokePoint) => {
    if (!currentFrame || !selectedStrokeIds.length) return;
    const selected = (currentFrame.cels[activeLayerId] ?? []).filter((s) => selectedStrokeIds.includes(s.id));
    const points = selected.flatMap((s) => s.points);
    if (!points.length) return;
    const cx = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
    const cy = (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2;
    const ids = new Set(selectedStrokeIds);
    const frames = project.frames.map((frame) => frame.id === currentFrame.id
      ? { ...frame, cels: { ...frame.cels, [activeLayerId]: (frame.cels[activeLayerId] ?? []).map((s) => ids.has(s.id) ? { ...s, points: s.points.map((p) => transform(p, cx, cy)) } : s) } }
      : frame);
    commitProject({ ...project, frames });
  }, [activeLayerId, commitProject, currentFrame, project, selectedStrokeIds]);

  const rotateSelected = (degrees: number) => {
    const r = degrees * Math.PI / 180;
    transformSelected((p, cx, cy) => { const x = p.x - cx, y = p.y - cy; return { ...p, x: cx + x * Math.cos(r) - y * Math.sin(r), y: cy + x * Math.sin(r) + y * Math.cos(r) }; });
  };

  const scaleSelected = (factor: number) => {
    transformSelected((p, cx, cy) => ({ ...p, x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor }));
  };

  const duplicateSelected = useCallback(() => {
    if (!currentFrame || !selectedStrokeIds.length) return;
    const selected = (currentFrame.cels[activeLayerId] ?? []).filter((s) => selectedStrokeIds.includes(s.id));
    const copies = selected.map((s) => ({ ...s, id: createId(), points: s.points.map((p) => ({ ...p, x: p.x + 12, y: p.y + 12 })) }));
    const frames = project.frames.map((f) => f.id === currentFrame.id ? { ...f, cels: { ...f.cels, [activeLayerId]: [...(f.cels[activeLayerId] ?? []), ...copies] } } : f);
    commitProject({ ...project, frames }); setSelectedStrokeIds(copies.map((s) => s.id)); announce("Objects duplicated", "success");
  }, [activeLayerId, announce, commitProject, currentFrame, project, selectedStrokeIds]);

  const deleteSelected = useCallback(() => {
    if (!currentFrame || !selectedStrokeIds.length) return;
    const ids = new Set(selectedStrokeIds);
    const frames = project.frames.map((f) => f.id === currentFrame.id ? { ...f, cels: { ...f.cels, [activeLayerId]: (f.cels[activeLayerId] ?? []).filter((s) => !ids.has(s.id)) } } : f);
    commitProject({ ...project, frames }); setSelectedStrokeIds([]); announce("Selected objects deleted", "success");
  }, [activeLayerId, announce, commitProject, currentFrame, project, selectedStrokeIds]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    if (tool === "fill") {
      if (!activeLayer || activeLayer.locked || !activeLayer.visible || !currentFrame) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * project.width;
      const y = ((event.clientY - rect.top) / rect.height) * project.height;
      applyFillAt(x, y);
      return;
    }
    if (objectMode) {
      if (!activeLayer || activeLayer.locked || !activeLayer.visible || !currentFrame) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * project.width;
      const y = ((event.clientY - rect.top) / rect.height) * project.height;
      const strokes = currentFrame.cels[activeLayerId] ?? [];
      const hit = [...strokes].reverse().find((s) => distanceToStroke(x, y, s) <= Math.max(10, s.size * 2));
      if (!hit) { if (!event.shiftKey) setSelectedStrokeIds([]); return; }
      const ids = event.shiftKey ? (selectedStrokeIds.includes(hit.id) ? selectedStrokeIds : [...selectedStrokeIds, hit.id]) : [hit.id];
      setSelectedStrokeIds(ids); objectDragRef.current = { startX: x, startY: y }; event.currentTarget.setPointerCapture(event.pointerId); return;
    }
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      announce("Select a visible, unlocked layer before drawing.", "error");
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const point: StrokePoint = {
      x: ((event.clientX - rect.left) / rect.width) * project.width,
      y: ((event.clientY - rect.top) / rect.height) * project.height,
      pressure: pressure && event.pointerType === "pen" ? Math.max(0.12, event.pressure) : 1,
    };
    const stroke: Stroke = {
      id: createId(),
      points: [point],
      color,
      size,
      opacity,
      tool,
      brush: selectedBrush,
      pressure: pressure && event.pointerType === "pen",
    };
    previewStrokeRef.current = stroke;
    setIsDrawing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    paintStage(stroke);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (objectMode && objectDragRef.current && currentFrame) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * project.width;
      const y = ((event.clientY - rect.top) / rect.height) * project.height;
      const dx = x - objectDragRef.current.startX, dy = y - objectDragRef.current.startY;
      const ids = new Set(selectedStrokeIds);
      const frames = project.frames.map((f) => f.id === currentFrame.id ? { ...f, cels: { ...f.cels, [activeLayerId]: (f.cels[activeLayerId] ?? []).map((s) => ids.has(s.id) ? { ...s, points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) } : s) } } : f);
      setProject({ ...project, frames }); objectDragRef.current = { startX: x, startY: y }; paintStage(); return;
    }
    const stroke = previewStrokeRef.current;
    if (!stroke) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * project.width;
    const rawY = ((event.clientY - rect.top) / rect.height) * project.height;
    const previous = stroke.points.at(-1)!;
    const follow = 1 - (stabilization / 100) * 0.82;
    const nextPoint: StrokePoint = {
      x: previous.x + (rawX - previous.x) * follow,
      y: previous.y + (rawY - previous.y) * follow,
      pressure:
        stroke.pressure && event.pointerType === "pen"
          ? Math.max(0.12, event.pressure)
          : 1,
    };
    if (Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y) < 0.35) return;
    const nextStroke = { ...stroke, points: [...stroke.points, nextPoint] };
    previewStrokeRef.current = nextStroke;
    paintStage(nextStroke);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (objectMode && objectDragRef.current) {
      objectDragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId);
      historyRef.current = historyRef.current.slice(0, historyCursorRef.current + 1); historyRef.current.push(project); historyCursorRef.current = historyRef.current.length - 1; setHistoryVersion((v) => v + 1); return;
    }
    const stroke = previewStrokeRef.current;
    if (!stroke || !currentFrame) return;
    previewStrokeRef.current = null;
    setIsDrawing(false);
    const frames = project.frames.map((frame) =>
      frame.id === currentFrame.id
        ? {
            ...frame,
            cels: {
              ...frame.cels,
              [activeLayerId]: [...(frame.cels[activeLayerId] ?? []), stroke],
            },
          }
        : frame,
    );
    commitProject({ ...project, frames });
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearCurrentLayerCel = useCallback(() => {
    if (!currentFrame || !(currentFrame.cels[activeLayerId] ?? []).length) return;
    const frames = project.frames.map((frame) =>
      frame.id === currentFrame.id
        ? { ...frame, cels: { ...frame.cels, [activeLayerId]: [] } }
        : frame,
    );
    commitProject({ ...project, frames });
    announce("Current layer cel cleared", "success");
  }, [activeLayerId, announce, commitProject, currentFrame, project]);

  const selectPreset = (preset: BrushPreset) => {
    setSelectedBrush(preset.brush);
    setSize(preset.size);
    setOpacity(preset.opacity);
    setPressure(preset.pressure);
    setStabilization(preset.stabilization);
    setTool("brush");
    setObjectMode(false);
    setActivePresetId(preset.id);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      announce("Give the brush a name before saving it.", "error");
      return;
    }
    const preset: BrushPreset = {
      id: createId(),
      name,
      brush: selectedBrush,
      size,
      opacity,
      pressure,
      stabilization,
    };
    setPresets((existing) => [...existing, preset]);
    setPresetName("");
    setActivePresetId(preset.id);
    announce(`Brush “${name}” saved`, "success");
  };

  const deletePreset = (presetId: string) => {
    if (DEFAULT_PRESETS.some((preset) => preset.id === presetId)) return;
    setPresets((existing) => existing.filter((preset) => preset.id !== presetId));
    if (activePresetId === presetId) setActivePresetId("");
    announce("Custom brush removed", "success");
  };

  const startNewProject = () => {
    const hasArtwork = project.frames.some((frame) =>
      Object.values(frame.cels).some((strokes) => strokes.length > 0),
    );
    if (
      hasArtwork &&
      !window.confirm("Start a new animation? Export the current project first if you want to keep a separate copy.")
    ) {
      return;
    }
    replaceProject(createBlankProject());
    announce("New animation created", "success");
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const imported = parseProject(JSON.parse(await file.text()));
      replaceProject(imported);
      announce(`Opened ${file.name}`, "success");
    } catch (error) {
      announce(`Project could not be opened: ${errorMessage(error)}`, "error");
    }
  };

  const changeFrameRate = (event: ChangeEvent<HTMLSelectElement>) => {
    commitProject({ ...project, fps: Number(event.currentTarget.value) });
  };

  const exportAction = async (format: "gif" | "png" | "project") => {
    if (exporting) return;
    if (format === "project") {
      try {
        downloadProject(project);
        setModal(null);
        announce("Project file downloaded", "success");
      } catch (error) {
        announce(`Project file could not be created: ${errorMessage(error)}`, "error");
      }
      return;
    }
    setExporting(true);
    try {
      if (format === "gif") {
        await exportGif(project, (message) => announce(message));
        announce("GIF export complete", "success");
      } else {
        await exportPngSequence(project, transparentExport, (message) => announce(message));
        announce("PNG sequence downloaded", "success");
      }
      setModal(null);
    } catch (error) {
      announce(`Export failed: ${errorMessage(error)}`, "error");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (editing) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key.toLowerCase() === "b") {
        setTool("brush");
        setObjectMode(false);
        setSelectedStrokeIds([]);
      } else if (event.key.toLowerCase() === "g") {
        setTool("fill");
        setObjectMode(false);
        setSelectedStrokeIds([]);
      } else if (event.key.toLowerCase() === "w") {
        setObjectMode((value) => !value);
        setSelectedStrokeIds([]);
      } else if (event.key.toLowerCase() === "e") {
        setTool((value) => (value === "eraser" ? "brush" : "eraser"));
      } else if (event.key.toLowerCase() === "f") {
        addFrame(false);
      } else if (event.key.toLowerCase() === "d" && event.shiftKey) {
        addFrame(true);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToFrame(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToFrame(project.frames.length - 1);
      } else if (event.key === "ArrowLeft" && event.shiftKey) {
        setPlaybackStart(currentFrameIndex);
      } else if (event.key === "ArrowRight" && event.shiftKey) {
        setPlaybackEnd(currentFrameIndex);
      } else if (event.key === "[") {
        goToFrame(currentFrameIndex - 1);
      } else if (event.key === "]") {
        goToFrame(currentFrameIndex + 1);
      } else if (event.key === "+" || event.key === "=") {
        setZoom((value) => Math.min(2.5, Math.round((value + 0.1) * 10) / 10));
      } else if (event.key === "-") {
        setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addFrame, currentFrameIndex, goToFrame, project.frames, redo, undo]);

  const allStrokes = project.frames.flatMap((frame) =>
    Object.values(frame.cels).flatMap((strokes) => strokes),
  ).length;
  const stageWidth = Math.max(320, Math.round(stageSize * zoom));
  const stageHeight = Math.round((stageWidth * project.height) / project.width);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="brand-name">
            <strong>CelFrame</strong>
            <span>ANIMATION STUDIO</span>
          </div>
        </div>
        <div className="project-title">
          <span className="project-title-label">PROJECT</span>
          <input
            aria-label="Project name"
            maxLength={80}
            value={project.title}
            onChange={(event) => renameProject(event.currentTarget.value)}
          />
          <span className="save-state">
            <Save size={13} aria-hidden="true" />
            LOCAL
          </span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="Undo"
            title="Undo — Ctrl/⌘ Z"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Redo"
            title="Redo — Ctrl/⌘ Shift Z"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="action-divider" />
          <button
            className="top-action-button"
            type="button"
            aria-label="New animation"
            title="New animation"
            onClick={startNewProject}
          >
            <FilePlus2 size={16} />
            <span>New</span>
          </button>
          <button
            className="top-action-button"
            type="button"
            aria-label="Open a CelFrame project file"
            title="Open a CelFrame project file"
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp size={16} />
            <span>Open</span>
          </button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importProject}
            aria-label="Open a CelFrame project file"
          />
          <button className="export-button" type="button" onClick={() => setModal("export")}>
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      <section className="editor-workspace" aria-label="Animation editor">
        <nav className="tool-rail" aria-label="Drawing tools">
          <div className="tool-rail-heading">TOOLS</div>
          <button
            className={`tool-button ${tool === "fill" ? "selected" : ""}`}
            type="button"
            aria-label="Fill tool"
            aria-pressed={tool === "fill"}
            title="Fill closed area (G)"
            onClick={() => { setTool("fill"); setObjectMode(false); setSelectedStrokeIds([]); }}
          >
            <PaintBucket size={19} />
            <span>Fill</span>
            <kbd>G</kbd>
          </button>
          <button
            className={`tool-button ${objectMode ? "selected" : ""}`}
            type="button"
            aria-label="Object mode"
            aria-pressed={objectMode}
            title="Object Mode (W)"
            onClick={() => { setObjectMode((value) => !value); setSelectedStrokeIds([]); }}
          >
            <MoveUp size={19} />
            <span>Object</span>
            <kbd>W</kbd>
          </button>
          <button
            className={`tool-button ${tool === "brush" ? "selected" : ""}`}
            type="button"
            aria-label="Brush tool"
            aria-pressed={tool === "brush"}
            title="Brush (B)"
            onClick={() => setTool("brush")}
          >
            <Brush size={19} />
            <span>Brush</span>
            <kbd>B</kbd>
          </button>
          <button
            className={`tool-button ${tool === "eraser" ? "selected" : ""}`}
            type="button"
            aria-label="Eraser tool"
            aria-pressed={tool === "eraser"}
            title="Eraser (E)"
            onClick={() => setTool("eraser")}
          >
            <Eraser size={19} />
            <span>Eraser</span>
            <kbd>E</kbd>
          </button>
          <span className="rail-separator" />
          <button
            className="tool-button quiet"
            type="button"
            aria-label="Clear active layer cel"
            title="Clear active layer cel"
            onClick={clearCurrentLayerCel}
            disabled={!(currentFrame?.cels[activeLayerId] ?? []).length}
          >
            <Trash2 size={18} />
            <span>Clear</span>
          </button>
          <div className="rail-spacer" />
          <button
            className="tool-button quiet"
            type="button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            onClick={() => setModal("shortcuts")}
          >
            <CircleHelp size={18} />
            <span>Help</span>
          </button>
        </nav>

        <section className="stage-column" aria-label="Animation stage">
          <div className="stage-toolbar">
            <div className="stage-heading">
              <span className="stage-live-dot" />
              <div>
                <strong>Drawing stage</strong>
                <span>{project.width} × {project.height} px</span>
              </div>
            </div>
            <div className="stage-controls">
              {objectMode && selectedStrokeIds.length > 0 && (
                <>
                  <span className="object-selection-label">{selectedStrokeIds.length} object{selectedStrokeIds.length > 1 ? "s" : ""}</span>
                  <button type="button" className="small-toggle" title="Rotate left 15°" onClick={() => rotateSelected(-15)}>↶ 15°</button>
                  <button type="button" className="small-toggle" title="Rotate right 15°" onClick={() => rotateSelected(15)}>↷ 15°</button>
                  <button type="button" className="small-toggle" title="Scale down" onClick={() => scaleSelected(0.9)}>−10%</button>
                  <button type="button" className="small-toggle" title="Scale up" onClick={() => scaleSelected(1.1)}>+10%</button>
                  <button type="button" className="small-toggle" title="Duplicate selected objects" onClick={duplicateSelected}><Copy size={14} /> Duplicate</button>
                  <button type="button" className="small-toggle" title="Delete selected objects" onClick={deleteSelected}><Trash2 size={14} /> Delete</button>
                  <span className="toolbar-divider" />
                </>
              )}
              <button
                type="button"
                className={`small-toggle ${onionSkin ? "active" : ""}`}
                aria-pressed={onionSkin}
                title="Show previous and next frames"
                onClick={() => setOnionSkin((value) => !value)}
              >
                <Layers size={15} />
                Onion skin
              </button>
              <span className="toolbar-divider" />
              <button
                type="button"
                className="zoom-button"
                aria-label="Zoom out"
                title="Zoom out (-)"
                onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))}
              >
                <ZoomOut size={15} />
              </button>
              <button
                className="zoom-readout"
                type="button"
                title="Reset zoom"
                onClick={() => setZoom(1)}
              >
                {zoomLabel}
              </button>
              <button
                type="button"
                className="zoom-button"
                aria-label="Zoom in"
                title="Zoom in (+)"
                onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.1) * 10) / 10))}
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          <div className="stage-viewport" ref={stageViewportRef}>
            <div className="stage-positioner">
              <div
                className="paper-stage"
                style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
              >
                <canvas
                  ref={canvasRef}
                  className="drawing-canvas"
                  aria-label={`Drawing canvas, frame ${currentFrameIndex + 1}`}
                  role="img"
                  tabIndex={0}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => {
                    previewStrokeRef.current = null;
                    setIsDrawing(false);
                    paintStage();
                  }}
                />
                <span className="registration registration-tl" aria-hidden="true" />
                <span className="registration registration-tr" aria-hidden="true" />
                <span className="registration registration-bl" aria-hidden="true" />
                <span className="registration registration-br" aria-hidden="true" />
                {allStrokes === 0 && !isDrawing && (
                  <div className="empty-stage-hint" aria-hidden="true">
                    <span className="hint-crosshair">＋</span>
                    <strong>Your stage is ready</strong>
                    <span>Choose a brush and draw your first frame</span>
                    <kbd>B</kbd>
                  </div>
                )}
              </div>
            </div>
            <div className="stage-caption">
              <span>FRAME {String(currentFrameIndex + 1).padStart(2, "0")}</span>
              <span>·</span>
              <span>{currentFrame?.cels[activeLayerId]?.length ?? 0} strokes on {activeLayer?.name ?? "layer"}</span>
              <span className="caption-spacer" />
              <span>PRESSURE {pressure ? "ON" : "OFF"}</span>
            </div>
          </div>
          <div className="stage-footer">
            <span><Brush size={13} /> Drag on the stage to draw</span>
            <span className="footer-separator" />
            <span>Use a stylus for pressure-sensitive strokes</span>
          </div>
        </section>

        <section className="timeline-panel" aria-label="Animation timeline">
          <div className="timeline-topline">
            <div className="timeline-title">
              <Film size={16} />
              <h2>Timeline</h2>
              <span className="frame-count">{project.frames.length} {project.frames.length === 1 ? "frame" : "frames"}</span>
            </div>
            <div className="timeline-actions">
              <button type="button" className="timeline-jump-button" title="First frame (Home)" aria-label="First frame" onClick={() => goToFrame(0)} disabled={currentFrameIndex === 0}>|◀</button>
              <button
                type="button"
                className="transport-button"
                aria-label="Previous frame"
                title="Previous frame ([)"
                onClick={() => setCurrentFrameId(project.frames[Math.max(0, currentFrameIndex - 1)].id)}
                disabled={currentFrameIndex === 0}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className={`play-button ${playing ? "is-playing" : ""}`}
                aria-label={playing ? "Pause playback" : "Play animation"}
                title={playing ? "Pause (Space)" : "Play (Space)"}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <button
                type="button"
                className="transport-button"
                aria-label="Next frame"
                title="Next frame (])"
                onClick={() => setCurrentFrameId(project.frames[Math.min(project.frames.length - 1, currentFrameIndex + 1)].id)}
                disabled={currentFrameIndex === project.frames.length - 1}
              >
                <ChevronRight size={17} />
              </button>
              <button type="button" className="timeline-jump-button" title="Last frame (End)" aria-label="Last frame" onClick={() => goToFrame(project.frames.length - 1)} disabled={currentFrameIndex === project.frames.length - 1}>▶|</button>
              <span className="action-divider dark" />
              <label className="frame-number-control" title="Current frame">
                <span>FRAME</span>
                <input aria-label="Current frame number" type="number" min="1" max={project.frames.length} value={currentFrameIndex + 1} onChange={(event) => goToFrame(Number(event.currentTarget.value) - 1)} />
              </label>
              <label className="fps-control">
                <span>FPS</span>
                <select value={project.fps} onChange={changeFrameRate} aria-label="Frames per second">
                  {[6, 8, 12, 15, 18, 24, 30, 60].map((fps) => (
                    <option value={fps} key={fps}>{fps}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="loop-button"
                aria-pressed={project.loop}
                title={project.loop ? "Loop playback is on" : "Loop playback is off"}
                onClick={() => commitProject({ ...project, loop: !project.loop })}
              >
                LOOP <span className={`loop-indicator ${project.loop ? "on" : ""}`} />
              </button>
              <span className="action-divider dark" />
              <label className="range-control" title="Playback start frame">
                <span>IN</span>
                <input aria-label="Playback start frame" type="number" min="1" max={project.frames.length} value={playbackStart + 1} onChange={(event) => setPlaybackStart(Math.max(0, Math.min(playbackEnd, Number(event.currentTarget.value) - 1)))} />
              </label>
              <label className="range-control" title="Playback end frame">
                <span>OUT</span>
                <input aria-label="Playback end frame" type="number" min="1" max={project.frames.length} value={playbackEnd + 1} onChange={(event) => setPlaybackEnd(Math.min(project.frames.length - 1, Math.max(playbackStart, Number(event.currentTarget.value) - 1)))} />
              </label>
              <button type="button" className="timeline-icon-action" title="Zoom timeline out" aria-label="Zoom timeline out" onClick={() => setTimelineZoom((value) => Math.max(0.6, Number((value - 0.2).toFixed(1))))}>−</button>
              <button type="button" className="timeline-icon-action" title="Zoom timeline in" aria-label="Zoom timeline in" onClick={() => setTimelineZoom((value) => Math.min(2.5, Number((value + 0.2).toFixed(1))))}>＋</button>
              <button type="button" className="timeline-icon-action" title="Move frame earlier" aria-label="Move frame earlier" onClick={() => moveFrame(-1)} disabled={currentFrameIndex === 0}>
                <MoveUp size={15} />
              </button>
              <button type="button" className="timeline-icon-action" title="Move frame later" aria-label="Move frame later" onClick={() => moveFrame(1)} disabled={currentFrameIndex === project.frames.length - 1}>
                <MoveDown size={15} />
              </button>
              <button type="button" className="timeline-icon-action" title="Duplicate frame (Shift+D)" aria-label="Duplicate frame" onClick={() => addFrame(true)}>
                <Copy size={15} />
              </button>
              <button type="button" className="timeline-icon-action" title="Delete current frame" aria-label="Delete current frame" onClick={deleteFrame}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div className="timeline-strip">
            <div className="frame-ruler">
              <span className="ruler-layer-label"><Layers size={13} /> CEL</span>
              <div className="ruler-cells" ref={timelineRef} style={{ "--timeline-scale": timelineZoom } as CSSProperties}>
                {project.frames.map((frame, index) => (
                  <button
                    type="button"
                    key={frame.id}
                    data-frame-id={frame.id}
                    className={`frame-cell ${frame.id === currentFrameId ? "selected" : ""}`}
                    aria-label={`Select frame ${index + 1}`}
                    aria-pressed={frame.id === currentFrameId}
                    onClick={() => {
                      setCurrentFrameId(frame.id);
                      setPlaying(false);
                    }}
                  >
                    <span className="frame-cell-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="frame-thumbnail">
                      <FrameThumbnail project={project} frameIndex={index} />
                    </span>
                    {frame.id === currentFrameId && <span className="frame-playhead" />}
                  </button>
                ))}
                <button
                  type="button"
                  className="new-frame-cell"
                  aria-label="Add blank frame"
                  title="Add a blank frame (F)"
                  onClick={() => addFrame(false)}
                >
                  <Plus size={20} />
                  <span>New frame</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="inspector" aria-label="Brush and layer settings">
          <div className="inspector-tabs">
            <span className="inspector-tab active"><Brush size={15} /> Brush & Layers</span>
          </div>
          <div className="inspector-content">
            <section className="inspector-section">
              <div className="section-heading">
                <div>
                  <h2>Brush presets</h2>
                  <span>Pick a starting point</span>
                </div>
                <Sparkles size={16} className="section-accent" />
              </div>
              <div className="preset-list">
                {presets.map((preset) => (
                  <div className="preset-wrap" key={preset.id}>
                    <button
                      type="button"
                      className={`preset-button ${activePresetId === preset.id ? "selected" : ""}`}
                      aria-pressed={activePresetId === preset.id}
                      onClick={() => selectPreset(preset)}
                    >
                      <span className={`preset-swatch ${preset.brush}`}>
                        <span style={{ width: `${Math.min(22, Math.max(4, preset.size))}px` }} />
                      </span>
                      <span className="preset-label">{preset.name}</span>
                      <span className="preset-size">{preset.size}px</span>
                    </button>
                    {!DEFAULT_PRESETS.some((item) => item.id === preset.id) && (
                      <button
                        type="button"
                        className="preset-delete"
                        aria-label={`Delete ${preset.name} preset`}
                        title={`Delete ${preset.name}`}
                        onClick={() => deletePreset(preset.id)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="inspector-section brush-settings">
              <div className="section-heading compact">
                <div>
                  <h2>{tool === "fill" ? "Fill settings" : "Brush settings"}</h2>
                  <span>{tool === "fill" ? "Bucket fill" : tool === "eraser" ? "Eraser uses the same size" : selectedBrush}</span>
                </div>
              </div>
              <label className="control-label" htmlFor="brush-type">Tip</label>
              <select
                id="brush-type"
                value={selectedBrush}
                onChange={(event) => {
                  setSelectedBrush(event.currentTarget.value as BrushKind);
                  setActivePresetId("");
                }}
              >
                <option value="pencil">Graphite pencil</option>
                <option value="ink">Studio ink</option>
                <option value="marker">Marker wash</option>
              </select>
              <div className="slider-control">
                <label htmlFor="brush-size">Size <span>{size}px</span></label>
                <input
                  id="brush-size"
                  type="range"
                  min="1"
                  max="72"
                  value={size}
                  onChange={(event) => {
                    setSize(Number(event.currentTarget.value));
                    setActivePresetId("");
                  }}
                />
              </div>
              <div className="slider-control">
                <label htmlFor="brush-opacity">Flow <span>{opacity}%</span></label>
                <input
                  id="brush-opacity"
                  type="range"
                  min="5"
                  max="100"
                  value={opacity}
                  onChange={(event) => {
                    setOpacity(Number(event.currentTarget.value));
                    setActivePresetId("");
                  }}
                />
              </div>
              <div className="slider-control">
                <label htmlFor="brush-stabilization">Stabilization <span>{stabilization}%</span></label>
                <input
                  id="brush-stabilization"
                  type="range"
                  min="0"
                  max="90"
                  value={stabilization}
                  onChange={(event) => {
                    setStabilization(Number(event.currentTarget.value));
                    setActivePresetId("");
                  }}
                />
              </div>
              <div className="brush-bottom-row">
                <label className="color-control" htmlFor="brush-color">
                  <span className="control-label">Ink color</span>
                  <span className="color-input-wrap">
                    <input
                      id="brush-color"
                      aria-label="Brush color"
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.currentTarget.value)}
                    />
                    <span>{color.toUpperCase()}</span>
                  </span>
                </label>
                <label className="pressure-toggle">
                  <input
                    type="checkbox"
                    checked={pressure}
                    onChange={(event) => setPressure(event.currentTarget.checked)}
                  />
                  <span className="custom-check"><Check size={11} /></span>
                  Pressure
                </label>
              </div>
              <div className="save-brush-row">
                <input
                  aria-label="New brush preset name"
                  placeholder="Name this brush"
                  maxLength={28}
                  value={presetName}
                  onChange={(event) => setPresetName(event.currentTarget.value)}
                />
                <button type="button" onClick={savePreset} title="Save current settings as a custom brush">
                  <Plus size={15} />
                  Save
                </button>
              </div>
            </section>

            {tool === "fill" && (
              <section className="inspector-section fill-settings">
                <div className="section-heading compact">
                  <div>
                    <h2>Fill settings</h2>
                    <span>Bucket & color controls</span>
                  </div>
                  <PaintBucket size={16} className="section-accent" />
                </div>
                <div className="fill-palette" aria-label="Fill color palette">
                  {["#263b3b","#000000","#ffffff","#df7657","#e4a11b","#e05b8a","#7a5cff","#3c82f6","#35a66f","#9b6b43"].map((swatch) => (
                    <button key={swatch} type="button" aria-label={`Fill color ${swatch}`} className={`fill-swatch ${color.toLowerCase() === swatch ? "selected" : ""}`} style={{ background: swatch }} onClick={() => setColor(swatch)} />
                  ))}
                </div>
                <label className="color-control" htmlFor="fill-color">
                  <span className="control-label">Fill color</span>
                  <span className="color-input-wrap">
                    <input id="fill-color" aria-label="Fill color" type="color" value={color} onChange={(event) => setColor(event.currentTarget.value)} />
                    <input aria-label="Fill hex color" className="fill-hex-input" value={color.toUpperCase()} maxLength={7} onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (/^#[\da-f]{0,6}$/i.test(value)) setColor(value);
                    }} onBlur={() => { if (!/^#[\da-f]{6}$/i.test(color)) setColor("#263b3b"); }} />
                  </span>
                </label>
                <div className="slider-control">
                  <label htmlFor="fill-opacity">Opacity <span>{fillOpacity}%</span></label>
                  <input id="fill-opacity" type="range" min="1" max="100" value={fillOpacity} onChange={(event) => setFillOpacity(Number(event.currentTarget.value))} />
                </div>
                <div className="slider-control">
                  <label htmlFor="fill-tolerance">Tolerance <span>{fillTolerance}</span></label>
                  <input id="fill-tolerance" type="range" min="0" max="100" value={fillTolerance} onChange={(event) => setFillTolerance(Number(event.currentTarget.value))} />
                </div>
                <div className="slider-control">
                  <label htmlFor="fill-gap">Close gaps <span>{fillGap}px</span></label>
                  <input id="fill-gap" type="range" min="0" max="24" value={fillGap} onChange={(event) => setFillGap(Number(event.currentTarget.value))} />
                </div>
                <label className="control-label" htmlFor="fill-mode">Fill mode</label>
                <select id="fill-mode" value={fillMode} onChange={(event) => setFillMode(event.currentTarget.value as "contiguous" | "all")}>
                  <option value="contiguous">Current layer</option>
                  <option value="all">All visible layers</option>
                </select>
                <label className="pressure-toggle">
                  <input type="checkbox" checked={fillPreserveAlpha} onChange={(event) => setFillPreserveAlpha(event.currentTarget.checked)} />
                  <span className="custom-check"><Check size={11} /></span>
                  Preserve alpha
                </label>
                <div className="fill-hint">Click inside a closed outline. <kbd>G</kbd> activates Fill.</div>
              </section>
            )}

            <section className="inspector-section layers-section">
              <div className="section-heading layers-heading">
                <div>
                  <h2>Layers</h2>
                  <span>{project.layers.length} drawing {project.layers.length === 1 ? "layer" : "layers"}</span>
                </div>
                <button
                  type="button"
                  className="add-layer-button"
                  aria-label="Add layer"
                  title="Add a drawing layer"
                  onClick={addLayer}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="layer-list">
                {[...project.layers].reverse().map((layer) => (
                  <LayerRow
                    key={layer.id}
                    layer={layer}
                    selected={activeLayerId === layer.id}
                    onSelect={() => setActiveLayerId(layer.id)}
                    onChange={(change) => changeLayer(layer.id, change)}
                    onMove={(direction) => moveLayer(layer.id, direction)}
                    onDelete={() => deleteLayer(layer.id)}
                    onRename={(name) => renameLayer(layer.id, name)}
                    menuOpen={openLayerMenuId === layer.id}
                    onToggleMenu={() => setOpenLayerMenuId((id) => id === layer.id ? null : layer.id)}
                    canDelete={project.layers.length > 1}
                    atTop={project.layers.at(-1)?.id === layer.id}
                    atBottom={project.layers[0]?.id === layer.id}
                  />
                ))}
              </div>
              {activeLayer && (
                <div className="layer-opacity">
                  <label htmlFor="layer-opacity">Layer opacity <span>{activeLayer.opacity}%</span></label>
                  <input
                    id="layer-opacity"
                    type="range"
                    min="5"
                    max="100"
                    value={activeLayer.opacity}
                    onChange={(event) => changeLayer(activeLayer.id, { opacity: Number(event.currentTarget.value) })}
                  />
                </div>
              )}
            </section>
          </div>
        </aside>
      </section>

      <footer className={`statusbar ${status.kind}`}>
        <span className="status-indicator" />
        <span className="status-message" role="status" aria-live="polite">{status.text}</span>
        <span className="status-spacer" />
        <span className="shortcut-hint"><kbd>Space</kbd> play</span>
        <span className="shortcut-hint"><kbd>F</kbd> new frame</span>
        <span className="shortcut-hint"><kbd>Ctrl Z</kbd> undo</span>
        <span className="status-dim">{project.fps} FPS</span>
      </footer>

      {modal === "export" && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !exporting && setModal(null)}>
          <section className="modal-card export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
            <button className="modal-close" type="button" aria-label="Close export dialog" disabled={exporting} onClick={() => setModal(null)}>
              <X size={18} />
            </button>
            <div className="modal-icon"><Download size={21} /></div>
            <h2 id="export-title">Export animation</h2>
            <p>Choose a delivery format for <strong>{project.title || "Untitled animation"}</strong>.</p>
            <div className="export-options">
              <button type="button" className="export-option" disabled={exporting} onClick={() => void exportAction("gif")}>
                <span className="export-option-icon gif-icon">GIF</span>
                <span><strong>Animated GIF</strong><small>Looping preview · warm paper background</small></span>
                <Download size={16} />
              </button>
              <button type="button" className="export-option" disabled={exporting} onClick={() => void exportAction("png")}>
                <span className="export-option-icon png-icon">PNG</span>
                <span><strong>PNG sequence</strong><small>Numbered frames packed in a ZIP</small></span>
                <Download size={16} />
              </button>
              <button type="button" className="export-option" disabled={exporting} onClick={() => void exportAction("project")}>
                <span className="export-option-icon project-icon">CF</span>
                <span><strong>Editable project</strong><small>Save artwork and layers as .celframe.json</small></span>
                <Download size={16} />
              </button>
            </div>
            <label className="export-transparency">
              <input
                type="checkbox"
                checked={transparentExport}
                onChange={(event) => setTransparentExport(event.currentTarget.checked)}
              />
              <span className="custom-check"><Check size={11} /></span>
              Transparent background for PNG frames
            </label>
            {exporting && <div className="export-progress"><span className="progress-spinner" />{status.text}</div>}
            <div className="modal-footnote">Exports use {project.width} × {project.height} px at {project.fps} FPS. GIF is limited to 60 million pixels per export.</div>
          </section>
        </div>
      )}

      {modal === "shortcuts" && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <section className="modal-card shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
            <button className="modal-close" type="button" aria-label="Close shortcuts" onClick={() => setModal(null)}>
              <X size={18} />
            </button>
            <div className="modal-icon"><CircleHelp size={21} /></div>
            <h2 id="shortcuts-title">Keyboard shortcuts</h2>
            <p>Keep your hand on the drawing and move through the animation quickly.</p>
            <div className="shortcut-list">
              <ShortcutRow label="Brush tool" keys={["B"]} />
              <ShortcutRow label="Eraser tool" keys={["E"]} />
              <ShortcutRow label="Play / pause" keys={["Space"]} />
              <ShortcutRow label="Previous / next frame" keys={["[", "]"]} />
              <ShortcutRow label="First / last frame" keys={["Home", "End"]} />
              <ShortcutRow label="Playback range" keys={["Shift", "← / →"]} />
              <ShortcutRow label="Add blank frame" keys={["F"]} />
              <ShortcutRow label="Duplicate frame" keys={["Shift", "D"]} />
              <ShortcutRow label="Undo / redo" keys={["Ctrl", "Z"]} />
              <ShortcutRow label="Zoom" keys={["+", "−"]} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function LayerRow({
  layer,
  selected,
  onSelect,
  onChange,
  onMove,
  onDelete,
  onRename,
  menuOpen,
  onToggleMenu,
  canDelete,
  atTop,
  atBottom,
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onChange: (change: Partial<Layer>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  canDelete: boolean;
  atTop: boolean;
  atBottom: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) nameInputRef.current?.select();
    else setNameDraft(layer.name);
  }, [layer.name, renaming]);

  const finishRename = () => {
    const name = nameDraft.trim();
    if (name && name !== layer.name) onRename(name);
    else setNameDraft(layer.name);
    setRenaming(false);
  };

  return (
    <div className={`layer-row ${selected ? "selected" : ""}`}>
      <button type="button" className="layer-thumbnail-button" onClick={onSelect} aria-label={`Select ${layer.name}`} aria-pressed={selected}>
        <span className={`layer-thumbnail ${layer.visible ? "" : "hidden"}`}><span /></span>
      </button>
      {renaming ? (
        <input
          ref={nameInputRef}
          className="layer-name-input"
          aria-label="Layer name"
          maxLength={40}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.currentTarget.value)}
          onBlur={finishRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") finishRename();
            if (event.key === "Escape") {
              setNameDraft(layer.name);
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="layer-name-button"
          onClick={onSelect}
          onDoubleClick={() => setRenaming(true)}
          title={`${layer.name} — double-click to rename`}
          aria-pressed={selected}
        >
          <span className="layer-name">{layer.name}</span>
        </button>
      )}
      <button
        type="button"
        className={`layer-action ${layer.visible ? "" : "muted"}`}
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
        title={layer.visible ? "Hide layer" : "Show layer"}
        onClick={() => onChange({ visible: !layer.visible })}
      >
        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        type="button"
        className={`layer-action ${layer.locked ? "locked" : ""}`}
        aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
        title={layer.locked ? "Unlock layer" : "Lock layer"}
        onClick={() => onChange({ locked: !layer.locked })}
      >
        {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>
      <div className="layer-overflow">
        <button
          type="button"
          className="layer-action"
          aria-label={`More options for ${layer.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Layer options"
          onClick={() => {
            onSelect();
            onToggleMenu();
          }}
        >
          <span className="layer-more-dots">•••</span>
        </button>
        {menuOpen && (
          <div className="layer-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => {
              setRenaming(true);
              onToggleMenu();
            }}><Layers size={13} /> Rename layer</button>
            <button type="button" role="menuitem" onClick={() => onMove(1)} disabled={atTop}><MoveUp size={13} /> Move up</button>
            <button type="button" role="menuitem" onClick={() => onMove(-1)} disabled={atBottom}><MoveDown size={13} /> Move down</button>
            <button type="button" role="menuitem" onClick={onDelete} disabled={!canDelete} className="delete-layer-action"><Trash2 size={13} /> Delete layer</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="shortcut-row">
      <span>{label}</span>
      <span className="shortcut-keys">
        {keys.map((key, index) => (
          <span key={`${key}-${index}`}>
            {index > 0 && <i>+</i>}
            <kbd>{key}</kbd>
          </span>
        ))}
      </span>
    </div>
  );
}

export default App;
