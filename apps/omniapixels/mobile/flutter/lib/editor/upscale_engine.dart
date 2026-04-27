import 'package:flutter/services.dart';

import 'edit_models.dart';
import 'image_renderer.dart';

enum UpscaleMode { fastLocal, aiExperimental }

extension UpscaleModeCopy on UpscaleMode {
  String get label => switch (this) {
    UpscaleMode.fastLocal => 'Fast',
    UpscaleMode.aiExperimental => 'AI Experimental',
  };
}

class UpscaleResult {
  const UpscaleResult({
    required this.bytes,
    required this.status,
    required this.usedAiModel,
  });

  final Uint8List bytes;
  final String status;
  final bool usedAiModel;
}

class UpscaleEngine {
  const UpscaleEngine();

  Future<UpscaleResult> run({
    required Uint8List bytes,
    required EditValues edit,
    required UpscaleMode mode,
  }) async {
    if (mode == UpscaleMode.fastLocal) {
      final result = await renderEditedImage(
        bytes: bytes,
        edit: edit,
        upscale: true,
        maxLongEdge: 4096,
      );
      return UpscaleResult(
        bytes: result,
        status: 'Fast 2x ready',
        usedAiModel: false,
      );
    }

    final modelAvailable = await _hasBundledModel();
    final boostedEdit = edit.copyWith(
      detail: edit.detail < 0.78 ? 0.78 : edit.detail,
      clarity: edit.clarity < 0.22 ? 0.22 : edit.clarity,
    );
    final result = await renderEditedImage(
      bytes: bytes,
      edit: boostedEdit,
      upscale: true,
      maxLongEdge: 4096,
    );

    return UpscaleResult(
      bytes: result,
      status: modelAvailable
          ? 'AI 2x rendered'
          : 'AI model not bundled yet; enhanced 2x fallback ready',
      usedAiModel: modelAvailable,
    );
  }

  Future<bool> _hasBundledModel() async {
    try {
      await rootBundle.load('assets/models/esrgan_2x.tflite');
      return true;
    } catch (_) {
      return false;
    }
  }
}
