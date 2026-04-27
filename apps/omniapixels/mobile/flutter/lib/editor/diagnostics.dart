class DiagnosticsEntry {
  const DiagnosticsEntry({
    required this.label,
    required this.elapsed,
    required this.recordedAt,
    required this.succeeded,
    this.error,
  });

  final String label;
  final Duration elapsed;
  final DateTime recordedAt;
  final bool succeeded;
  final String? error;

  String get durationLabel {
    final milliseconds = elapsed.inMilliseconds;
    if (milliseconds < 1000) {
      return '$milliseconds ms';
    }
    return '${(milliseconds / 1000).toStringAsFixed(1)} s';
  }

  String get timeLabel {
    final hour = recordedAt.hour.toString().padLeft(2, '0');
    final minute = recordedAt.minute.toString().padLeft(2, '0');
    final second = recordedAt.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }
}

class FrameDiagnosticsSnapshot {
  const FrameDiagnosticsSnapshot({
    required this.sampleCount,
    required this.averageMs,
    required this.worstMs,
    required this.framesOver16ms,
    required this.framesOver33ms,
  });

  factory FrameDiagnosticsSnapshot.fromSamples(List<Duration> samples) {
    if (samples.isEmpty) {
      return empty;
    }

    var totalMicroseconds = 0;
    var worstMicroseconds = 0;
    var over16ms = 0;
    var over33ms = 0;

    for (final sample in samples) {
      final micros = sample.inMicroseconds;
      totalMicroseconds += micros;
      if (micros > worstMicroseconds) {
        worstMicroseconds = micros;
      }
      if (micros > 16667) {
        over16ms++;
      }
      if (micros > 33333) {
        over33ms++;
      }
    }

    return FrameDiagnosticsSnapshot(
      sampleCount: samples.length,
      averageMs: totalMicroseconds / samples.length / 1000,
      worstMs: worstMicroseconds / 1000,
      framesOver16ms: over16ms,
      framesOver33ms: over33ms,
    );
  }

  static const empty = FrameDiagnosticsSnapshot(
    sampleCount: 0,
    averageMs: 0,
    worstMs: 0,
    framesOver16ms: 0,
    framesOver33ms: 0,
  );

  final int sampleCount;
  final double averageMs;
  final double worstMs;
  final int framesOver16ms;
  final int framesOver33ms;

  bool get hasSamples => sampleCount > 0;

  String get averageLabel =>
      hasSamples ? '${averageMs.toStringAsFixed(1)} ms' : 'Waiting';
  String get worstLabel =>
      hasSamples ? '${worstMs.toStringAsFixed(1)} ms' : 'Waiting';
}
