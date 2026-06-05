import * as PIXI from "pixi.js-legacy";
import { SCENE_HEIGHT, SCENE_WIDTH } from "../pixi/createPixiApp";

type PointerBridgeHandlers = {
  onPointerDown: (object: PIXI.DisplayObject) => void;
  onPointerUp: (object: PIXI.DisplayObject) => void;
};

export class SkiaPointerBridge {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: PIXI.Container,
    private readonly handlers: PointerBridgeHandlers,
  ) {}

  bind(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const object = this.findObjectAtEvent(event);

    if (object) {
      this.handlers.onPointerDown(object);
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const object = this.findObjectAtEvent(event);

    if (object) {
      this.handlers.onPointerUp(object);
    }
  };

  private findObjectAtEvent(event: PointerEvent): PIXI.DisplayObject | null {
    const point = this.getScenePoint(event);
    const candidates = this.collectInteractiveObjects(this.scene);

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const object = candidates[index];

      if (this.containsPoint(object, point)) {
        return object;
      }
    }

    return null;
  }

  private getScenePoint(event: PointerEvent): PIXI.Point {
    const rect = this.canvas.getBoundingClientRect();

    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;

    return new PIXI.Point(
      normalizedX * SCENE_WIDTH,
      normalizedY * SCENE_HEIGHT,
    );
  }

  private collectInteractiveObjects(
    container: PIXI.Container,
  ): PIXI.DisplayObject[] {
    const result: PIXI.DisplayObject[] = [];

    for (const child of container.children) {
      if (!child.visible || child.alpha <= 0) {
        continue;
      }

      if (child.eventMode === "static" || child.eventMode === "dynamic") {
        result.push(child);
      }

      if (child instanceof PIXI.Container) {
        result.push(...this.collectInteractiveObjects(child));
      }
    }

    return result;
  }

  private containsPoint(
    object: PIXI.DisplayObject,
    scenePoint: PIXI.Point,
  ): boolean {
    object.updateTransform();

    if (object instanceof PIXI.Sprite) {
      const localPoint = object.worldTransform.applyInverse(scenePoint);
      const width = object.width / object.scale.x;
      const height = object.height / object.scale.y;

      const left = -object.anchor.x * width;
      const top = -object.anchor.y * height;

      return (
        localPoint.x >= left &&
        localPoint.x <= left + width &&
        localPoint.y >= top &&
        localPoint.y <= top + height
      );
    }

    if (object instanceof PIXI.Graphics) {
      const localPoint = object.worldTransform.applyInverse(scenePoint);
      return object.containsPoint(localPoint);
    }

    return false;
  }
}
