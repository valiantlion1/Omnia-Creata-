import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A premium Before/After comparison slider widget.
/// Displays two images side by side separated by a draggable divider.
class BeforeAfterSlider extends StatefulWidget {
  final Uint8List beforeImage;
  final Uint8List afterImage;
  final double height;
  final BorderRadius borderRadius;

  const BeforeAfterSlider({
    super.key,
    required this.beforeImage,
    required this.afterImage,
    this.height = 400,
    this.borderRadius = const BorderRadius.all(Radius.circular(16)),
  });

  @override
  State<BeforeAfterSlider> createState() => _BeforeAfterSliderState();
}

class _BeforeAfterSliderState extends State<BeforeAfterSlider> {
  double _sliderPosition = 0.5; // 0.0 = full after, 1.0 = full before

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: widget.borderRadius,
      child: SizedBox(
        height: widget.height,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final dividerX = width * _sliderPosition;

            return GestureDetector(
              onHorizontalDragUpdate: (details) {
                setState(() {
                  _sliderPosition = (details.localPosition.dx / width).clamp(0.0, 1.0);
                });
                // Haptic feedback at edges
                if (_sliderPosition <= 0.02 || _sliderPosition >= 0.98) {
                  HapticFeedback.lightImpact();
                }
              },
              onHorizontalDragStart: (_) {
                HapticFeedback.selectionClick();
              },
              child: Stack(
                children: [
                  // After image (full width, behind)
                  Positioned.fill(
                    child: Image.memory(
                      widget.afterImage,
                      fit: BoxFit.cover,
                      gaplessPlayback: true,
                    ),
                  ),

                  // Before image (clipped to left side)
                  Positioned.fill(
                    child: ClipRect(
                      clipper: _LeftClipper(dividerX),
                      child: Image.memory(
                        widget.beforeImage,
                        fit: BoxFit.cover,
                        gaplessPlayback: true,
                      ),
                    ),
                  ),

                  // Divider line
                  Positioned(
                    left: dividerX - 1.5,
                    top: 0,
                    bottom: 0,
                    child: Container(
                      width: 3,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.5),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Drag handle (circle)
                  Positioned(
                    left: dividerX - 20,
                    top: (widget.height / 2) - 20,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.4),
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.drag_indicator,
                        color: Colors.black54,
                        size: 20,
                      ),
                    ),
                  ),

                  // "ÖNCE" label (top-left)
                  Positioned(
                    left: 12,
                    top: 12,
                    child: _buildLabel('ÖNCE'),
                  ),

                  // "SONRA" label (top-right)
                  Positioned(
                    right: 12,
                    top: 12,
                    child: _buildLabel('SONRA'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

/// Custom clipper to clip the left portion of the before image
class _LeftClipper extends CustomClipper<Rect> {
  final double dividerX;
  _LeftClipper(this.dividerX);

  @override
  Rect getClip(Size size) {
    return Rect.fromLTRB(0, 0, dividerX, size.height);
  }

  @override
  bool shouldReclip(_LeftClipper oldClipper) {
    return oldClipper.dividerX != dividerX;
  }
}
