import 'package:flutter/material.dart';

class StarBar extends StatelessWidget {
  final double score; // 0..5
  final int count;
  final double size;
  const StarBar({super.key, required this.score, this.count = 5, this.size = 18});

  @override
  Widget build(BuildContext context) {
    final full = score.floor();
    final half = (score - full) >= 0.5;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        IconData icon;
        if (i < full) {
          icon = Icons.star;
        } else if (i == full && half) {
          icon = Icons.star_half;
        } else {
          icon = Icons.star_border;
        }
        return Icon(icon, size: size);
      }),
    );
  }
}
