import 'dart:convert';

class Service {
  final String id;
  String name;
  double priceTryMonthly;
  List<String> features;
  String? website;
  String? notes;

  // Scores 0..5
  double modelPower;
  double visualQuality;
  double video;
  double integration;
  double privacy;
  double value;

  Service({
    required this.id,
    required this.name,
    required this.priceTryMonthly,
    this.features = const [],
    this.website,
    this.notes,
    this.modelPower = 0,
    this.visualQuality = 0,
    this.video = 0,
    this.integration = 0,
    this.privacy = 0,
    this.value = 0,
  });

  double overallScore(Weights w) {
    final totalWeight = w.modelPower + w.visualQuality + w.video + w.integration + w.privacy + w.value;
    if (totalWeight == 0) return 0;
    return (modelPower * w.modelPower +
            visualQuality * w.visualQuality +
            video * w.video +
            integration * w.integration +
            privacy * w.privacy +
            value * w.value) / totalWeight;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'priceTryMonthly': priceTryMonthly,
        'features': features,
        'website': website,
        'notes': notes,
        'modelPower': modelPower,
        'visualQuality': visualQuality,
        'video': video,
        'integration': integration,
        'privacy': privacy,
        'value': value,
      };

  factory Service.fromJson(Map<String, dynamic> j) => Service(
        id: j['id'] as String,
        name: j['name'] as String,
        priceTryMonthly: (j['priceTryMonthly'] as num).toDouble(),
        features: (j['features'] as List).cast<String>(),
        website: j['website'] as String?,
        notes: j['notes'] as String?,
        modelPower: (j['modelPower'] as num).toDouble(),
        visualQuality: (j['visualQuality'] as num).toDouble(),
        video: (j['video'] as num).toDouble(),
        integration: (j['integration'] as num).toDouble(),
        privacy: (j['privacy'] as num).toDouble(),
        value: (j['value'] as num).toDouble(),
      );

  static String encodeList(List<Service> list) => jsonEncode(list.map((e) => e.toJson()).toList());
  static List<Service> decodeList(String s) => (jsonDecode(s) as List).map((e) => Service.fromJson(e)).toList();
}

class Weights {
  double modelPower;
  double visualQuality;
  double video;
  double integration;
  double privacy;
  double value;
  Weights({
    this.modelPower = 1,
    this.visualQuality = 1,
    this.video = 1,
    this.integration = 1,
    this.privacy = 1,
    this.value = 1,
  });

  Map<String, dynamic> toJson() => {
        'modelPower': modelPower,
        'visualQuality': visualQuality,
        'video': video,
        'integration': integration,
        'privacy': privacy,
        'value': value,
      };
  factory Weights.fromJson(Map<String, dynamic> j) => Weights(
        modelPower: (j['modelPower'] as num).toDouble(),
        visualQuality: (j['visualQuality'] as num).toDouble(),
        video: (j['video'] as num).toDouble(),
        integration: (j['integration'] as num).toDouble(),
        privacy: (j['privacy'] as num).toDouble(),
        value: (j['value'] as num).toDouble(),
      );
}
