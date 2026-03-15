import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/service.dart';

final servicesProvider = StateNotifierProvider<ServicesNotifier, List<Service>>((ref) => ServicesNotifier(ref));
final weightsProvider = StateNotifierProvider<WeightsNotifier, Weights>((ref) => WeightsNotifier());

class ServicesNotifier extends StateNotifier<List<Service>> {
  final Ref ref;
  ServicesNotifier(this.ref) : super([]) {
    _load();
  }

  Future<void> _load() async {
    final sp = await SharedPreferences.getInstance();
    final raw = sp.getString('services');
    if (raw != null) {
      state = Service.decodeList(raw);
    } else {
      // Seed with three services
      state = [
        Service(
          id: 'chatgpt',
          name: 'ChatGPT Plus',
          priceTryMonthly: 650,
          features: ['GPT-5', 'Görsel üretim', 'Gelişmiş Ses', 'Ekran Paylaşımı'],
          website: 'https://chat.openai.com',
          modelPower: 5, visualQuality: 4.5, video: 2, integration: 2, privacy: 4, value: 4.5,
          notes: 'Omurga asistan.',
        ),
        Service(
          id: 'google_ai_pro',
          name: 'Google AI Pro',
          priceTryMonthly: 799,
          features: ['Gemini 2.5 Pro', 'Veo 3 video', 'NotebookLM', 'Gemini Live'],
          website: 'https://gemini.google.com',
          modelPower: 4.5, visualQuality: 3.5, video: 5, integration: 5, privacy: 3.5, value: 4,
          notes: 'Android + Video güçlü.',
        ),
        Service(
          id: 'supergrok',
          name: 'SuperGrok',
          priceTryMonthly: 1299.99,
          features: ['Grok 4', 'Gerçek zaman arama', 'Görsel/Video hızlı'],
          website: 'https://x.ai',
          modelPower: 4.2, visualQuality: 3.5, video: 2.5, integration: 2, privacy: 3.5, value: 2.8,
          notes: 'Dönemsel kullanım önerilir.',
        ),
      ];
      _save();
    }
  }

  Future<void> _save() async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString('services', Service.encodeList(state));
  }

  void add(Service s) {
    state = [...state, s];
    _save();
  }

  void update(Service s) {
    state = [for (final x in state) if (x.id == s.id) s else x];
    _save();
  }

  void remove(String id) {
    state = state.where((e) => e.id != id).toList();
    _save();
  }

  Future<String> exportJson() async => Service.encodeList(state);

  Future<void> importJson(String json) async {
    state = Service.decodeList(json);
    await _save();
  }
}

class WeightsNotifier extends StateNotifier<Weights> {
  WeightsNotifier() : super(Weights(modelPower: 1, visualQuality: 2, video: 2, integration: 2, privacy: 1, value: 2));

  void set(Weights w) => state = w;
  void presetErdinc() {
    state = Weights(modelPower: 1, visualQuality: 2.5, video: 2.5, integration: 2.5, privacy: 1, value: 2);
  }
  void reset() => state = Weights();
}
