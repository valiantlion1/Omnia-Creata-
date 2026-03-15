import 'package:flutter/material.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ayarlar')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _Section(title: 'Genel', children: [
            SwitchListTile(value: true, onChanged: null, title: Text('Materyal 3')), 
          ]),
          _Section(title: 'Performans', children: [
            ListTile(title: Text('Düşük güç modu'), subtitle: Text('Pil düşükken optimize et')),
          ]),
          _Section(title: 'Gizlilik', children: [
            ListTile(title: Text('Telemetri'), subtitle: Text('Kullanım istatistiklerini paylaş')),
          ]),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        Card(
          child: Column(children: children),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

