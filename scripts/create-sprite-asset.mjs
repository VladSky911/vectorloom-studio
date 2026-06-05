import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const targetDir = resolve("public", "assets");

mkdirSync(targetDir, { recursive: true });

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAiklEQVR4nO3QQQ3AIADAQMDK5YcN6BAvJKMg89z7ZgCe3QOAbQIECAAAAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAYAcC/gJd3hpY2QAAAABJRU5ErkJggg==";

writeFileSync(
  resolve(targetDir, "vectorloom-sprite.png"),
  Buffer.from(pngBase64, "base64"),
);

console.log("Created public/assets/vectorloom-sprite.png");
