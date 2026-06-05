import "./styles.css";
import CanvasKitInit from "canvaskit-wasm";
import { createPixiApp } from "./pixi/createPixiApp";
import { addRandomShape } from "./scene/addRandomShape";
import { createInitialScene } from "./scene/createInitialScene";
import { SkiaContainerRenderer } from "./skia/SkiaContainerRenderer";
import { SkiaPointerBridge } from "./skia/SkiaPointerBridge";

const pixiHostElement = document.querySelector<HTMLDivElement>("#pixi-host");
const skiaCanvasElement =
  document.querySelector<HTMLCanvasElement>("#skia-canvas");
const statusTextElement =
  document.querySelector<HTMLParagraphElement>("#status-text");
const addShapeButtonElement =
  document.querySelector<HTMLButtonElement>("#add-shape-button");

if (
  !pixiHostElement ||
  !skiaCanvasElement ||
  !statusTextElement ||
  !addShapeButtonElement
) {
  throw new Error("Vectorloom Studio UI is missing required elements.");
}

const pixiHost = pixiHostElement;
const skiaCanvas = skiaCanvasElement;
const statusText = statusTextElement;
const addShapeButton = addShapeButtonElement;

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
