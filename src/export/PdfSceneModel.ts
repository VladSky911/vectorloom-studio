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

export type PdfSceneModel = {
  width: number;
  height: number;
  shapes: PdfVectorShape[];
};
