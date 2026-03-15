import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'image_processor.dart';

/// Available ZeroCost processing actions
enum ZeroCostAction {
  autoEnhance,
  upscale2x,
  denoise,
  grayscale,
  vignette,
  // Cloud (AiService) Actions
  cloudUpscale4x,
  cloudBgRemove,
  cloudDeblur,
}

/// Result of a ZeroCost processing job
class ZeroCostResult {
  final Uint8List originalBytes;
  final Uint8List processedBytes;
  final Duration processingTime;
  final ZeroCostAction action;
  final bool isCloud;

  ZeroCostResult({
    required this.originalBytes,
    required this.processedBytes,
    required this.processingTime,
    required this.action,
    this.isCloud = false,
  });
}

/// ZeroCost offline AI processing pipeline.
/// Runs entirely on-device, no internet required.
/// Platform-agnostic: works on Web + Android + iOS.
class ZeroCostService {
  /// Process image bytes with the given action.
  /// [onProgress] callback reports progress from 0.0 to 1.0.
  /// [onStep] callback reports the current step name.
  Future<ZeroCostResult> process({
    required Uint8List inputBytes,
    required ZeroCostAction action,
    Function(double progress)? onProgress,
    Function(String stepName)? onStep,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    // Step 1: Decode image (run in isolate for heavy work)
    onStep?.call('Analiz ediliyor...');
    onProgress?.call(0.15);
    final decoded = await compute(_decodeImage, inputBytes);
    if (decoded == null) {
      throw Exception('Görsel çözümlenemedi. Lütfen geçerli bir fotoğraf seçin.');
    }
    
    // Step 2: Process
    onStep?.call(_getStepLabel(action));
    onProgress?.call(0.35);
    final processed = await compute(
      _processImage,
      _ProcessArgs(decoded, action),
    );
    onProgress?.call(0.80);
    
    // Step 3: Encode result
    onStep?.call('Kaydediliyor...');
    onProgress?.call(0.90);
    final resultBytes = await compute(_encodeJpg, processed);
    
    onProgress?.call(1.0);
    onStep?.call('Tamamlandı!');
    stopwatch.stop();
    
    return ZeroCostResult(
      originalBytes: inputBytes,
      processedBytes: resultBytes,
      processingTime: stopwatch.elapsed,
      action: action,
    );
  }
  
  String _getStepLabel(ZeroCostAction action) {
    switch (action) {
      case ZeroCostAction.autoEnhance:
        return 'AI İyileştirme uygulanıyor...';
      case ZeroCostAction.upscale2x:
        return '2× büyütme yapılıyor...';
      case ZeroCostAction.denoise:
        return 'Gürültü azaltılıyor...';
      case ZeroCostAction.grayscale:
        return 'Siyah-beyaz dönüşüm...';
      case ZeroCostAction.vignette:
        return 'Vinyet efekti uygulanıyor...';
      case ZeroCostAction.cloudUpscale4x:
        return 'Yapay zeka ile büyütülüyor...';
      case ZeroCostAction.cloudBgRemove:
        return 'Arka plan siliniyor...';
      case ZeroCostAction.cloudDeblur:
        return 'Görüntü netleştiriliyor...';
    }
  }
}

// --- Isolate functions (must be top-level or static) ---

class _ProcessArgs {
  final img.Image image;
  final ZeroCostAction action;
  _ProcessArgs(this.image, this.action);
}

img.Image? _decodeImage(Uint8List bytes) {
  return ImageProcessor.decodeBytes(bytes);
}

img.Image _processImage(_ProcessArgs args) {
  switch (args.action) {
    case ZeroCostAction.autoEnhance:
      return ImageProcessor.autoEnhance(args.image);
    case ZeroCostAction.upscale2x:
      return ImageProcessor.upscale2x(args.image);
    case ZeroCostAction.denoise:
      return ImageProcessor.denoise(args.image);
    case ZeroCostAction.grayscale:
      return ImageProcessor.grayscale(args.image);
    case ZeroCostAction.vignette:
      return ImageProcessor.vignette(args.image);
    case ZeroCostAction.cloudUpscale4x:
    case ZeroCostAction.cloudBgRemove:
    case ZeroCostAction.cloudDeblur:
      // Cloud operations shouldn't reach here normally since they are handled by AiService.
      // But we just return the original image to satisfy the compiler's exhaustive match.
      return args.image;
  }
}

Uint8List _encodeJpg(img.Image image) {
  return ImageProcessor.encodeJpg(image, quality: 92);
}
