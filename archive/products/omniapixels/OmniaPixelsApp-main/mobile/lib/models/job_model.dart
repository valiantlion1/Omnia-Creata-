class JobModel {
  final int id;
  final String status; // 'pending', 'processing', 'completed', 'failed'
  final String queue;
  final String inputKey;
  final String? outputKey;
  final Map<String, dynamic>? params;

  JobModel({
    required this.id,
    required this.status,
    required this.queue,
    required this.inputKey,
    this.outputKey,
    this.params,
  });

  factory JobModel.fromJson(Map<String, dynamic> json) {
    return JobModel(
      id: json['id'] as int,
      status: json['status'] as String,
      queue: json['queue'] as String,
      inputKey: json['input_key'] as String,
      outputKey: json['output_key'] as String?,
      params: json['params'] != null ? json['params'] as Map<String, dynamic> : null,
    );
  }
}
