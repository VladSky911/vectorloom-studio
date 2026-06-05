# Skia PDF WASM Backend

This folder contains the custom Skia PDF backend target for Vectorloom Studio.

The browser preview uses `canvaskit-wasm`, but strict PDF export requires a custom wasm module that exposes Skia's PDF document API.

## Required Build Environment

Use WSL2 Ubuntu or Linux.

Required tools:

- git
- python3
- ninja
- clang
- emscripten
- Skia source checkout

## Backend Contract

The wasm module must expose:

```ts
createVectorloomPdf(scene: unknown): Uint8Array

The scene is produced by PixiSceneReader.
The backend must use:
cpp



SkPDF::MakeDocument(...)

Graphics are exported as vector paths. Sprites are embedded as bitmap images.
StatusPrepared for strict assignment completion. The custom wasm build must be compiled and copied into:

public/skia-pdf/skia-pdf-backend.js
public/skia-pdf/skia-pdf-backend.wasm
```
