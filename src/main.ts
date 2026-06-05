import "./styles.css";
import CanvasKitInit from "canvaskit-wasm";
import { PixiSceneReader } from "./export/PixiSceneReader";
import { SimpleVectorPdfExporter } from "./export/SimpleVectorPdfExporter";
import { createPixiApp } from "./pixi/createPixiApp";
import { addRandomShape } from "./scene/addRandomShape";
import { createInitialScene } from "./scene/createInitialScene";
import { SkiaContainerRenderer } from "./skia/SkiaContainerRenderer";
import { SkiaPointerBridge } from "./skia/SkiaPointerBridge";
import { SkiaPdfExporter } from "./export/SkiaPdfExporter";

const pixiHostElement = document.querySelector<HTMLDivElement>("#pixi-host");
const skiaCanvasElement =
  document.querySelector<HTMLCanvasElement>("#skia-canvas");
const statusTextElement =
  document.querySelector<HTMLParagraphElement>("#status-text");
const addShapeButtonElement =
  document.querySelector<HTMLButtonElement>("#add-shape-button");
const exportPdfButtonElement =
  document.querySelector<HTMLButtonElement>("#export-pdf-button");

if (
  !pixiHostElement ||
  !skiaCanvasElement ||
  !statusTextElement ||
  !addShapeButtonElement ||
  !exportPdfButtonElement
) {
  throw new Error("Vectorloom Studio UI is missing required elements.");
}

const pixiHost = pixiHostElement;
const skiaCanvas = skiaCanvasElement;
const statusText = statusTextElement;
const addShapeButton = addShapeButtonElement;
const exportPdfButton = exportPdfButtonElement;

const app = createPixiApp();
pixiHost.appendChild(app.view);

let renderSkiaPreview = (): void => {
  statusText.textContent = "Skia renderer is still loading...";
};

async function boot(): Promise<void> {
  statusText.textContent = "Loading Pixi scene and Skia renderer...";

  const scene = await createInitialScene(statusText);
  app.stage.addChild(scene);

  const CanvasKit = await CanvasKitInit({
    locateFile: (file) => `/canvaskit/${file}`,
  });

  const surface = CanvasKit.MakeCanvasSurface(skiaCanvas);

  if (!surface) {
    throw new Error("Unable to create CanvasKit surface.");
  }

  const renderer = new SkiaContainerRenderer(CanvasKit, surface);

  const pointerBridge = new SkiaPointerBridge(skiaCanvas, scene, {
    onPointerDown: (object) => {
      statusText.textContent = `Skia pointerDown on ${object.constructor.name}`;
    },
    onPointerUp: (object) => {
      statusText.textContent = `Skia pointerUp on ${object.constructor.name}`;
    },
  });

  pointerBridge.bind();

  const sceneReader = new PixiSceneReader();
  const simplePdfExporter = new SimpleVectorPdfExporter();
  const skiaPdfExporter = new SkiaPdfExporter(CanvasKit);

  exportPdfButton.disabled = false;
  exportPdfButton.addEventListener("click", () => {
    const pdfScene = sceneReader.read(scene);
    const pdfBlob = skiaPdfExporter.isAvailable()
      ? skiaPdfExporter.export(pdfScene)
      : simplePdfExporter.export(pdfScene);

    const url = URL.createObjectURL(pdfBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "vectorloom-scene.pdf";
    link.click();

    URL.revokeObjectURL(url);

    statusText.textContent = skiaPdfExporter.isAvailable()
      ? "Vector PDF exported through Skia PDF backend"
      : "Vector PDF exported through fallback backend";
  });

  renderSkiaPreview = () => {
    renderer.render(scene);
  };

  addShapeButton.addEventListener("click", () => {
    addRandomShape(scene);
    renderSkiaPreview();
    statusText.textContent = "Random shape added and rendered through Skia";
  });

  renderSkiaPreview();
  statusText.textContent =
    "Pixi graphics and PNG sprite are rendered through Skia";
}

boot().catch((error: unknown) => {
  console.error(error);
  statusText.textContent =
    "Vectorloom Studio failed to start. Check the browser console.";
});
