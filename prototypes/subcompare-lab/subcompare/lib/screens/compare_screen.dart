import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/data_provider.dart';
import '../widgets/star_bar.dart';

class CompareScreen extends ConsumerWidget {
  const CompareScreen({super.key});

  DataRow _row(String label, double Function(dynamic) getter, List services, BuildContext ctx) {
    return DataRow(cells: [
      DataCell(Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
      for (final s in services)
        DataCell(Row(children: [
          StarBar(score: getter(s)),
          const SizedBox(width: 6),
          Text(getter(s).toStringAsFixed(1)),
        ])),
    ]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final services = ref.watch(servicesProvider);
    final w = ref.watch(weightsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Karşılaştırma')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: services.length < 2
            ? const Center(child: Text('Karşılaştırmak için en az iki servis ekle'))
            : Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          columns: [
                            const DataColumn(label: Text('Kriter/Servis')),
                            for (final s in services) DataColumn(label: Text(s.name)),
                          ],
                          rows: [
                            _row('Model Gücü', (s) => s.modelPower, services, context),
                            _row('Görsel Kalitesi', (s) => s.visualQuality, services, context),
                            _row('Video', (s) => s.video, services, context),
                            _row('Android/Entegrasyon', (s) => s.integration, services, context),
                            _row('Gizlilik', (s) => s.privacy, services, context),
                            _row('Fiyat/Performans', (s) => s.value, services, context),
                            DataRow(cells: [
                              const DataCell(Text('Genel', style: TextStyle(fontWeight: FontWeight.bold))),
                              for (final s in services)
                                DataCell(Row(children: [
                                  StarBar(score: s.overallScore(w), size: 22),
                                  const SizedBox(width: 6),
                                  Text(s.overallScore(w).toStringAsFixed(2)),
                                ])),
                            ]),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text('Öneri', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Builder(builder: (_) {
                        final sorted = [...services]..sort((a,b)=> b.overallScore(w).compareTo(a.overallScore(w)));
                        final best = sorted.first;
                        return Text('En iyi eşleşme: ${best.name}  (Genel: ${best.overallScore(w).toStringAsFixed(2)})');
                      }),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}
