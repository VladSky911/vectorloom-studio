import * as PIXI from "pixi.js-legacy";

export const SCENE_WIDTH = 720;
export const SCENE_HEIGHT = 480;

export function createPixiApp(): PIXI.Application<HTMLCanvasElement> {
  return new PIXI.Application<HTMLCanvasElement>({
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    backgroundColor: 0xffffff,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    forceCanvas: true,
  });
}
