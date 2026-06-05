# Vectorloom Studio

Vectorloom Studio is a TypeScript prototype that bridges PixiJS scene composition with Skia CanvasKit rendering and vector-first PDF export.

The project is built as a working graphics tool prototype rather than a static demo: PixiJS owns the interactive scene graph, Skia renders the Pixi container into a second canvas, and the export layer converts Pixi graphics into vector PDF commands.

## What It Does

- Creates a PixiJS canvas application with `forceCanvas: true`.
- Uses `pixi.js-legacy@7.2.4`.
- Renders a `PIXI.Container` into a Skia CanvasKit canvas through a custom TypeScript renderer.
- Supports transformed `PIXI.Graphics` objects:
  - translation
  - rotation
  - scaling
  - rectangles
  - paths built from `moveTo` / `lineTo`
- Supports `PIXI.Sprite` PNG rendering in Skia as bitmap content.
- Supports `pointerDown` and `pointerUp` on both:
  - Pixi canvas
  - Skia canvas through a custom hit-test bridge
- Adds random shapes interactively.
- Exports vector PDF output from the Pixi scene.
- Includes a Skia PDF backend integration layer for custom CanvasKit wasm builds.

## Current Backend Status

Vectorloom Studio currently has two PDF export paths:

1. `SimpleVectorPdfExporter`
   - Works in the browser today.
   - Exports Pixi graphics as vector PDF paths.
   - Does not rasterize the whole canvas.
   - Sprites are intentionally excluded at this stage.

2. `SkiaPdfExporter`
   - Integration layer for a custom CanvasKit wasm build with Skia PDF backend enabled.
   - Uses a `MakePDFDocument`-style API.
   - Falls back automatically when the standard npm CanvasKit build does not expose PDF document creation.

The standard `canvaskit-wasm` npm package is used for browser preview rendering. A custom wasm build is required for direct Skia PDF backend export.

## Tech Stack

- TypeScript
- Vite
- PixiJS Legacy `7.2.4`
- CanvasKit wasm
- Skia rendering concepts
- Browser-native PDF download

## Project Structure

```text
src/
  export/
    PdfSceneModel.ts
    PixiSceneReader.ts
    SimpleVectorPdfExporter.ts
    SkiaPdfExporter.ts
  pixi/
    createPixiApp.ts
  scene/
    addRandomShape.ts
    createInitialScene.ts
  skia/
    SkiaContainerRenderer.ts
    SkiaPointerBridge.ts
  main.ts
  styles.css

public/
  assets/
    vectorloom-sprite.png
  canvaskit/
    canvaskit.wasm

scripts/
  copy-canvaskit.mjs
  create-sprite-asset.mjs


```

Run Locally
Install dependencies:

npm install

Start the development server:

npm run dev
Build production output:

npm run build
Preview the production build:

npm run preview

How To Test

1. Open the local Vite URL.
2. Confirm that both canvases are visible:

- Pixi canvas on the left
- Skia CanvasKit canvas on the right

3. Click Generate shape.
4. Confirm that the new shape appears on both canvases.
5. Click shapes on the Pixi canvas and confirm the status text changes.
6. Click shapes on the Skia canvas and confirm the status text changes.
7. Click Export PDF.
8. Open the downloaded vectorloom-scene.pdf.
9. Confirm that the graphics are vector paths, not a raster screenshot.

Vercel Deployment
This project can be deployed as a Vite application.

Recommended Vercel settings:

Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install

The CanvasKit wasm file is copied into public/canvaskit/canvaskit.wasm by the postinstall script.

Skia PDF Backend Notes
Skia's PDF backend is based on document/page creation rather than normal canvas preview rendering. In native Skia this is handled through PDF document APIs such as SkDocument and a PDF canvas page.

For this prototype, the application includes SkiaPdfExporter as the integration boundary for a custom CanvasKit wasm build that exposes PDF document creation. This keeps the architecture ready for a real Skia PDF backend without mixing PDF logic into the Pixi scene reader or Skia preview renderer.

Roadmap
Add custom CanvasKit wasm build with PDF backend enabled.
Embed PIXI.Sprite PNG images into PDF output as bitmap objects.
Add richer Pixi graphics support:
circles
ellipses
bezier curves
line caps and joins
Add scene presets and container switching.
Add visual selection state shared between Pixi and Skia views.
Add automated screenshot tests for renderer parity.
License
MIT
