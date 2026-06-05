```cpp
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <memory>
#include <string>
#include <vector>

#include "include/core/SkBitmap.h"
#include "include/core/SkCanvas.h"
#include "include/core/SkColor.h"
#include "include/core/SkDocument.h"
#include "include/core/SkImageInfo.h"
#include "include/core/SkPaint.h"
#include "include/core/SkPath.h"
#include "include/core/SkPixmap.h"
#include "include/core/SkStream.h"
#include "include/docs/SkPDFDocument.h"

using emscripten::val;

static float number(val object, const char* key) {
  return object[key].as<float>();
}

static std::string stringValue(val object, const char* key) {
  return object[key].as<std::string>();
}

static uint8_t hexByte(const std::string& hex, size_t index) {
  const std::string part = hex.substr(index, 2);
  return static_cast<uint8_t>(std::stoi(part, nullptr, 16));
}

static SkColor colorFrom(val color) {
  const int red = static_cast<int>(number(color, "red") * 255.0f);
  const int green = static_cast<int>(number(color, "green") * 255.0f);
  const int blue = static_cast<int>(number(color, "blue") * 255.0f);

  return SkColorSetARGB(255, red, green, blue);
}

static void drawShape(SkCanvas* canvas, val shape) {
  val points = shape["points"];
  const int length = points["length"].as<int>();

  if (length < 2) {
    return;
  }

  SkPath path;
  val first = points[0];

  path.moveTo(number(first, "x"), number(first, "y"));

  for (int index = 1; index < length; index += 1) {
    val point = points[index];
    path.lineTo(number(point, "x"), number(point, "y"));
  }

  if (shape["closed"].as<bool>()) {
    path.close();
  }

  if (!shape["fillColor"].isNull()) {
    SkPaint fill;
    fill.setAntiAlias(true);
    fill.setStyle(SkPaint::kFill_Style);
    fill.setColor(colorFrom(shape["fillColor"]));
    canvas->drawPath(path, fill);
  }

  if (!shape["strokeColor"].isNull()) {
    SkPaint stroke;
    stroke.setAntiAlias(true);
    stroke.setStyle(SkPaint::kStroke_Style);
    stroke.setStrokeWidth(number(shape, "strokeWidth"));
    stroke.setColor(colorFrom(shape["strokeColor"]));
    canvas->drawPath(path, stroke);
  }
}

static void drawSprite(SkCanvas* canvas, val sprite) {
  const int width = sprite["width"].as<int>();
  const int height = sprite["height"].as<int>();
  const std::string rgbHex = stringValue(sprite, "rgbHex");
  const bool hasAlpha = !sprite["alphaHex"].isNull();
  const std::string alphaHex = hasAlpha ? sprite["alphaHex"].as<std::string>() : "";

  SkBitmap bitmap;
  bitmap.allocPixels(SkImageInfo::MakeN32Premul(width, height));

  uint32_t* pixels = static_cast<uint32_t*>(bitmap.getPixels());

  for (int pixel = 0; pixel < width * height; pixel += 1) {
    const size_t rgbIndex = static_cast<size_t>(pixel) * 6;
    const size_t alphaIndex = static_cast<size_t>(pixel) * 2;

    const uint8_t red = hexByte(rgbHex, rgbIndex);
    const uint8_t green = hexByte(rgbHex, rgbIndex + 2);
    const uint8_t blue = hexByte(rgbHex, rgbIndex + 4);
    const uint8_t alpha = hasAlpha ? hexByte(alphaHex, alphaIndex) : 255;

    pixels[pixel] = SkPreMultiplyARGB(alpha, red, green, blue);
  }

  val transform = sprite["transform"];

  SkPaint paint;
  paint.setAntiAlias(true);

  canvas->save();
  canvas->concat(SkMatrix::MakeAll(
    number(transform, "a"),
    number(transform, "c"),
    number(transform, "e"),
    number(transform, "b"),
    number(transform, "d"),
    number(transform, "f"),
    0,
    0,
    1
  ));

  canvas->drawImage(bitmap.asImage(), 0, 0, SkSamplingOptions(), &paint);
  canvas->restore();
}

std::string createVectorloomPdf(val scene) {
  SkDynamicMemoryWStream stream;
  SkPDF::Metadata metadata;
  metadata.fTitle = "Vectorloom Studio";
  metadata.fCreator = "Vectorloom Studio Skia PDF WASM Backend";

  auto document = SkPDF::MakeDocument(&stream, metadata);
  SkCanvas* canvas = document->beginPage(number(scene, "width"), number(scene, "height"));

  val items = scene["items"];
  const int length = items["length"].as<int>();

  for (int index = 0; index < length; index += 1) {
    val item = items[index];
    const std::string type = stringValue(item, "type");

    if (type == "shape") {
      drawShape(canvas, item["shape"]);
    }

    if (type == "sprite") {
      drawSprite(canvas, item["sprite"]);
    }
  }

  document->endPage();
  document->close();

  sk_sp<SkData> data = stream.detachAsData();

  return std::string(
    static_cast<const char*>(data->data()),
    static_cast<size_t>(data->size())
  );
}

EMSCRIPTEN_BINDINGS(vectorloom_pdf_backend) {
  emscripten::function("createVectorloomPdf", &createVectorloomPdf);
}