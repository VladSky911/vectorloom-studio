import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(root, "..");

const source = resolve(
  projectRoot,
  "node_modules",
  "canvaskit-wasm",
  "bin",
  "canvaskit.wasm",
);

const targetDir = resolve(projectRoot, "public", "canvaskit");
const target = resolve(targetDir, "canvaskit.wasm");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

console.log("CanvasKit wasm copied to public/canvaskit/canvaskit.wasm");
