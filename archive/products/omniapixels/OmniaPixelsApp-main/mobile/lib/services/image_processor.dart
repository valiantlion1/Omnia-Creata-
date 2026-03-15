import 'dart:typed_data';
import 'dart:math';
import 'package:image/image.dart' as img;

/// Low-level image processing utilities for ZeroCost (offline) pipeline.
/// Uses the `image` package for pixel-level manipulation.
class ImageProcessor {
  /// Auto-enhance: adjusts brightness, contrast, saturation and sharpness.
  static img.Image autoEnhance(img.Image src, {double strength = 1.0}) {
    var result = src;
    // Step 1: Brightness boost (+10%)
    result = img.adjustColor(result, brightness: 1.0 + (0.10 * strength));
    // Step 2: Contrast boost (+15%)
    result = img.contrast(result, contrast: (100 + (15 * strength)).toInt());
    // Step 3: Saturation boost (+12%)
    result = img.adjustColor(result, saturation: 1.0 + (0.12 * strength));
    // Step 4: Sharpen
    result = img.convolution(result, filter: [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0,
    ], div: 1);
    return result;
  }

  /// 2× bilinear upscale
  static img.Image upscale2x(img.Image src) {
    return img.copyResize(
      src,
      width: src.width * 2,
      height: src.height * 2,
      interpolation: img.Interpolation.cubic,
    );
  }

  /// Denoise using gaussian blur followed by unsharp mask
  static img.Image denoise(img.Image src, {int radius = 2}) {
    final blurred = img.gaussianBlur(src, radius: radius);
    // Unsharp mask: original + (original - blurred) * amount
    final result = img.Image(width: src.width, height: src.height);
    for (int y = 0; y < src.height; y++) {
      for (int x = 0; x < src.width; x++) {
        final orig = src.getPixel(x, y);
        final blur = blurred.getPixel(x, y);
        final r = (orig.r + (orig.r - blur.r) * 0.5).clamp(0, 255).toInt();
        final g = (orig.g + (orig.g - blur.g) * 0.5).clamp(0, 255).toInt();
        final b = (orig.b + (orig.b - blur.b) * 0.5).clamp(0, 255).toInt();
        result.setPixelRgba(x, y, r, g, b, orig.a.toInt());
      }
    }
    return result;
  }

  /// Adjust brightness (-1.0 to 1.0)
  static img.Image adjustBrightness(img.Image src, double amount) {
    return img.adjustColor(src, brightness: 1.0 + amount);
  }

  /// Adjust contrast (0.5 to 2.0)
  static img.Image adjustContrast(img.Image src, double factor) {
    return img.contrast(src, contrast: (factor * 100).toInt());
  }

  /// Convert to grayscale
  static img.Image grayscale(img.Image src) {
    return img.grayscale(src);
  }

  /// Vignette effect
  static img.Image vignette(img.Image src, {double amount = 0.5}) {
    return img.vignette(src, amount: amount);
  }

  /// Encode to PNG bytes
  static Uint8List encodePng(img.Image image) {
    return Uint8List.fromList(img.encodePng(image));
  }

  /// Encode to JPEG bytes with quality
  static Uint8List encodeJpg(img.Image image, {int quality = 90}) {
    return Uint8List.fromList(img.encodeJpg(image, quality: quality));
  }

  /// Decode from bytes
  static img.Image? decodeBytes(Uint8List bytes) {
    return img.decodeImage(bytes);
  }
}
