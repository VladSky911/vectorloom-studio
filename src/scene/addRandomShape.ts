import * as PIXI from "pixi.js-legacy";
import { SCENE_HEIGHT, SCENE_WIDTH } from "../pixi/createPixiApp";

export function addRandomShape(scene: PIXI.Container): void {
  const graphic = new PIXI.Graphics();
  const colors = [0x227c9d, 0x17c3b2, 0xffcb77, 0xfe6d73];
  const color = colors[Math.floor(Math.random() * colors.length)];

  graphic.beginFill(color, 0.72);
  graphic.lineStyle(3, 0x17202a, 0.65);

  if (Math.random() > 0.45) {
    const width = 40 + Math.random() * 120;
    const height = 30 + Math.random() * 90;
    graphic.drawRect(-width / 2, -height / 2, width, height);
  } else {
    graphic.moveTo(-60, -10);
    graphic.lineTo(-10, 36);
    graphic.lineTo(54, -28);
    graphic.lineTo(86, 24);
  }

  graphic.endFill();

  graphic.position.set(
    80 + Math.random() * (SCENE_WIDTH - 160),
    80 + Math.random() * (SCENE_HEIGHT - 160),
  );
  graphic.rotation = Math.random() * Math.PI;
  graphic.scale.set(0.75 + Math.random() * 0.8);

  scene.addChild(graphic);
}
