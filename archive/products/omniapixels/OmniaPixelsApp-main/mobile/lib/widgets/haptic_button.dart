import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A wrapper widget that adds haptic feedback to any tappable child.
/// Use this around buttons, cards, and interactive elements for premium feel.
class HapticButton extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final HapticIntensity intensity;
  final bool enableScale;

  const HapticButton({
    super.key,
    required this.child,
    this.onTap,
    this.intensity = HapticIntensity.light,
    this.enableScale = true,
  });

  @override
  Widget build(BuildContext context) {
    return _HapticButtonInner(
      onTap: onTap,
      intensity: intensity,
      enableScale: enableScale,
      child: child,
    );
  }
}

enum HapticIntensity { light, medium, heavy, selection }

class _HapticButtonInner extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final HapticIntensity intensity;
  final bool enableScale;

  const _HapticButtonInner({
    required this.child,
    this.onTap,
    required this.intensity,
    required this.enableScale,
  });

  @override
  State<_HapticButtonInner> createState() => _HapticButtonInnerState();
}

class _HapticButtonInnerState extends State<_HapticButtonInner>
    with SingleTickerProviderStateMixin {
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _triggerHaptic() {
    switch (widget.intensity) {
      case HapticIntensity.light:
        HapticFeedback.lightImpact();
        break;
      case HapticIntensity.medium:
        HapticFeedback.mediumImpact();
        break;
      case HapticIntensity.heavy:
        HapticFeedback.heavyImpact();
        break;
      case HapticIntensity.selection:
        HapticFeedback.selectionClick();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        if (widget.enableScale) _scaleController.forward();
        _triggerHaptic();
      },
      onTapUp: (_) {
        if (widget.enableScale) _scaleController.reverse();
        widget.onTap?.call();
      },
      onTapCancel: () {
        if (widget.enableScale) _scaleController.reverse();
      },
      child: widget.enableScale
          ? ScaleTransition(
              scale: _scaleAnimation,
              child: widget.child,
            )
          : widget.child,
    );
  }
}
