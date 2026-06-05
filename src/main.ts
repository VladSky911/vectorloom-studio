import "./styles.css";
import CanvasKitInit from "canvaskit-wasm";
import { createPixiApp } from "./pixi/createPixiApp";
import { addRandomShape } from "./scene/addRandomShape";
import { createInitialScene } from "./scene/createInitialScene";
import { SkiaContainerRenderer } from "./skia/SkiaContainerRenderer";

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

const scene = createInitialScene(statusText);
app.stage.addChild(scene);

let renderSkiaPreview = (): void => {
  statusText.textContent = "Skia renderer is still loading...";
};

async function bootSkia(): Promise<void> {
  const CanvasKit = await CanvasKitInit({
    locateFile: (file) => `/canvaskit/${file}`,
  });

  const surface = CanvasKit.MakeCanvasSurface(skiaCanvas);

  if (!surface) {
    throw new Error("Unable to create CanvasKit surface.");
  }

  const renderer = new SkiaContainerRenderer(CanvasKit, surface);

  renderSkiaPreview = () => {
    renderer.render(scene);
  };

  renderSkiaPreview();
  statusText.textContent = "Pixi container is rendered through Skia";
}

addShapeButton.addEventListener("click", () => {
  addRandomShape(scene);
  renderSkiaPreview();
  statusText.textContent = "Random shape added and rendered through Skia";
});

bootSkia().catch((error: unknown) => {
  console.error(error);
  statusText.textContent = "Skia failed to start. Check the browser console.";
});
