import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../utils/responsive.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final tiles = [
      _HomeTile(
        title: 'Crop',
        subtitle: 'Akıllı kırpma, oranlı kırpma',
        icon: Icons.crop,
        onTap: () => context.go('/editor?module=cropper'),
      ),
      _HomeTile(
        title: 'Arka Plan',
        subtitle: 'Arka plan kaldırma',
        icon: Icons.image_not_supported_outlined,
        onTap: () => context.go('/editor?module=bg_remove'),
      ),
      _HomeTile(
        title: 'Geliştir',
        subtitle: 'Parlaklık, keskinlik, renk',
        icon: Icons.tune,
        onTap: () => context.go('/editor?module=enhance'),
      ),
      _HomeTile(
        title: 'Süper Çözünürlük',
        subtitle: 'SwinIR/ESRGAN ile',
        icon: Icons.hd_outlined,
        onTap: () => context.go('/editor?module=superres'),
      ),
    ];

    final gridCount = isPhone(context) ? 2 : 4;
    final padding = EdgeInsets.symmetric(
      horizontal: isPhone(context) ? 12 : 24,
      vertical: isPhone(context) ? 8 : 16,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('OmniaPixels'),
        actions: [
          IconButton(
            onPressed: () => context.go('/settings'),
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Ayarlar',
          ),
        ],
      ),
      body: Padding(
        padding: padding,
        child: GridView.count(
          crossAxisCount: gridCount,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: tiles,
        ),
      ),
    );
  }
}

class _HomeTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _HomeTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 36),
              const Spacer(),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}


