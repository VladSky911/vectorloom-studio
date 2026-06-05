import type { CanvasKit, Paint, Surface } from "canvaskit-wasm";
import * as PIXI from "pixi.js-legacy";

type SkCanvas = ReturnType<Surface["getCanvas"]>;
type SkImage = ReturnType<CanvasKit["MakeImageFromCanvasImageSource"]>;

export class SkiaContainerRenderer {
  private readonly imageCache = new WeakMap<PIXI.BaseTexture, SkImage>();

  constructor(
    private readonly CanvasKit: CanvasKit,
    private readonly surface: Surface,
  ) {}

  render(container: PIXI.Container): void {
    const canvas = this.surface.getCanvas();

    canvas.clear(this.CanvasKit.Color(255, 255, 255, 1));
    this.renderContainer(canvas, container);
    this.surface.flush();
  }

  private renderContainer(canvas: SkCanvas, container: PIXI.Container): void {
    for (const child of container.children) {
      if (!child.visible || child.alpha <= 0) {
        continue;
      }

      canvas.save();
      this.applyTransform(canvas, child);

      if (child instanceof PIXI.Graphics) {
        this.renderGraphics(canvas, child);
      }

      if (child instanceof PIXI.Sprite) {
        this.renderSprite(canvas, child);
      }

      if (child instanceof PIXI.Container) {
        this.renderContainer(canvas, child);
      }

      canvas.restore();
    }
  }

  private applyTransform(canvas: SkCanvas, object: PIXI.DisplayObject): void {
    object.updateTransform();

    const matrix = object.transform.localTransform;

    canvas.concat([
      matrix.a,
      matrix.c,
      matrix.tx,
      matrix.b,
      matrix.d,
      matrix.ty,
      0,
      0,
      1,
    ]);
  }

  private renderGraphics(canvas: SkCanvas, graphics: PIXI.Graphics): void {
    const geometry = graphics.geometry;
    const graphicsData = geometry.graphicsData;

    for (const data of graphicsData) {
      const fillPaint = this.createFillPaint(data);
      const strokePaint = this.createStrokePaint(data);

      const shape = data.shape;

      if (shape.type === PIXI.SHAPES.RECT) {
        const rect = shape as PIXI.Rectangle;
        const skRect = this.CanvasKit.XYWHRect(
          rect.x,
          rect.y,
          rect.width,
          rect.height,
        );

        if (fillPaint) {
          canvas.drawRect(skRect, fillPaint);
          fillPaint.delete();
        }

        if (strokePaint) {
          canvas.drawRect(skRect, strokePaint);
          strokePaint.delete();
        }

        continue;
      }

      if (shape.type === PIXI.SHAPES.POLY) {
        const polygon = shape as PIXI.Polygon;
        const path = new this.CanvasKit.Path();
        const points = polygon.points;

        if (points.length >= 2) {
          path.moveTo(points[0], points[1]);

          for (let index = 2; index < points.length; index += 2) {
            path.lineTo(points[index], points[index + 1]);
          }

          if (polygon.closeStroke) {
            path.close();
          }

          if (fillPaint) {
            canvas.drawPath(path, fillPaint);
            fillPaint.delete();
          }

          if (strokePaint) {
            canvas.drawPath(path, strokePaint);
            strokePaint.delete();
          }
        }

        path.delete();
        continue;
      }

      fillPaint?.delete();
      strokePaint?.delete();
    }
  }

  private renderSprite(canvas: SkCanvas, sprite: PIXI.Sprite): void {
    const image = this.getSpriteImage(sprite);

    if (!image) {
      return;
    }

    const texture = sprite.texture;
    const source = texture.frame;

    const localWidth = sprite.width / sprite.scale.x;
    const localHeight = sprite.height / sprite.scale.y;

    const sourceRect = this.CanvasKit.XYWHRect(
      source.x,
      source.y,
      source.width,
      source.height,
    );

    const destinationRect = this.CanvasKit.XYWHRect(
      -sprite.anchor.x * localWidth,
      -sprite.anchor.y * localHeight,
      localWidth,
      localHeight,
    );

    const paint = new this.CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setAlphaf(sprite.alpha);

    canvas.drawImageRect(image, sourceRect, destinationRect, paint);

    paint.delete();
  }

  private getSpriteImage(sprite: PIXI.Sprite): SkImage | null {
    const baseTexture = sprite.texture.baseTexture;
    const cachedImage = this.imageCache.get(baseTexture);

    if (cachedImage) {
      return cachedImage;
    }

    const resource = baseTexture.resource;

    if (!resource || !("source" in resource)) {
      return null;
    }

    const source = resource.source;

    if (!(source instanceof HTMLImageElement)) {
      return null;
    }

    const image = this.CanvasKit.MakeImageFromCanvasImageSource(source);

    if (!image) {
      return null;
    }

    this.imageCache.set(baseTexture, image);

    return image;
  }

  private createFillPaint(data: PIXI.GraphicsData): Paint | null {
    if (!data.fillStyle.visible || data.fillStyle.alpha <= 0) {
      return null;
    }

    const paint = new this.CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(this.CanvasKit.PaintStyle.Fill);
    paint.setColor(
      this.toSkiaColor(data.fillStyle.color, data.fillStyle.alpha),
    );

    return paint;
  }

  private createStrokePaint(data: PIXI.GraphicsData): Paint | null {
    if (
      !data.lineStyle.visible ||
      data.lineStyle.alpha <= 0 ||
      data.lineStyle.width <= 0
    ) {
      return null;
    }

    const paint = new this.CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(this.CanvasKit.PaintStyle.Stroke);
    paint.setStrokeWidth(data.lineStyle.width);
    paint.setColor(
      this.toSkiaColor(data.lineStyle.color, data.lineStyle.alpha),
    );

    return paint;
  }

  private toSkiaColor(hex: number, alpha: number): Float32Array {
    const red = (hex >> 16) & 255;
    const green = (hex >> 8) & 255;
    const blue = hex & 255;

    return this.CanvasKit.Color(red, green, blue, alpha);
  }
}
