import 'dart:typed_data';

import 'edit_models.dart';
import 'image_renderer.dart';
import 'markup_models.dart';

enum UpscaleMode { fastLocal, enhancedLocal }

extension UpscaleModeCopy on UpscaleMode {
  String get label => switch (this) {
    UpscaleMode.fastLocal => 'Fast 2x',
    UpscaleMode.enhancedLocal => 'Enhanced 2x',
  };

  String get runningLabel => switch (this) {
    UpscaleMode.fastLocal => 'Rendering Fast 2x locally...',
    UpscaleMode.enhancedLocal => 'Rendering Enhanced 2x locally...',
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
    List<MarkupLayer> markups = const [],
  }) async {
    if (mode == UpscaleMode.fastLocal) {
      final result = await renderEditedImage(
        bytes: bytes,
        edit: edit,
        markups: markups,
        upscale: true,
        maxLongEdge: 4096,
      );
      return UpscaleResult(
        bytes: result,
        status: 'Fast 2x ready',
        usedAiModel: false,
      );
    }

    final boostedEdit = edit.copyWith(
      detail: edit.detail < 0.78 ? 0.78 : edit.detail,
      clarity: edit.clarity < 0.22 ? 0.22 : edit.clarity,
    );
    final result = await renderEditedImage(
      bytes: bytes,
      edit: boostedEdit,
      markups: markups,
      upscale: true,
      maxLongEdge: 4096,
    );

    return UpscaleResult(
      bytes: result,
      status: 'Enhanced local 2x ready',
      usedAiModel: false,
    );
  }
}
