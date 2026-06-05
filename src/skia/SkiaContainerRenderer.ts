import type { CanvasKit, Paint, Surface } from "canvaskit-wasm";
import * as PIXI from "pixi.js-legacy";

type SkCanvas = ReturnType<Surface["getCanvas"]>;

export class SkiaContainerRenderer {
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
