import "./styles.css";
import CanvasKitInit from "canvaskit-wasm";
import * as PIXI from "pixi.js-legacy";

const SCENE_WIDTH = 720;
const SCENE_HEIGHT = 480;

const pixiHost = document.querySelector<HTMLDivElement>("#pixi-host");
const skiaCanvas = document.querySelector<HTMLCanvasElement>("#skia-canvas");
const statusText = document.querySelector<HTMLParagraphElement>("#status-text");
const addShapeButton =
  document.querySelector<HTMLButtonElement>("#add-shape-button");

if (!pixiHost || !skiaCanvas || !statusText || !addShapeButton) {
  throw new Error("Vectorloom Studio UI is missing required elements.");
}

const app = new PIXI.Application<HTMLCanvasElement>({
  width: SCENE_WIDTH,
  height: SCENE_HEIGHT,
  backgroundColor: 0xffffff,
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1,
  forceCanvas: true,
});

pixiHost.appendChild(app.view);

const scene = new PIXI.Container();
app.stage.addChild(scene);

function createInitialPixiScene(): void {
  const grid = new PIXI.Graphics();
  grid.lineStyle(1, 0xdce2e8, 1);

  for (let x = 0; x <= SCENE_WIDTH; x += 40) {
    grid.moveTo(x, 0);
    grid.lineTo(x, SCENE_HEIGHT);
  }

  for (let y = 0; y <= SCENE_HEIGHT; y += 40) {
    grid.moveTo(0, y);
    grid.lineTo(SCENE_WIDTH, y);
  }

  scene.addChild(grid);

  const rect = new PIXI.Graphics();
  rect.beginFill(0x17c3b2, 0.85);
  rect.lineStyle(4, 0x0f6373, 1);
  rect.drawRect(-70, -42, 140, 84);
  rect.endFill();
  rect.position.set(210, 180);
  rect.rotation = -0.18;
  rect.scale.set(1.15, 1);
  rect.eventMode = "static";
  rect.cursor = "pointer";
  scene.addChild(rect);

  const line = new PIXI.Graphics();
  line.lineStyle(8, 0xffcb77, 1);
  line.moveTo(0, 0);
  line.lineTo(120, 40);
  line.lineTo(190, -36);
  line.position.set(350, 300);
  line.rotation = 0.25;
  scene.addChild(line);

  rect.on("pointerdown", () => {
    statusText.textContent = "Pixi pointerDown on rectangle";
  });

  rect.on("pointerup", () => {
    statusText.textContent = "Pixi pointerUp on rectangle";
  });
}

function addRandomPixiShape(): void {
  const graphic = new PIXI.Graphics();
  const color = [0x227c9d, 0x17c3b2, 0xffcb77, 0xfe6d73][
    Math.floor(Math.random() * 4)
  ];

  graphic.beginFill(color, 0.72);
  graphic.lineStyle(3, 0x17202a, 0.65);

  const width = 40 + Math.random() * 120;
  const height = 30 + Math.random() * 90;

  graphic.drawRect(-width / 2, -height / 2, width, height);
  graphic.endFill();

  graphic.position.set(
    80 + Math.random() * (SCENE_WIDTH - 160),
    80 + Math.random() * (SCENE_HEIGHT - 160),
  );
  graphic.rotation = Math.random() * Math.PI;
  graphic.scale.set(0.75 + Math.random() * 0.8);

  scene.addChild(graphic);
  renderSkiaPreview();

  statusText.textContent = "Random Pixi shape added";
}

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

  renderSkiaPreview = () => {
    const canvas = surface.getCanvas();

    canvas.clear(CanvasKit.Color(255, 255, 255, 1));

    const paint = new CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(CanvasKit.PaintStyle.Fill);
    paint.setColor(CanvasKit.Color(34, 124, 157, 1));

    canvas.drawRect(CanvasKit.LTRBRect(80, 80, 280, 180), paint);

    paint.setStyle(CanvasKit.PaintStyle.Stroke);
    paint.setStrokeWidth(6);
    paint.setColor(CanvasKit.Color(23, 195, 178, 1));

    const path = new CanvasKit.Path();
    path.moveTo(340, 270);
    path.lineTo(460, 310);
    path.lineTo(540, 230);
    canvas.drawPath(path, paint);

    path.delete();
    paint.delete();

    surface.flush();
  };

  renderSkiaPreview();
  statusText.textContent = "Pixi and Skia canvases are ready";
}

createInitialPixiScene();
addShapeButton.addEventListener("click", addRandomPixiShape);

bootSkia().catch((error: unknown) => {
  console.error(error);
  statusText.textContent = "Skia failed to start. Check the browser console.";
});
