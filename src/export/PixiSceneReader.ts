import * as PIXI from "pixi.js-legacy";
import { SCENE_HEIGHT, SCENE_WIDTH } from "../pixi/createPixiApp";
import type {
  PdfBitmapSprite,
  PdfColor,
  PdfSceneItem,
  PdfVectorShape,
} from "./PdfSceneModel";

export class PixiSceneReader {
  async read(container: PIXI.Container): Promise<{
    width: number;
    height: number;
    items: PdfSceneItem[];
  }> {
    container.updateTransform();

    return {
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      items: await this.readContainer(container),
    };
  }

  private async readContainer(
    container: PIXI.Container,
  ): Promise<PdfSceneItem[]> {
    const items: PdfSceneItem[] = [];

    for (const child of container.children) {
      if (!child.visible || child.alpha <= 0) {
        continue;
      }

      child.updateTransform();

      if (child instanceof PIXI.Graphics) {
        for (const shape of this.readGraphics(child)) {
          items.push({ type: "shape", shape });
        }
      } else if (child instanceof PIXI.Sprite) {
        const sprite = await this.readSprite(child);

        if (sprite) {
          items.push({ type: "sprite", sprite });
        }
      } else if (child instanceof PIXI.Container) {
        items.push(...(await this.readContainer(child)));
      }
    }

    return items;
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

  private async readSprite(
    sprite: PIXI.Sprite,
  ): Promise<PdfBitmapSprite | null> {
    const resource = sprite.texture.baseTexture.resource as {
      source?: unknown;
    } | null;
    const source = resource?.source;

    if (
      !(source instanceof HTMLImageElement) &&
      !(source instanceof HTMLCanvasElement)
    ) {
      return null;
    }

    if (source instanceof HTMLImageElement && !source.complete) {
      await source.decode();
    }

    const frame = sprite.texture.frame;
    const bitmapCanvas = document.createElement("canvas");
    bitmapCanvas.width = Math.max(1, Math.round(frame.width));
    bitmapCanvas.height = Math.max(1, Math.round(frame.height));

    const context = bitmapCanvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.clearRect(0, 0, bitmapCanvas.width, bitmapCanvas.height);
    context.drawImage(
      source,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      bitmapCanvas.width,
      bitmapCanvas.height,
    );

    const imageData = context.getImageData(
      0,
      0,
      bitmapCanvas.width,
      bitmapCanvas.height,
    );
    const rgb: string[] = [];
    const alpha: string[] = [];
    let hasTransparency = false;
    const worldAlpha = Math.max(0, Math.min(1, sprite.worldAlpha));

    for (let index = 0; index < imageData.data.length; index += 4) {
      rgb.push(this.byteToHex(imageData.data[index]));
      rgb.push(this.byteToHex(imageData.data[index + 1]));
      rgb.push(this.byteToHex(imageData.data[index + 2]));

      const alphaValue = Math.round(imageData.data[index + 3] * worldAlpha);
      alpha.push(this.byteToHex(alphaValue));

      if (alphaValue < 255) {
        hasTransparency = true;
      }
    }

    return {
      width: bitmapCanvas.width,
      height: bitmapCanvas.height,
      rgbHex: rgb.join(""),
      alphaHex: hasTransparency ? alpha.join("") : null,
      transform: this.toPdfImageTransform(sprite),
    };
  }

  private toPdfImageTransform(
    sprite: PIXI.Sprite,
  ): PdfBitmapSprite["transform"] {
    const matrix = sprite.worldTransform;
    const localWidth = sprite.width / sprite.scale.x;
    const localHeight = sprite.height / sprite.scale.y;
    const left = -sprite.anchor.x * localWidth;
    const top = -sprite.anchor.y * localHeight;

    const a = matrix.a * localWidth;
    const b = matrix.b * localWidth;
    const c = matrix.c * localHeight;
    const d = matrix.d * localHeight;
    const e = matrix.a * left + matrix.c * top + matrix.tx;
    const f = matrix.b * left + matrix.d * top + matrix.ty;

    return {
      a,
      b: -b,
      c,
      d: -d,
      e,
      f: SCENE_HEIGHT - f,
    };
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

  private byteToHex(value: number): string {
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  }
}
