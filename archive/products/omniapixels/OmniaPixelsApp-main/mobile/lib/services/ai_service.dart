import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'dart:async';
import 'api_client.dart';

class AiServiceException implements Exception {
  final String message;
  AiServiceException(this.message);
  @override
  String toString() => message;
}

class AiService {
  final ApiClient _apiClient = ApiClient();

  /// Process an image via the Backend AI Engine.
  /// 
  /// [inputBytes] The raw image bytes.
  /// [filename] E.g., 'image.jpg'.
  /// [taskType] The type of task: 'enhance', 'upscale', 'remove_bg', 'denoise'.
  /// [params] Additional parameters required by backend, e.g. `{'scale': 4}` for upscale
  /// [onProgress] Callback to report polling progress or loading state.
  Future<Uint8List> processImage({
    required Uint8List inputBytes,
    required String filename,
    required String taskType,
    Map<String, dynamic>? params,
    Function(double)? onProgress,
  }) async {
    try {
      // Step 1: Upload the file
      onProgress?.call(0.1);
      final uploadResponse = await _uploadFile(inputBytes, filename);
      final inputKey = uploadResponse['key'] as String;
      
      // Step 2: Create a job
      onProgress?.call(0.3);
      
      // Merge task_type into params
      final Map<String, dynamic> jobParams = {'task_type': taskType};
      if (params != null) {
        jobParams.addAll(params);
      }
      
      final jobResponse = await _createJob('image_processing', inputKey, jobParams);
      final jobId = jobResponse['id'] as int;
      
      // Step 3: Poll the job until it's 'completed' or 'failed'
      onProgress?.call(0.4);
      final outputKey = await _pollJobStatus(jobId, onProgress);
      
      // Step 4: Download the result
      onProgress?.call(0.9);
      final resultBytes = await _downloadResult(outputKey);
      
      onProgress?.call(1.0);
      return resultBytes;
      
    } catch (e) {
      if (e is AiServiceException) {
        rethrow;
      }
      throw AiServiceException('AI İşlemi başarısız oldu: $e');
    }
  }

  /// Uploads file via Multipart Form Data
  Future<Map<String, dynamic>> _uploadFile(Uint8List bytes, String filename) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });

      final response = await _apiClient.dio.post(
        '/storage/upload_multipart',
        data: formData,
      );
      
      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw AiServiceException('Yükleme başarısız (Status ${response.statusCode})');
      }
    } on DioException catch (e) {
      throw AiServiceException('Yükleme hatası: ${e.response?.data['detail'] ?? e.message}');
    }
  }

  /// Creates a processing job on the backend
  Future<Map<String, dynamic>> _createJob(String queue, String inputKey, Map<String, dynamic> params) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/v1/jobs/',
        data: {
          'queue': queue,
          'input_key': inputKey,
          'params': params,
          'type': 'image_processing', // Required by python enum "JobQueue.image_processing" might just need simple str. 
        },
      );
      
      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw AiServiceException('İş oluşturulamadı (Status ${response.statusCode})');
      }
    } on DioException catch (e) {
      throw AiServiceException('İş kurma hatası: ${e.response?.data['detail'] ?? e.message}');
    }
  }

  /// Polls the job status up to a maximum duration/attempts
  Future<String> _pollJobStatus(int jobId, Function(double)? onProgress) async {
    const int maxAttempts = 60; // Wait up to 60 * 2 = 120 seconds
    const Duration delay = Duration(seconds: 2);
    
    double currentProgress = 0.4; // Starts from 40% after enqueue
    
    for (int i = 0; i < maxAttempts; i++) {
      await Future.delayed(delay);
      
      try {
        final response = await _apiClient.dio.get('/api/v1/jobs/id/$jobId');
        
        if (response.statusCode == 200) {
          final status = response.data['status'] as String;
          
          if (status == 'completed') {
            final outputKey = response.data['output_key'];
            if (outputKey == null) {
              throw AiServiceException('İşlem tamamlandı ancak sonuç bulunamadı.');
            }
            return outputKey as String;
          } else if (status == 'failed') {
            final errorMsg = response.data['error_message'] ?? 'Bilinmeyen hata';
            throw AiServiceException('Sunucu hatası: $errorMsg');
          } else if (status == 'processing') {
            // Processing status might take some time, simulate progress increase roughly up to 85%.
             currentProgress = (currentProgress + 0.05).clamp(0.4, 0.85);
             onProgress?.call(currentProgress);
          }
        }
      } on DioException catch (e) {
        // If connection fails temporarily, we can keep retrying, unless it's a hard error like 404
        if (e.response?.statusCode != 502 && e.response?.statusCode != 503 && e.response?.statusCode != 404) {
           throw AiServiceException('Durum kontrol hatası: ${e.message}');
        }
      }
    }
    
    throw AiServiceException('İşlem zaman aşımına uğradı. Sunucu yanıt vermiyor.');
  }

  /// Downloads the processed file bytes
  Future<Uint8List> _downloadResult(String key) async {
    try {
      final response = await _apiClient.dio.get<List<int>>(
        '/storage/proxy_get',
        queryParameters: {'key': key},
        options: Options(responseType: ResponseType.bytes),
      );
      
      if (response.statusCode == 200 && response.data != null) {
        return Uint8List.fromList(response.data!);
      } else {
        throw AiServiceException('Sonuç indirilemedi (Status ${response.statusCode})');
      }
    } on DioException catch (e) {
      throw AiServiceException('İndirme hatası: ${e.response?.data['detail'] ?? e.message}');
    }
  }
}
