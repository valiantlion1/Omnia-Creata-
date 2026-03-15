import 'package:dio/dio.dart';
import 'package:dio_retry/dio_retry.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:8000/v1'; // TODO: Use environment config
  late Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: Duration(seconds: 30),
      receiveTimeout: Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add retry interceptor
    _dio.interceptors.add(
      RetryInterceptor(
        dio: _dio,
        logPrint: print,
        retries: 3,
        retryDelays: const [
          Duration(seconds: 1),
          Duration(seconds: 2),
          Duration(seconds: 3),
        ],
      ),
    );
  }

  // Get presigned upload URL
  Future<Map<String, dynamic>> getUploadUrl(String filename) async {
    try {
      final response = await _dio.get('/storage/presigned_put', 
        queryParameters: {'filename': filename});
      return response.data;
    } catch (e) {
      throw Exception('Failed to get upload URL: $e');
    }
  }

  // Create processing job
  Future<Map<String, dynamic>> createJob({
    required String processingType,
    required String inputKey,
    String? presetName,
    Map<String, dynamic>? parameters,
  }) async {
    try {
      final response = await _dio.post('/jobs', data: {
        'processing_type': processingType,
        'input_key': inputKey,
        'preset_name': presetName,
        'parameters': parameters,
      });
      return response.data;
    } catch (e) {
      throw Exception('Failed to create job: $e');
    }
  }

  // Get job status
  Future<Map<String, dynamic>> getJobStatus(int jobId) async {
    try {
      final response = await _dio.get('/jobs/$jobId');
      return response.data;
    } catch (e) {
      throw Exception('Failed to get job status: $e');
    }
  }

  // Get available models
  Future<List<dynamic>> getModels() async {
    try {
      final response = await _dio.get('/models');
      return response.data;
    } catch (e) {
      throw Exception('Failed to get models: $e');
    }
  }

  // Get presets
  Future<Map<String, dynamic>> getPresets() async {
    try {
      final response = await _dio.get('/presets');
      return response.data;
    } catch (e) {
      throw Exception('Failed to get presets: $e');
    }
  }

  // Cancel job
  Future<void> cancelJob(int jobId) async {
    try {
      await _dio.delete('/jobs/$jobId');
    } catch (e) {
      throw Exception('Failed to cancel job: $e');
    }
  }
}
