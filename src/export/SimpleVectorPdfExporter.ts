import type {
  PdfBitmapSprite,
  PdfColor,
  PdfSceneItem,
  PdfSceneModel,
  PdfVectorShape,
} from "./PdfSceneModel";

type ImageEntry = {
  name: string;
  sprite: PdfBitmapSprite;
  imageObjectId: number;
  maskObjectId: number | null;
};

export class SimpleVectorPdfExporter {
  export(scene: PdfSceneModel): Blob {
    const imageEntries = this.createImageEntries(scene.items);
    const content = this.createContentStream(scene, imageEntries);
    const xObjectResources = imageEntries
      .map((entry) => `/${entry.name} ${entry.imageObjectId} 0 R`)
      .join(" ");

    const objects = new Map<number, string>();

    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.set(
      3,
      [
        "<<",
        "/Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${scene.width} ${scene.height}]`,
        xObjectResources
          ? `/Resources << /XObject << ${xObjectResources} >> >>`
          : "/Resources << >>",
        "/Contents 4 0 R",
        ">>",
      ].join("\n"),
    );
    objects.set(
      4,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );

    for (const entry of imageEntries) {
      if (entry.maskObjectId) {
        const maskStream = `${entry.sprite.alphaHex ?? ""}>`;
        objects.set(
          entry.maskObjectId,
          [
            "<<",
            "/Type /XObject",
            "/Subtype /Image",
            `/Width ${entry.sprite.width}`,
            `/Height ${entry.sprite.height}`,
            "/ColorSpace /DeviceGray",
            "/BitsPerComponent 8",
            "/Filter /ASCIIHexDecode",
            `/Length ${maskStream.length}`,
            ">>",
            "stream",
            maskStream,
            "endstream",
          ].join("\n"),
        );
      }

      const imageStream = `${entry.sprite.rgbHex}>`;
      objects.set(
        entry.imageObjectId,
        [
          "<<",
          "/Type /XObject",
          "/Subtype /Image",
          `/Width ${entry.sprite.width}`,
          `/Height ${entry.sprite.height}`,
          "/ColorSpace /DeviceRGB",
          "/BitsPerComponent 8",
          "/Filter /ASCIIHexDecode",
          entry.maskObjectId ? `/SMask ${entry.maskObjectId} 0 R` : "",
          `/Length ${imageStream.length}`,
          ">>",
          "stream",
          imageStream,
          "endstream",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    return this.writePdf(objects);
  }

  private createImageEntries(items: PdfSceneItem[]): ImageEntry[] {
    const sprites = items.filter((item) => item.type === "sprite");
    let nextObjectId = 5;

    return sprites.map((item, index) => {
      if (item.type !== "sprite") {
        throw new Error("Unexpected non-sprite PDF item.");
      }

      const maskObjectId = item.sprite.alphaHex ? nextObjectId++ : null;
      const imageObjectId = nextObjectId++;

      return {
        name: `Im${index + 1}`,
        sprite: item.sprite,
        imageObjectId,
        maskObjectId,
      };
    });
  }

  private createContentStream(
    scene: PdfSceneModel,
    imageEntries: ImageEntry[],
  ): string {
    const spriteNames = new Map<PdfBitmapSprite, string>();

    for (const entry of imageEntries) {
      spriteNames.set(entry.sprite, entry.name);
    }

    return scene.items
      .map((item) => {
        if (item.type === "shape") {
          return this.drawShape(item.shape, scene.height);
        }

        return this.drawSprite(item.sprite, spriteNames.get(item.sprite));
      })
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

  private drawSprite(
    sprite: PdfBitmapSprite,
    name: string | undefined,
  ): string {
    if (!name) {
      return "";
    }

    const { a, b, c, d, e, f } = sprite.transform;

    return [
      "q",
      `${this.n(a)} ${this.n(b)} ${this.n(c)} ${this.n(d)} ${this.n(e)} ${this.n(f)} cm`,
      `/${name} Do`,
      "Q",
    ].join("\n");
  }

  private writePdf(objects: Map<number, string>): Blob {
    const maxObjectId = Math.max(...objects.keys());
    const parts: string[] = ["%PDF-1.4\n"];
    const offsets: number[] = [0];

    for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
      const object = objects.get(objectId);

      if (!object) {
        throw new Error(`Missing PDF object ${objectId}.`);
      }

      offsets.push(parts.join("").length);
      parts.push(`${objectId} 0 obj\n${object}\nendobj\n`);
    }

    const xrefOffset = parts.join("").length;

    parts.push(`xref\n0 ${maxObjectId + 1}\n`);
    parts.push("0000000000 65535 f \n");

    for (const offset of offsets.slice(1)) {
      parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    }

    parts.push(
      `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    );

    return new Blob(parts, { type: "application/pdf" });
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
