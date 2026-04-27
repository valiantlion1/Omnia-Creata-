import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

import 'edit_models.dart';

Future<Uint8List> renderEditedImage({
  required Uint8List bytes,
  required EditValues edit,
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
  if (upscale) {
    decoded = img.copyResize(
      decoded,
      width: decoded.width * 2,
      height: decoded.height * 2,
      interpolation: img.Interpolation.cubic,
    );
  }

  if (maxLongEdge != null) {
    final longEdge = decoded.width > decoded.height
        ? decoded.width
        : decoded.height;
    if (longEdge > maxLongEdge) {
      final scale = maxLongEdge / longEdge;
      decoded = img.copyResize(
        decoded,
        width: (decoded.width * scale).round(),
        height: (decoded.height * scale).round(),
        interpolation: img.Interpolation.cubic,
      );
    }
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

  return Uint8List.fromList(img.encodeJpg(decoded, quality: 94));
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
