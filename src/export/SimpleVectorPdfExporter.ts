import type { PdfColor, PdfSceneModel, PdfVectorShape } from "./PdfSceneModel";

export class SimpleVectorPdfExporter {
  export(scene: PdfSceneModel): Blob {
    const content = this.createContentStream(scene);
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${scene.width} ${scene.height}] /Contents 4 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];

    const parts: string[] = ["%PDF-1.4\n"];
    const offsets: number[] = [0];

    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(parts.join("").length);
      parts.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
    }

    const xrefOffset = parts.join("").length;

    parts.push(`xref\n0 ${objects.length + 1}\n`);
    parts.push("0000000000 65535 f \n");

    for (const offset of offsets.slice(1)) {
      parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    }

    parts.push(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    );

    return new Blob(parts, { type: "application/pdf" });
  }

  private createContentStream(scene: PdfSceneModel): string {
    return scene.shapes
      .map((shape) => this.drawShape(shape, scene.height))
      .join("\n");
  }

  private drawShape(shape: PdfVectorShape, pageHeight: number): string {
    if (shape.points.length < 2) {
      return "";
    }

    const commands: string[] = ["q"];

    const [firstPoint, ...restPoints] = shape.points;
    commands.push(
      `${this.n(firstPoint.x)} ${this.n(pageHeight - firstPoint.y)} m`,
    );

    for (const point of restPoints) {
      commands.push(`${this.n(point.x)} ${this.n(pageHeight - point.y)} l`);
    }

    if (shape.closed) {
      commands.push("h");
    }

    if (shape.fillColor) {
      commands.push(`${this.color(shape.fillColor)} rg`);
    }

    if (shape.strokeColor) {
      commands.push(`${this.color(shape.strokeColor)} RG`);
      commands.push(`${this.n(shape.strokeWidth)} w`);
    }

    if (shape.fillColor && shape.strokeColor) {
      commands.push("B");
    } else if (shape.fillColor) {
      commands.push("f");
    } else {
      commands.push("S");
    }

    commands.push("Q");

    return commands.join("\n");
  }

  private color(color: PdfColor): string {
    return `${this.n(color.red)} ${this.n(color.green)} ${this.n(color.blue)}`;
  }

  private n(value: number): string {
    return Number.isFinite(value)
      ? value.toFixed(3).replace(/\.?0+$/, "")
      : "0";
  }
}
