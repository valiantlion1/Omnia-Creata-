import 'package:flutter/material.dart';
import 'package:omniapixels/theme/app_theme.dart';

/// A reusable glassmorphism container that matches the Figma React UI.
class GlassCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final bool border;
  final Color? backgroundColor;

  const GlassCard({
    Key? key,
    required this.child,
    this.borderRadius = 16.0,
    this.padding = const EdgeInsets.all(16.0),
    this.border = true,
    this.backgroundColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? AppTheme.surfaceGlass,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border ? Border.all(color: AppTheme.borderLight) : null,
      ),
      child: child,
    );
  }
}
