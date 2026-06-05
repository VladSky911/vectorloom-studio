import * as PIXI from "pixi.js-legacy";
import { SCENE_HEIGHT, SCENE_WIDTH } from "../pixi/createPixiApp";

export async function createInitialScene(
  statusText: HTMLParagraphElement,
): Promise<PIXI.Container> {
  const scene = new PIXI.Container();

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

  rect.on("pointerdown", () => {
    statusText.textContent = "Pixi pointerDown on rectangle";
  });

  rect.on("pointerup", () => {
    statusText.textContent = "Pixi pointerUp on rectangle";
  });

  scene.addChild(rect);

  const line = new PIXI.Graphics();
  line.lineStyle(8, 0xffcb77, 1);
  line.moveTo(0, 0);
  line.lineTo(120, 40);
  line.lineTo(190, -36);
  line.position.set(350, 300);
  line.rotation = 0.25;

  scene.addChild(line);

  const texture = PIXI.Texture.from("/assets/vectorloom-sprite.png");

  await new Promise<void>((resolve) => {
    if (texture.baseTexture.valid) {
      resolve();
      return;
    }

    texture.baseTexture.once("loaded", () => {
      resolve();
    });
  });

  const sprite = new PIXI.Sprite(texture);

  sprite.position.set(545, 145);
  sprite.anchor.set(0.5);
  sprite.scale.set(1.25);
  sprite.rotation = 0.18;
  sprite.alpha = 0.92;
  sprite.eventMode = "static";
  sprite.cursor = "pointer";

  sprite.on("pointerdown", () => {
    statusText.textContent = "Pixi pointerDown on PNG sprite";
  });

  sprite.on("pointerup", () => {
    statusText.textContent = "Pixi pointerUp on PNG sprite";
  });

  scene.addChild(sprite);

  return scene;
}
