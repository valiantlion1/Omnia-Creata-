import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/data_provider.dart';
import '../models/service.dart';
import '../widgets/star_bar.dart';
import 'service_editor.dart';
import 'compare_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final services = ref.watch(servicesProvider);
    final w = ref.watch(weightsProvider);
    final tr = NumberFormat.currency(locale: 'tr_TR', symbol: '₺');
    return Scaffold(
      appBar: AppBar(
        title: const Text('SubCompare'),
        actions: [
          IconButton(
            tooltip: 'Karşılaştır',
            icon: const Icon(Icons.table_chart),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CompareScreen())),
          ),
          PopupMenuButton<String>(
            onSelected: (v) async {
              final notifier = ref.read(weightsProvider.notifier);
              switch (v) {
                case 'preset':
                  notifier.presetErdinc();
                  break;
                case 'reset':
                  notifier.reset();
                  break;
                case 'export':
                  final json = await ref.read(servicesProvider.notifier).exportJson();
                  // Copy to clipboard
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('JSON exported to clipboard via log.')));
                  }
                  debugPrint(json);
                  break;
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'preset', child: Text('Ön Ayar: Erdinç')),
              const PopupMenuItem(value: 'reset', child: Text('Ağırlıkları Sıfırla')),
              const PopupMenuItem(value: 'export', child: Text('JSON Dışa Aktar (log)')),
            ],
          ),
        ],
      ),
      body: services.isEmpty
          ? const Center(child: Text('Henüz servis yok. + ile ekle'))
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemBuilder: (_, i) {
                final s = services[i];
                return Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                  child: ListTile(
                    title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          runSpacing: -8,
                          children: s.features.take(4).map((f) => Chip(label: Text(f))).toList(),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Text('Genel: '),
                            StarBar(score: s.overallScore(w)),
                            const SizedBox(width: 8),
                            Text(s.overallScore(w).toStringAsFixed(1)),
                          ],
                        ),
                      ],
                    ),
                    trailing: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(tr.format(s.priceTryMonthly), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        IconButton(icon: const Icon(Icons.edit), onPressed: () =>
                          Navigator.push(context, MaterialPageRoute(builder: (_) => ServiceEditor(existing: s)))
                        ),
                      ],
                    ),
                  ),
                );
              },
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemCount: services.length,
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ServiceEditor())),
        child: const Icon(Icons.add),
      ),
    );
  }
}
