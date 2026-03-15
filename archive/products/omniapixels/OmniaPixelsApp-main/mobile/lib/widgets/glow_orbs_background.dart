import 'dart:math';
import 'package:flutter/material.dart';

class GlowOrbsBackground extends StatefulWidget {
  final Color baseColor;
  
  const GlowOrbsBackground({
    super.key,
    required this.baseColor,
  });

  @override
  State<GlowOrbsBackground> createState() => _GlowOrbsBackgroundState();
}

class _GlowOrbsBackgroundState extends State<GlowOrbsBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<_Orb> _orbs;
  final Random _rnd = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
    
    _initOrbs();
  }

  void _initOrbs() {
    _orbs = List.generate(4, (index) {
      return _Orb(
        x: _rnd.nextDouble(),
        y: _rnd.nextDouble(),
        radius: 100.0 + _rnd.nextDouble() * 150.0,
        speedX: (_rnd.nextDouble() - 0.5) * 0.2,
        speedY: (_rnd.nextDouble() - 0.5) * 0.2,
        opacity: 0.05 + _rnd.nextDouble() * 0.1, // Very subtle, 0.05 - 0.15
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size.infinite,
          painter: _OrbsPainter(
            orbs: _orbs,
            baseColor: widget.baseColor,
            progress: _controller.value,
          ),
        );
      },
    );
  }
}

class _Orb {
  double x;
  double y;
  double radius;
  double speedX;
  double speedY;
  double opacity;

  _Orb({
    required this.x,
    required this.y,
    required this.radius,
    required this.speedX,
    required this.speedY,
    required this.opacity,
  });
}

class _OrbsPainter extends CustomPainter {
  final List<_Orb> orbs;
  final Color baseColor;
  final double progress;

  _OrbsPainter({
    required this.orbs,
    required this.baseColor,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (var orb in orbs) {
      // Calculate current position based on continuous progress
      // We use sin/cos to make them move in complex paths without leaving screen entirely
      
      final dx = size.width * (orb.x + sin(progress * pi * 2 * orb.speedX * 10) * 0.3);
      final dy = size.height * (orb.y + cos(progress * pi * 2 * orb.speedY * 10) * 0.3);
      
      // Keep inside bounds visually
      final cx = dx.clamp(-50.0, size.width + 50.0);
      final cy = dy.clamp(-50.0, size.height + 50.0);

      final paint = Paint()
        ..shader = RadialGradient(
          colors: [
            baseColor.withOpacity(orb.opacity),
            baseColor.withOpacity(orb.opacity * 0.3),
            Colors.transparent,
          ],
          stops: const [0.0, 0.4, 1.0],
        ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: orb.radius));

      canvas.drawCircle(Offset(cx, cy), orb.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _OrbsPainter oldDelegate) => true;
}
