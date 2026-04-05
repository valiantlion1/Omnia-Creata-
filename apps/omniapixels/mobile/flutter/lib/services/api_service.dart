import 'dart:io';
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';

class ApiService {
  late final Dio _dio;

  ApiService({required authService}) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = Supabase.instance.client.auth.currentSession?.accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  // Models & Presets
  Future<List<dynamic>> getModels() async {
    final res = await _dio.get('/v1/models');
    return res.data;
  }

  Future<Map<String, dynamic>> getPresets() async {
    final res = await _dio.get('/v1/presets');
    return res.data;
  }

  // Upload & Jobs
  Future<Map<String, dynamic>> getUploadUrl(String filename) async {
    final res = await _dio.get('/v1/storage/presigned_put',
        queryParameters: {'filename': filename});
    return res.data;
  }

  Future<void> uploadFileToUrl(String url, File file) async {
    final bytes = await file.readAsBytes();
    await _dio.put(url,
        data: Stream.fromIterable([bytes]),
        options: Options(headers: {
          'Content-Length': bytes.length,
          'Content-Type': 'image/jpeg',
        }));
  }

  Future<Map<String, dynamic>> createJob({
    required String processingType,
    required String inputKey,
    String? presetName,
    Map<String, dynamic>? parameters,
  }) async {
    final res = await _dio.post('/v1/jobs', queryParameters: {
      'processing_type': processingType,
      'input_key': inputKey,
      if (presetName != null) 'preset_name': presetName,
    });
    return res.data;
  }

  Future<Map<String, dynamic>> getJobStatus(int jobId) async {
    final res = await _dio.get('/v1/jobs/$jobId');
    return res.data;
  }

  Future<void> cancelJob(int jobId) async {
    await _dio.delete('/v1/jobs/$jobId');
  }
}
