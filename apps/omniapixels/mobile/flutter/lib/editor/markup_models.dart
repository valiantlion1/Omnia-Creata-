class MarkupPoint {
  const MarkupPoint({required this.x, required this.y});

  final double x;
  final double y;

  Map<String, double> toRequestMap() => {'x': x, 'y': y};

  static MarkupPoint fromRequestMap(Map<Object?, Object?> map) {
    return MarkupPoint(
      x: (map['x']! as num).toDouble(),
      y: (map['y']! as num).toDouble(),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is MarkupPoint && other.x == x && other.y == y;
  }

  @override
  int get hashCode => Object.hash(x, y);
}

enum MarkupLayerType { brush, text, sticker }

class MarkupLayer {
  const MarkupLayer({
    required this.type,
    required this.points,
    required this.colorValue,
    required this.size,
    required this.text,
    required this.x,
    required this.y,
  });

  const MarkupLayer.brush({
    required List<MarkupPoint> points,
    required int colorValue,
    required double size,
  }) : this(
         type: MarkupLayerType.brush,
         points: points,
         colorValue: colorValue,
         size: size,
         text: '',
         x: 0.5,
         y: 0.5,
       );

  const MarkupLayer.text({
    required String text,
    required double x,
    required double y,
    required int colorValue,
    required double size,
  }) : this(
         type: MarkupLayerType.text,
         points: const [],
         colorValue: colorValue,
         size: size,
         text: text,
         x: x,
         y: y,
       );

  const MarkupLayer.sticker({
    required String text,
    required double x,
    required double y,
    required int colorValue,
    required double size,
  }) : this(
         type: MarkupLayerType.sticker,
         points: const [],
         colorValue: colorValue,
         size: size,
         text: text,
         x: x,
         y: y,
       );

  final MarkupLayerType type;
  final List<MarkupPoint> points;
  final int colorValue;
  final double size;
  final String text;
  final double x;
  final double y;

  Map<String, Object?> toRequestMap() {
    return {
      'type': type.name,
      'points': points.map((point) => point.toRequestMap()).toList(),
      'colorValue': colorValue,
      'size': size,
      'text': text,
      'x': x,
      'y': y,
    };
  }

  static MarkupLayer fromRequestMap(Map<Object?, Object?> map) {
    final rawPoints = map['points'] as List<Object?>? ?? const [];
    return MarkupLayer(
      type: MarkupLayerType.values.byName(map['type']! as String),
      points: rawPoints
          .cast<Map<Object?, Object?>>()
          .map(MarkupPoint.fromRequestMap)
          .toList(growable: false),
      colorValue: map['colorValue']! as int,
      size: (map['size']! as num).toDouble(),
      text: map['text']! as String,
      x: (map['x']! as num).toDouble(),
      y: (map['y']! as num).toDouble(),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is MarkupLayer &&
        other.type == type &&
        other.colorValue == colorValue &&
        other.size == size &&
        other.text == text &&
        other.x == x &&
        other.y == y &&
        _samePoints(other.points, points);
  }

  @override
  int get hashCode =>
      Object.hash(type, Object.hashAll(points), colorValue, size, text, x, y);

  static bool _samePoints(List<MarkupPoint> a, List<MarkupPoint> b) {
    if (a.length != b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return false;
      }
    }
    return true;
  }
}
