import * as PIXI from "pixi.js-legacy";
import { SCENE_HEIGHT, SCENE_WIDTH } from "../pixi/createPixiApp";
import type { PdfColor, PdfSceneModel, PdfVectorShape } from "./PdfSceneModel";

export class PixiSceneReader {
  read(container: PIXI.Container): PdfSceneModel {
    container.updateTransform();

    return {
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      shapes: this.readContainer(container),
    };
  }

  private readContainer(container: PIXI.Container): PdfVectorShape[] {
    const shapes: PdfVectorShape[] = [];

    for (const child of container.children) {
      if (!child.visible || child.alpha <= 0) {
        continue;
      }

      child.updateTransform();

      if (child instanceof PIXI.Graphics) {
        shapes.push(...this.readGraphics(child));
      }

      if (child instanceof PIXI.Container) {
        shapes.push(...this.readContainer(child));
      }
    }

    return shapes;
  }

  private readGraphics(graphics: PIXI.Graphics): PdfVectorShape[] {
    return graphics.geometry.graphicsData.flatMap((data) => {
      const shape = data.shape;
      const fillColor =
        data.fillStyle.visible && data.fillStyle.alpha > 0
          ? this.toPdfColor(data.fillStyle.color)
          : null;

      const strokeColor =
        data.lineStyle.visible &&
        data.lineStyle.alpha > 0 &&
        data.lineStyle.width > 0
          ? this.toPdfColor(data.lineStyle.color)
          : null;

      if (!fillColor && !strokeColor) {
        return [];
      }

      if (shape.type === PIXI.SHAPES.RECT) {
        const rect = shape as PIXI.Rectangle;
        const points = [
          this.toWorldPoint(graphics, rect.x, rect.y),
          this.toWorldPoint(graphics, rect.x + rect.width, rect.y),
          this.toWorldPoint(
            graphics,
            rect.x + rect.width,
            rect.y + rect.height,
          ),
          this.toWorldPoint(graphics, rect.x, rect.y + rect.height),
        ];

        return [
          {
            points,
            closed: true,
            fillColor,
            strokeColor,
            strokeWidth: data.lineStyle.width,
          },
        ];
      }

      if (shape.type === PIXI.SHAPES.POLY) {
        const polygon = shape as PIXI.Polygon;
        const points = [];

        for (let index = 0; index < polygon.points.length; index += 2) {
          points.push(
            this.toWorldPoint(
              graphics,
              polygon.points[index],
              polygon.points[index + 1],
            ),
          );
        }

        return [
          {
            points,
            closed: polygon.closeStroke,
            fillColor,
            strokeColor,
            strokeWidth: data.lineStyle.width,
          },
        ];
      }

      return [];
    });
  }

  private toWorldPoint(
    object: PIXI.DisplayObject,
    x: number,
    y: number,
  ): { x: number; y: number } {
    const point = object.worldTransform.apply(new PIXI.Point(x, y));

    return {
      x: point.x,
      y: point.y,
    };
  }

  private toPdfColor(hex: number): PdfColor {
    return {
      red: ((hex >> 16) & 255) / 255,
      green: ((hex >> 8) & 255) / 255,
      blue: (hex & 255) / 255,
    };
  }
}
