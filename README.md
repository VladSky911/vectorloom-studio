# Vectorloom Studio

Vectorloom Studio is a TypeScript prototype that renders PixiJS containers through a custom Skia CanvasKit bridge and exports the scene to vector PDF through Skia's PDF backend.

## Goals

- PixiJS 7.2.4 legacy canvas application.
- Custom TypeScript bridge from `PIXI.Container` to Skia CanvasKit.
- Support for transformed graphics and sprites.
- Pointer events on both Pixi and Skia canvases.
- Vector-first PDF export, with sprites embedded as bitmap images.
- Modern test UI for scene generation, preview, and export.

## Status

Work in progress.
