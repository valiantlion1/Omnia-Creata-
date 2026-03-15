import 'package:dio/dio.dart';
import '../models/job_model.dart';
import 'api_client.dart';

class JobService {
  final ApiClient _apiClient = ApiClient();

  /// Start a new AI image processing job
  /// [inputKey]: The storage key of the uploaded image
  /// [params]: Configuration for AI like {'upscale_4x': true, 'bg_remove': true}
  Future<JobModel> createJob(String inputKey, {Map<String, dynamic>? params}) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/jobs/',
        data: {
          'queue': 'image_processing',
          'input_key': inputKey,
          'params': params ?? {},
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return JobModel.fromJson(response.data);
      }
      throw Exception('Failed to create job');
    } catch (e) {
      if (e is DioException) {
        // Backend raises 402 if Insufficient Credits
        if (e.response?.statusCode == 402) {
          throw Exception('Yetersiz Kredi! Lütfen kredi yükleyin veya reklam izleyin.');
        }
        throw Exception(e.response?.data['detail'] ?? 'Job creation failed: ${e.message}');
      }
      throw Exception('An unexpected error occurred: $e');
    }
  }

  /// Get the current status of a specific job
  Future<JobModel> getJobStatus(int jobId) async {
    try {
      final response = await _apiClient.dio.get('/api/v1/jobs/id/$jobId');
      
      if (response.statusCode == 200) {
        return JobModel.fromJson(response.data);
      }
      throw Exception('Failed to get job status');
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['detail'] ?? 'Failed to check job status');
      }
      throw Exception('An unexpected error occurred checking status.');
    }
  }
}
