import type { CanvasKit } from "canvaskit-wasm";
import type { PdfSceneModel, PdfVectorShape } from "./PdfSceneModel";

type SkiaPdfCanvas = {
  drawPath: (path: unknown, paint: unknown) => void;
};

type SkiaPdfDocument = {
  beginPage: (width: number, height: number) => SkiaPdfCanvas;
  endPage: () => void;
  close: () => Uint8Array;
};

type CanvasKitWithPdf = CanvasKit & {
  MakePDFDocument?: () => SkiaPdfDocument;
};

export class SkiaPdfExporter {
  constructor(private readonly CanvasKit: CanvasKitWithPdf) {}

  isAvailable(): boolean {
    return typeof this.CanvasKit.MakePDFDocument === "function";
  }

  export(scene: PdfSceneModel): Blob {
    if (!this.CanvasKit.MakePDFDocument) {
      throw new Error(
        "Skia PDF backend is not available in this CanvasKit build.",
      );
    }

    const document = this.CanvasKit.MakePDFDocument();
    const canvas = document.beginPage(scene.width, scene.height);

    for (const item of scene.items) {
      if (item.type === "shape") {
        this.drawShape(canvas, item.shape);
      }
    }

    document.endPage();

    const bytes = document.close();
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    const view = new Uint8Array(arrayBuffer);

    view.set(bytes);

    return new Blob([arrayBuffer], { type: "application/pdf" });
  }

  private drawShape(canvas: SkiaPdfCanvas, shape: PdfVectorShape): void {
    if (shape.points.length < 2) {
      return;
    }

    const path = new this.CanvasKit.Path();
    const [firstPoint, ...restPoints] = shape.points;

    path.moveTo(firstPoint.x, firstPoint.y);

    for (const point of restPoints) {
      path.lineTo(point.x, point.y);
    }

    if (shape.closed) {
      path.close();
    }

    if (shape.fillColor) {
      const fillPaint = new this.CanvasKit.Paint();
      fillPaint.setAntiAlias(true);
      fillPaint.setStyle(this.CanvasKit.PaintStyle.Fill);
      fillPaint.setColor(
        this.CanvasKit.Color(
          shape.fillColor.red * 255,
          shape.fillColor.green * 255,
          shape.fillColor.blue * 255,
          1,
        ),
      );

      canvas.drawPath(path, fillPaint);
      fillPaint.delete();
    }

    if (shape.strokeColor && shape.strokeWidth > 0) {
      const strokePaint = new this.CanvasKit.Paint();
      strokePaint.setAntiAlias(true);
      strokePaint.setStyle(this.CanvasKit.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(shape.strokeWidth);
      strokePaint.setColor(
        this.CanvasKit.Color(
          shape.strokeColor.red * 255,
          shape.strokeColor.green * 255,
          shape.strokeColor.blue * 255,
          1,
        ),
      );

      canvas.drawPath(path, strokePaint);
      strokePaint.delete();
    }

    path.delete();
  }
}
