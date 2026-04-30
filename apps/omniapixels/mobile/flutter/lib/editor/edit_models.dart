class EditValues {
  const EditValues({
    this.exposure = 0,
    this.brightness = 1,
    this.contrast = 1,
    this.saturation = 1,
    this.warmth = 0,
    this.tint = 0,
    this.detail = 0.35,
    this.clarity = 0,
    this.fade = 0,
    this.vignette = 0,
    this.rotationTurns = 0,
    this.cropMode = CropMode.original,
    this.cropX = 0.5,
    this.cropY = 0.5,
    this.cropLeft = 0,
    this.cropTop = 0,
    this.cropWidth = 1,
    this.cropHeight = 1,
    this.straighten = 0,
    this.flipHorizontal = false,
  });

  final double exposure;
  final double brightness;
  final double contrast;
  final double saturation;
  final double warmth;
  final double tint;
  final double detail;
  final double clarity;
  final double fade;
  final double vignette;
  final int rotationTurns;
  final CropMode cropMode;
  final double cropX;
  final double cropY;
  final double cropLeft;
  final double cropTop;
  final double cropWidth;
  final double cropHeight;
  final double straighten;
  final bool flipHorizontal;

  bool get hasCropRect {
    const epsilon = 0.001;
    return cropLeft.abs() > epsilon ||
        cropTop.abs() > epsilon ||
        (1 - cropWidth).abs() > epsilon ||
        (1 - cropHeight).abs() > epsilon;
  }

  bool get hasGeometryEdits =>
      rotationTurns != 0 ||
      flipHorizontal ||
      straighten.abs() > 0.05 ||
      cropMode != CropMode.original ||
      hasCropRect;

  List<double> get previewMatrix {
    const lumR = 0.213;
    const lumG = 0.715;
    const lumB = 0.072;
    final saturationValue = saturation.clamp(0.0, 2.0);
    final fadeValue = fade.clamp(0.0, 1.0);
    final detailLift = ((detail.clamp(0.0, 1.0) - 0.5).clamp(0.0, 0.5)) * 0.24;
    final clarityValue = 1 + clarity.clamp(-1.0, 1.0) * 0.16 + detailLift;
    final brightnessValue = brightness.clamp(0.65, 1.35);
    final contrastValue =
        (contrast.clamp(0.4, 1.8) * (1 - fadeValue * 0.28) * clarityValue)
            .clamp(0.35, 1.95);
    final offset =
        128 * (1 - contrastValue) +
        exposure.clamp(-1.0, 1.0) * 90 +
        fadeValue * 32;
    final warmthOffset = warmth.clamp(-1.0, 1.0) * 24;
    final tintOffset = tint.clamp(-1.0, 1.0) * 22;
    final invSat = 1 - saturationValue;

    return [
      (lumR * invSat + saturationValue) * contrastValue * brightnessValue,
      lumG * invSat * contrastValue * brightnessValue,
      lumB * invSat * contrastValue * brightnessValue,
      0,
      offset + warmthOffset + tintOffset,
      lumR * invSat * contrastValue * brightnessValue,
      (lumG * invSat + saturationValue) * contrastValue * brightnessValue,
      lumB * invSat * contrastValue * brightnessValue,
      0,
      offset - tintOffset,
      lumR * invSat * contrastValue * brightnessValue,
      lumG * invSat * contrastValue * brightnessValue,
      (lumB * invSat + saturationValue) * contrastValue * brightnessValue,
      0,
      offset - warmthOffset + tintOffset,
      0,
      0,
      0,
      1,
      0,
    ];
  }

  EditValues copyWith({
    double? exposure,
    double? brightness,
    double? contrast,
    double? saturation,
    double? warmth,
    double? tint,
    double? detail,
    double? clarity,
    double? fade,
    double? vignette,
    int? rotationTurns,
    CropMode? cropMode,
    double? cropX,
    double? cropY,
    double? cropLeft,
    double? cropTop,
    double? cropWidth,
    double? cropHeight,
    double? straighten,
    bool? flipHorizontal,
  }) {
    return EditValues(
      exposure: exposure ?? this.exposure,
      brightness: brightness ?? this.brightness,
      contrast: contrast ?? this.contrast,
      saturation: saturation ?? this.saturation,
      warmth: warmth ?? this.warmth,
      tint: tint ?? this.tint,
      detail: detail ?? this.detail,
      clarity: clarity ?? this.clarity,
      fade: fade ?? this.fade,
      vignette: vignette ?? this.vignette,
      rotationTurns: rotationTurns ?? this.rotationTurns,
      cropMode: cropMode ?? this.cropMode,
      cropX: cropX ?? this.cropX,
      cropY: cropY ?? this.cropY,
      cropLeft: cropLeft ?? this.cropLeft,
      cropTop: cropTop ?? this.cropTop,
      cropWidth: cropWidth ?? this.cropWidth,
      cropHeight: cropHeight ?? this.cropHeight,
      straighten: straighten ?? this.straighten,
      flipHorizontal: flipHorizontal ?? this.flipHorizontal,
    );
  }

  bool get isDefault => this == const EditValues();

  bool sameAdjustmentsAs(EditValues other) {
    return other.exposure == exposure &&
        other.brightness == brightness &&
        other.contrast == contrast &&
        other.saturation == saturation &&
        other.warmth == warmth &&
        other.tint == tint &&
        other.detail == detail &&
        other.clarity == clarity &&
        other.fade == fade &&
        other.vignette == vignette;
  }

  @override
  bool operator ==(Object other) {
    return other is EditValues &&
        other.exposure == exposure &&
        other.brightness == brightness &&
        other.contrast == contrast &&
        other.saturation == saturation &&
        other.warmth == warmth &&
        other.tint == tint &&
        other.detail == detail &&
        other.clarity == clarity &&
        other.fade == fade &&
        other.vignette == vignette &&
        other.rotationTurns == rotationTurns &&
        other.cropMode == cropMode &&
        other.cropX == cropX &&
        other.cropY == cropY &&
        other.cropLeft == cropLeft &&
        other.cropTop == cropTop &&
        other.cropWidth == cropWidth &&
        other.cropHeight == cropHeight &&
        other.straighten == straighten &&
        other.flipHorizontal == flipHorizontal;
  }

  @override
  int get hashCode => Object.hashAll([
    exposure,
    brightness,
    contrast,
    saturation,
    warmth,
    tint,
    detail,
    clarity,
    fade,
    vignette,
    rotationTurns,
    cropMode,
    cropX,
    cropY,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    straighten,
    flipHorizontal,
  ]);
}

enum EditorTool { crop, rotate, light, color, detail, fx, brush, text, sticker }

extension EditorToolLabel on EditorTool {
  String get label => switch (this) {
    EditorTool.crop => 'Crop',
    EditorTool.rotate => 'Rotate',
    EditorTool.light => 'Light',
    EditorTool.color => 'Color',
    EditorTool.detail => 'Detail',
    EditorTool.fx => 'FX',
    EditorTool.brush => 'Brush',
    EditorTool.text => 'Text',
    EditorTool.sticker => 'Sticker',
  };
}

enum CropMode {
  original,
  free,
  square,
  portrait45,
  portrait916,
  classic43,
  landscape169,
}

extension CropModeLabel on CropMode {
  String get label => switch (this) {
    CropMode.original => 'Original',
    CropMode.free => 'Free',
    CropMode.square => '1:1',
    CropMode.portrait45 => '4:5',
    CropMode.portrait916 => '9:16',
    CropMode.classic43 => '4:3',
    CropMode.landscape169 => '16:9',
  };
}

class EditPreset {
  const EditPreset({required this.label, required this.values});

  final String label;
  final EditValues values;
}

const editPresets = [
  EditPreset(
    label: 'Clean',
    values: EditValues(brightness: 1.03, contrast: 1.08, detail: 0.42),
  ),
  EditPreset(
    label: 'Pop',
    values: EditValues(
      exposure: 0.08,
      contrast: 1.24,
      saturation: 1.28,
      clarity: 0.35,
      detail: 0.62,
    ),
  ),
  EditPreset(
    label: 'Warm',
    values: EditValues(
      exposure: 0.04,
      brightness: 1.04,
      saturation: 1.12,
      warmth: 0.45,
      fade: 0.08,
    ),
  ),
  EditPreset(
    label: 'Mono',
    values: EditValues(
      contrast: 1.22,
      saturation: 0,
      clarity: 0.24,
      vignette: 0.18,
    ),
  ),
  EditPreset(
    label: 'Portrait',
    values: EditValues(
      exposure: 0.06,
      brightness: 1.06,
      contrast: 0.94,
      saturation: 1.08,
      warmth: 0.16,
      detail: 0.24,
    ),
  ),
  EditPreset(
    label: 'Detail',
    values: EditValues(
      contrast: 1.12,
      saturation: 1.08,
      detail: 0.82,
      clarity: 0.58,
    ),
  ),
  EditPreset(
    label: 'Cinematic',
    values: EditValues(
      exposure: -0.04,
      contrast: 1.28,
      saturation: 0.82,
      warmth: -0.18,
      tint: 0.18,
      fade: 0.18,
      vignette: 0.28,
    ),
  ),
];
