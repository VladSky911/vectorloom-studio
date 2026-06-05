export type PdfColor = {
  red: number;
  green: number;
  blue: number;
};

export type PdfVectorShape = {
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  fillColor: PdfColor | null;
  strokeColor: PdfColor | null;
  strokeWidth: number;
};

export type PdfBitmapSprite = {
  width: number;
  height: number;
  rgbHex: string;
  alphaHex: string | null;
  transform: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  };
};

export type PdfSceneItem =
  | { type: "shape"; shape: PdfVectorShape }
  | { type: "sprite"; sprite: PdfBitmapSprite };

export type PdfSceneModel = {
  width: number;
  height: number;
  items: PdfSceneItem[];
};
