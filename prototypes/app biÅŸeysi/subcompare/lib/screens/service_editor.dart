import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../models/service.dart';
import '../providers/data_provider.dart';

class ServiceEditor extends ConsumerStatefulWidget {
  final Service? existing;
  const ServiceEditor({super.key, this.existing});

  @override
  ConsumerState<ServiceEditor> createState() => _ServiceEditorState();
}

class _ServiceEditorState extends ConsumerState<ServiceEditor> {
  final _form = GlobalKey<FormState>();
  late TextEditingController name;
  late TextEditingController price;
  late TextEditingController features;
  late TextEditingController website;
  late TextEditingController notes;
  double modelPower = 0, visualQuality = 0, video = 0, integration = 0, privacy = 0, value = 0;

  @override
  void initState() {
    super.initState();
    final s = widget.existing;
    name = TextEditingController(text: s?.name ?? '');
    price = TextEditingController(text: s?.priceTryMonthly.toString() ?? '');
    features = TextEditingController(text: s?.features.join(', ') ?? '');
    website = TextEditingController(text: s?.website ?? '');
    notes = TextEditingController(text: s?.notes ?? '');
    modelPower = s?.modelPower ?? 0;
    visualQuality = s?.visualQuality ?? 0;
    video = s?.video ?? 0;
    integration = s?.integration ?? 0;
    privacy = s?.privacy ?? 0;
    value = s?.value ?? 0;
  }

  Widget _score(String label, double v, ValueChanged<double> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        Slider(value: v, min: 0, max: 5, divisions: 10, label: v.toStringAsFixed(1), onChanged: onChanged),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Servisi Düzenle' : 'Servis Ekle')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextFormField(controller: name, decoration: const InputDecoration(labelText: 'Ad'), validator: (v) => v!.isEmpty ? 'Zorunlu' : null),
                TextFormField(controller: price, decoration: const InputDecoration(labelText: 'Fiyat (TL/ay)'), keyboardType: TextInputType.number),
                TextFormField(controller: features, decoration: const InputDecoration(labelText: 'Özellikler (virgülle)'), maxLines: 2),
                TextFormField(controller: website, decoration: const InputDecoration(labelText: 'Web adresi')),
                TextFormField(controller: notes, decoration: const InputDecoration(labelText: 'Notlar'), maxLines: 3),
                const SizedBox(height: 12),
                _score('Model Gücü', modelPower, (v) => setState(() => modelPower = v)),
                _score('Görsel Kalitesi', visualQuality, (v) => setState(() => visualQuality = v)),
                _score('Video', video, (v) => setState(() => video = v)),
                _score('Android/Entegrasyon', integration, (v) => setState(() => integration = v)),
                _score('Gizlilik', privacy, (v) => setState(() => privacy = v)),
                _score('Fiyat/Performans', value, (v) => setState(() => value = v)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(child: ElevatedButton(
                      onPressed: () {
                        if (!_form.currentState!.validate()) return;
                        final s = Service(
                          id: widget.existing?.id ?? const Uuid().v4(),
                          name: name.text.trim(),
                          priceTryMonthly: double.tryParse(price.text.trim()) ?? 0,
                          features: features.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList(),
                          website: website.text.trim().isEmpty ? null : website.text.trim(),
                          notes: notes.text.trim().isEmpty ? null : notes.text.trim(),
                          modelPower: modelPower,
                          visualQuality: visualQuality,
                          video: video,
                          integration: integration,
                          privacy: privacy,
                          value: value,
                        );
                        final notifier = ref.read(servicesProvider.notifier);
                        if (widget.existing == null) {
                          notifier.add(s);
                        } else {
                          notifier.update(s);
                        }
                        Navigator.pop(context);
                      },
                      child: const Text('Kaydet'),
                    )),
                    const SizedBox(width: 12),
                    if (isEdit) Expanded(child: OutlinedButton(
                      onPressed: () {
                        ref.read(servicesProvider.notifier).remove(widget.existing!.id);
                        Navigator.pop(context);
                      },
                      child: const Text('Sil'),
                    ))
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
