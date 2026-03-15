import 'dart:math';
import 'package:flutter/material.dart';

/// A premium AI glow/pulse animation widget.
/// Used in processing screens to show AI work in progress.
/// Inspired by Lensa-style aura effects.
class AiGlowAnimation extends StatefulWidget {
  final Color color;
  final double size;
  final Widget? child;
  final bool isActive;

  const AiGlowAnimation({
    super.key,
    this.color = const Color(0xFFD4A853),
    this.size = 200,
    this.child,
    this.isActive = true,
  });

  @override
  State<AiGlowAnimation> createState() => _AiGlowAnimationState();
}

class _AiGlowAnimationState extends State<AiGlowAnimation>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _rotateController;
  late AnimationController _breatheController;
  late Animation<double> _pulseAnim;
  late Animation<double> _breatheAnim;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _rotateController = AnimationController(
      duration: const Duration(seconds: 6),
      vsync: this,
    );

    _breatheController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    );

    _pulseAnim = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _breatheAnim = Tween<double>(begin: 0.85, end: 1.15).animate(
      CurvedAnimation(parent: _breatheController, curve: Curves.easeInOut),
    );

    if (widget.isActive) _startAnimations();
  }

  void _startAnimations() {
    _pulseController.repeat(reverse: true);
    _rotateController.repeat();
    _breatheController.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(AiGlowAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _startAnimations();
    } else if (!widget.isActive && oldWidget.isActive) {
      _pulseController.stop();
      _rotateController.stop();
      _breatheController.stop();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rotateController.dispose();
    _breatheController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: Listenable.merge([_pulseController, _rotateController, _breatheController]),
        builder: (context, child) {
          return CustomPaint(
            painter: _AiGlowPainter(
              pulse: _pulseAnim.value,
              rotation: _rotateController.value * 2 * pi,
              breathe: _breatheAnim.value,
              color: widget.color,
            ),
            child: Center(child: widget.child),
          );
        },
      ),
    );
  }
}

class _AiGlowPainter extends CustomPainter {
  final double pulse;
  final double rotation;
  final double breathe;
  final Color color;

  _AiGlowPainter({
    required this.pulse,
    required this.rotation,
    required this.breathe,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;

    // Layer 1: Outer aura rings (3 concentric)
    for (var i = 4; i >= 0; i--) {
      final r = maxR * (0.4 + i * 0.14) * pulse * breathe;
      final opacity = (0.03 + 0.025 * (4 - i)).clamp(0.0, 1.0);
      final paint = Paint()
        ..color = color.withOpacity(opacity)
        ..style = PaintingStyle.fill
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 15 + i * 5);
      canvas.drawCircle(center, r, paint);
    }

    // Layer 2: Rotating energy arc
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);
    canvas.translate(-center.dx, -center.dy);

    final arcPaint = Paint()
      ..color = color.withOpacity(0.3 * pulse)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxR * 0.55),
      0,
      pi * 1.2,
      false,
      arcPaint,
    );

    // Second arc (opposite direction)
    final arcPaint2 = Paint()
      ..color = color.withOpacity(0.2 * pulse)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxR * 0.42),
      pi,
      pi * 0.8,
      false,
      arcPaint2,
    );
    canvas.restore();

    // Layer 3: Floating particles
    final particlePaint = Paint()
      ..color = color.withOpacity(0.5 * pulse)
      ..style = PaintingStyle.fill;

    for (var i = 0; i < 6; i++) {
      final angle = rotation + (i * pi / 3);
      final dist = maxR * (0.35 + 0.15 * sin(angle * 2)) * breathe;
      final px = center.dx + cos(angle) * dist;
      final py = center.dy + sin(angle) * dist;
      canvas.drawCircle(Offset(px, py), 2.5 * pulse, particlePaint);
    }

    // Layer 4: Inner core glow
    final corePaint = Paint()
      ..color = color.withOpacity(0.12 * pulse)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, maxR * 0.28 * breathe, corePaint);
  }

  @override
  bool shouldRepaint(_AiGlowPainter oldDelegate) => true;
}
