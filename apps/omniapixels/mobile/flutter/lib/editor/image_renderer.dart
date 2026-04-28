import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

import 'edit_models.dart';
import 'markup_models.dart';

Future<Uint8List> renderEditedImage({
  required Uint8List bytes,
  required EditValues edit,
  List<MarkupLayer> markups = const [],
  bool upscale = false,
  int? maxLongEdge,
}) {
  return compute(_renderImageBytes, {
    'bytes': bytes,
    'exposure': edit.exposure,
    'brightness': edit.brightness,
    'contrast': edit.contrast,
    'saturation': edit.saturation,
    'warmth': edit.warmth,
    'tint': edit.tint,
    'detail': edit.detail,
    'clarity': edit.clarity,
    'fade': edit.fade,
    'vignette': edit.vignette,
    'rotationTurns': edit.rotationTurns,
    'cropMode': edit.cropMode.name,
    'markups': markups.map((markup) => markup.toRequestMap()).toList(),
    'upscale': upscale,
    'maxLongEdge': maxLongEdge,
  });
}

Uint8List _renderImageBytes(Map<String, Object?> request) {
  final bytes = request['bytes']! as Uint8List;
  var decoded = img.decodeImage(bytes);
  if (decoded == null) {
    throw StateError('Unsupported image format');
  }

  decoded = img.bakeOrientation(decoded);
  final cropMode = request['cropMode']! as String;
  if (cropMode != CropMode.original.name) {
    final ratio = switch (cropMode) {
      'square' => 1.0,
      'portrait45' => 4 / 5,
      'landscape169' => 16 / 9,
      _ => null,
    };
    if (ratio != null) {
      decoded = _cropCenterRatio(decoded, ratio);
    }
  }

  final rotationTurns = request['rotationTurns']! as int;
  if (rotationTurns != 0) {
    decoded = img.copyRotate(
      decoded,
      angle: rotationTurns * 90,
      interpolation: img.Interpolation.cubic,
    );
  }

  final maxLongEdge = request['maxLongEdge'] as int?;
  final upscale = request['upscale']! as bool;
  if (maxLongEdge != null && upscale) {
    decoded = _resizeLongEdge(decoded, (maxLongEdge / 2).round());
  }

  if (upscale) {
    decoded = img.copyResize(
      decoded,
      width: decoded.width * 2,
      height: decoded.height * 2,
      interpolation: img.Interpolation.cubic,
    );
  }

  if (maxLongEdge != null) {
    decoded = _resizeLongEdge(decoded, maxLongEdge);
  }

  final exposure = request['exposure']! as double;
  final brightness = request['brightness']! as double;
  final contrast = request['contrast']! as double;
  final saturation = request['saturation']! as double;
  final warmth = request['warmth']! as double;
  final tint = request['tint']! as double;
  final detail = request['detail']! as double;
  final clarity = request['clarity']! as double;
  final fade = request['fade']! as double;
  final vignette = request['vignette']! as double;
  final fadeValue = fade.clamp(0.0, 1.0);
  final clarityValue = 1 + clarity.clamp(-1.0, 1.0) * 0.16;

  decoded = img.adjustColor(
    decoded,
    exposure: exposure,
    brightness: brightness,
    contrast: contrast * (1 - fadeValue * 0.28) * clarityValue,
    saturation: saturation,
    hue: warmth * 12,
  );

  if (fadeValue > 0 || tint != 0) {
    decoded = img.colorOffset(
      decoded,
      red: fadeValue * 14 + tint * 9,
      green: fadeValue * 14 - tint * 10,
      blue: fadeValue * 14 + tint * 9,
    );
  }

  if (detail > 0.52 || upscale) {
    decoded = img.convolution(
      decoded,
      filter: const [0, -1, 0, -1, 5, -1, 0, -1, 0],
      amount: upscale ? 0.34 : (detail - 0.5).clamp(0, 0.38),
    );
  }

  if (vignette > 0) {
    decoded = img.vignette(
      decoded,
      start: 0.28,
      end: 0.96,
      amount: vignette.clamp(0.0, 1.0) * 0.86,
    );
  }

  final markups = (request['markups'] as List<Object?>? ?? const [])
      .cast<Map<Object?, Object?>>()
      .map(MarkupLayer.fromRequestMap)
      .toList(growable: false);
  if (markups.isNotEmpty) {
    _applyMarkups(decoded, markups);
  }

  return Uint8List.fromList(img.encodeJpg(decoded, quality: 94));
}

void _applyMarkups(img.Image image, List<MarkupLayer> markups) {
  for (final markup in markups) {
    final color = _markupColor(markup.colorValue);
    switch (markup.type) {
      case MarkupLayerType.brush:
        final points = markup.points;
        if (points.isEmpty) {
          continue;
        }
        final thickness = (markup.size * image.width.clamp(1, image.height))
            .round()
            .clamp(2, 64);
        if (points.length == 1) {
          final point = points.first;
          img.fillCircle(
            image,
            x: _pixelX(point.x, image.width),
            y: _pixelY(point.y, image.height),
            radius: (thickness / 2).round(),
            color: color,
            antialias: true,
          );
          continue;
        }
        for (var i = 1; i < points.length; i++) {
          final previous = points[i - 1];
          final current = points[i];
          img.drawLine(
            image,
            x1: _pixelX(previous.x, image.width),
            y1: _pixelY(previous.y, image.height),
            x2: _pixelX(current.x, image.width),
            y2: _pixelY(current.y, image.height),
            color: color,
            antialias: true,
            thickness: thickness,
          );
        }
      case MarkupLayerType.text:
        _drawMarkupText(image, markup, color, _markupFont(markup.size));
      case MarkupLayerType.sticker:
        _drawMarkupText(image, markup, color, _markupFont(markup.size));
    }
  }
}

void _drawMarkupText(
  img.Image image,
  MarkupLayer markup,
  img.Color color,
  img.BitmapFont font,
) {
  final text = markup.type == MarkupLayerType.sticker
      ? markup.text.toUpperCase()
      : markup.text;
  final textWidth = _bitmapTextWidth(font, text);
  final x = (_pixelX(markup.x, image.width) - textWidth / 2).round().clamp(
    0,
    image.width - 1,
  );
  final y = (_pixelY(markup.y, image.height) - font.lineHeight / 2)
      .round()
      .clamp(0, image.height - 1);
  final shadow = img.ColorRgba8(0, 0, 0, 160);
  img.drawString(
    image,
    text,
    font: font,
    x: (x + 2).clamp(0, image.width - 1).toInt(),
    y: (y + 2).clamp(0, image.height - 1).toInt(),
    color: shadow,
  );
  img.drawString(image, text, font: font, x: x, y: y, color: color);
}

img.BitmapFont _markupFont(double size) {
  if (size < 0.08) {
    return img.arial24;
  }
  return img.arial48;
}

int _bitmapTextWidth(img.BitmapFont font, String text) {
  var width = 0;
  for (final rune in text.runes) {
    width += font.characters[rune]?.xAdvance ?? font.size;
  }
  return width;
}

int _pixelX(double value, int width) =>
    (value.clamp(0.0, 1.0) * (width - 1)).round();

int _pixelY(double value, int height) =>
    (value.clamp(0.0, 1.0) * (height - 1)).round();

img.Color _markupColor(int colorValue) {
  return img.ColorRgba8(
    (colorValue >> 16) & 0xFF,
    (colorValue >> 8) & 0xFF,
    colorValue & 0xFF,
    (colorValue >> 24) & 0xFF,
  );
}

img.Image _resizeLongEdge(img.Image src, int maxLongEdge) {
  final longEdge = src.width > src.height ? src.width : src.height;
  if (longEdge <= maxLongEdge) {
    return src;
  }

  final scale = maxLongEdge / longEdge;
  return img.copyResize(
    src,
    width: (src.width * scale).round().clamp(1, src.width).toInt(),
    height: (src.height * scale).round().clamp(1, src.height).toInt(),
    interpolation: img.Interpolation.cubic,
  );
}

img.Image _cropCenterRatio(img.Image src, double ratio) {
  final currentRatio = src.width / src.height;
  var cropWidth = src.width;
  var cropHeight = src.height;
  var cropX = 0;
  var cropY = 0;

  if (currentRatio > ratio) {
    cropWidth = (src.height * ratio).round().clamp(1, src.width);
    cropX = ((src.width - cropWidth) / 2).round();
  } else {
    cropHeight = (src.width / ratio).round().clamp(1, src.height);
    cropY = ((src.height - cropHeight) / 2).round();
  }

  return img.copyCrop(
    src,
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  );
}
