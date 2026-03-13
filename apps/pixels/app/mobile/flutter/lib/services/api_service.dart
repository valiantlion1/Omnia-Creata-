import 'package:dio/dio.dart';
import 'package:dio_retry/dio_retry.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:8000/v1'; // TODO: Use environment config
  static const String authUrl = 'http://localhost:8000/auth';
  late Dio _dio;
  String? _accessToken;

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

    // Add auth interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          handler.next(options);
        },
      ),
    );
  }

  // Set access token for authenticated requests
  void setAccessToken(String token) {
    _accessToken = token;
  }

  // Clear access token
  void clearAccessToken() {
    _accessToken = null;
  }

  // Authentication endpoints
  Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    String? fullName,
  }) async {
    try {
      final response = await _dio.post('$authUrl/signup', data: {
        'email': email,
        'password': password,
        'full_name': fullName,
      });
      return response.data;
    } catch (e) {
      throw Exception('Signup failed: $e');
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('$authUrl/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } catch (e) {
      throw Exception('Login failed: $e');
    }
  }

  Future<Map<String, dynamic>> refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post('$authUrl/refresh', data: {
        'refresh_token': refreshToken,
      });
      return response.data;
    } catch (e) {
      throw Exception('Token refresh failed: $e');
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await _dio.get('$authUrl/me');
      return response.data;
    } catch (e) {
      throw Exception('Failed to get user info: $e');
    }
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
