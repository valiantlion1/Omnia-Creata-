import 'package:flutter/material.dart';
import '../utils/responsive.dart';

class EditorPage extends StatefulWidget {
  final String initialModule;
  const EditorPage({super.key, required this.initialModule});

  @override
  State<EditorPage> createState() => _EditorPageState();
}

class _EditorPageState extends State<EditorPage> {
  late String module;

  @override
  void initState() {
    super.initState();
    module = widget.initialModule;
  }

  @override
  Widget build(BuildContext context) {
    final sidePanel = NavigationRail(
      selectedIndex: _indexFromModule(module),
      onDestinationSelected: (i) => setState(() => module = _moduleFromIndex(i)),
      labelType: isPhone(context) ? NavigationRailLabelType.none : NavigationRailLabelType.selected,
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.crop), label: Text('Crop')),
        NavigationRailDestination(icon: Icon(Icons.image_not_supported_outlined), label: Text('Arka Plan')),
        NavigationRailDestination(icon: Icon(Icons.tune), label: Text('Geliştir')),
        NavigationRailDestination(icon: Icon(Icons.hd_outlined), label: Text('Süper')),
      ],
    );

    final editor = _EditorSurface(module: module);

    return Scaffold(
      appBar: AppBar(title: Text('Düzenleyici - ${module.toUpperCase()}')),
      body: Row(
        children: [
          if (!isPhone(context)) SizedBox(width: 80, child: sidePanel),
          Expanded(child: editor),
        ],
      ),
      bottomNavigationBar: isPhone(context)
          ? NavigationBar(
              selectedIndex: _indexFromModule(module),
              onDestinationSelected: (i) => setState(() => module = _moduleFromIndex(i)),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.crop), label: 'Crop'),
                NavigationDestination(icon: Icon(Icons.image_not_supported_outlined), label: 'Arka Plan'),
                NavigationDestination(icon: Icon(Icons.tune), label: 'Geliştir'),
                NavigationDestination(icon: Icon(Icons.hd_outlined), label: 'Süper'),
              ],
            )
          : null,
    );
  }

  int _indexFromModule(String m) {
    switch (m) {
      case 'cropper':
        return 0;
      case 'bg_remove':
        return 1;
      case 'enhance':
        return 2;
      case 'superres':
        return 3;
      default:
        return 0;
    }
  }

  String _moduleFromIndex(int i) {
    switch (i) {
      case 0:
        return 'cropper';
      case 1:
        return 'bg_remove';
      case 2:
        return 'enhance';
      case 3:
        return 'superres';
      default:
        return 'cropper';
    }
  }
}

class _EditorSurface extends StatelessWidget {
  final String module;
  const _EditorSurface({required this.module});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  'Önizleme Alanı\n($module)',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _Toolbar(module: module),
        ],
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  final String module;
  const _Toolbar({required this.module});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: _actionsForModule(module)
          .map((a) => FilledButton.tonal(onPressed: () {}, child: Text(a)))
          .toList(),
    );
  }

  List<String> _actionsForModule(String m) {
    switch (m) {
      case 'cropper':
        return ['Akıllı', 'Yüz', 'Nesne', 'Oranlı'];
      case 'bg_remove':
        return ['U2Net', 'MODNet', 'API'];
      case 'enhance':
        return ['Oto', 'Renk', 'Keskinlik'];
      case 'superres':
        return ['SwinIR', 'SRCNN'];
      default:
        return ['Aksiyon'];
    }
  }
}

