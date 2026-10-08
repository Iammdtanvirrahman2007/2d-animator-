import JSZip from "jszip";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { drawExportFrame, type AnimationProject } from "./animation";

export type ExportProgress = (message: string) => void;

function renderCanvas(project: AnimationProject, frameIndex: number, transparent: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not create an export canvas.");
  drawExportFrame(context, project, frameIndex, transparent ? null : "#faf9f4");
  return canvas;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(title: string): string {
  const cleaned = title.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return cleaned || "untitled-animation";
}

export function downloadProject(project: AnimationProject): void {
  const file = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  downloadBlob(file, `${safeFilename(project.title)}.celframe.json`);
}

export async function exportPngSequence(
  project: AnimationProject,
  transparent: boolean,
  onProgress: ExportProgress,
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`${safeFilename(project.title)}-frames`);
  if (!folder) throw new Error("Could not prepare the PNG sequence archive.");

  for (let index = 0; index < project.frames.length; index += 1) {
    onProgress(`Rendering frame ${index + 1} of ${project.frames.length}…`);
    const canvas = renderCanvas(project, index, transparent);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error(`Frame ${index + 1} could not be encoded as PNG.`));
      }, "image/png");
    });
    folder.file(`frame-${String(index + 1).padStart(4, "0")}.png`, blob);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  onProgress("Packing PNG sequence…");
  const archive = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 4 } },
    (metadata) => onProgress(`Packing PNG sequence… ${Math.round(metadata.percent)}%`),
  );
  downloadBlob(archive, `${safeFilename(project.title)}-frames.zip`);
}

export async function exportGif(
  project: AnimationProject,
  onProgress: ExportProgress,
): Promise<void> {
  const pixelCount = project.width * project.height * project.frames.length;
  if (pixelCount > 60_000_000) {
    throw new Error("This animation is too large for a GIF export in one pass. Export a PNG sequence instead.");
  }

  let samplePixels: number[] = [];

  for (let index = 0; index < project.frames.length; index += 1) {
    onProgress(`Sampling GIF frame ${index + 1} of ${project.frames.length}…`);
    const canvas = renderCanvas(project, index, false);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not read an export frame.");
    const data = context.getImageData(0, 0, project.width, project.height);

    const stride = Math.max(1, Math.floor(data.data.length / 12000 / 4));
    for (let pixel = 0; pixel < data.data.length && samplePixels.length < 240_000; pixel += stride * 4) {
      samplePixels.push(data.data[pixel], data.data[pixel + 1], data.data[pixel + 2], data.data[pixel + 3]);
    }
    canvas.width = 0;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  onProgress("Building the shared color palette…");
  const palette = quantize(new Uint8Array(samplePixels), 256);
  const encoder = GIFEncoder();
  for (let index = 0; index < project.frames.length; index += 1) {
    onProgress(`Encoding GIF frame ${index + 1} of ${project.frames.length}…`);
    const canvas = renderCanvas(project, index, false);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not read an export frame.");
    const data = context.getImageData(0, 0, project.width, project.height);
    const indexed = applyPalette(data.data, palette);
    encoder.writeFrame(indexed, project.width, project.height, {
      palette: index === 0 ? palette : undefined,
      delay: Math.max(20, Math.round(1000 / project.fps)),
      repeat: index === 0 ? (project.loop ? 0 : -1) : 0,
      transparent: false,
    });
    canvas.width = 0;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }

  encoder.finish();
  downloadBlob(new Blob([encoder.bytes()], { type: "image/gif" }), `${safeFilename(project.title)}.gif`);
}
