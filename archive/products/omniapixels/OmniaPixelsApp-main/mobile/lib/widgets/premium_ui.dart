import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class PremiumGlassCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final bool isAccent;
  final VoidCallback? onTap;

  const PremiumGlassCard({
    super.key,
    required this.child,
    this.borderRadius = 16.0,
    this.isAccent = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  // Matched exactly to React standard cards: background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)"
                  color: isAccent ? AppTheme.surfaceGlassMedium : AppTheme.surfaceGlass,
                  borderRadius: BorderRadius.circular(borderRadius),
                  border: Border.all(
                    color: isAccent ? AppTheme.accentGold.withOpacity(0.3) : AppTheme.borderLight,
                    width: 1.0,
                  ),
                ),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Fade/Slide animation utilized in AuthScreen & Home React components
class AnimatedFadeInUp extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;

  const AnimatedFadeInUp({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 400),
  });

  @override
  State<AnimatedFadeInUp> createState() => _AnimatedFadeInUpState();
}

class _AnimatedFadeInUpState extends State<AnimatedFadeInUp> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));
    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));

    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: widget.child,
      ),
    );
  }
}
