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

  List<double> get previewMatrix {
    const lumR = 0.213;
    const lumG = 0.715;
    const lumB = 0.072;
    final saturationValue = saturation.clamp(0.0, 2.0);
    final fadeValue = fade.clamp(0.0, 1.0);
    final clarityValue = 1 + clarity.clamp(-1.0, 1.0) * 0.16;
    final brightnessValue = brightness.clamp(0.65, 1.35);
    final contrastValue =
        contrast.clamp(0.4, 1.8) * (1 - fadeValue * 0.28) * clarityValue;
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
    );
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
        other.cropMode == cropMode;
  }

  @override
  int get hashCode => Object.hash(
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
  );
}

enum EditorTool { crop, rotate, light, color, detail, fx }

extension EditorToolLabel on EditorTool {
  String get label => switch (this) {
    EditorTool.crop => 'Crop',
    EditorTool.rotate => 'Rotate',
    EditorTool.light => 'Light',
    EditorTool.color => 'Color',
    EditorTool.detail => 'Detail',
    EditorTool.fx => 'FX',
  };
}

enum CropMode { original, square, portrait45, landscape169 }

extension CropModeLabel on CropMode {
  String get label => switch (this) {
    CropMode.original => 'Original',
    CropMode.square => '1:1',
    CropMode.portrait45 => '4:5',
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
