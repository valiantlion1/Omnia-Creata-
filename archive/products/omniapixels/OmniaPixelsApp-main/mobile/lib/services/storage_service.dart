import 'dart:io';
import 'package:dio/dio.dart';
import 'api_client.dart';

class StorageService {
  final ApiClient _apiClient = ApiClient();

  /// Upload a file via multipart form to the backend
  /// Returns the storage key for the uploaded file
  Future<String> uploadFile(File file) async {
    try {
      final fileName = file.path.split('/').last;
      
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: fileName,
        ),
      });

      final response = await _apiClient.dio.post(
        '/storage/upload_multipart',
        data: formData,
      );

      if (response.statusCode == 200) {
        return response.data['key'] as String;
      }
      throw Exception('Upload failed with status: ${response.statusCode}');
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['detail'] ?? 'File upload failed: ${e.message}');
      }
      throw Exception('An unexpected error occurred during upload: $e');
    }
  }

  /// Generate a presigned URL to download a file directly (if supported by backend)
  Future<String> getDownloadUrl(String key) async {
    try {
      final response = await _apiClient.dio.post(
        '/storage/presigned_get',
        data: {'key': key},
      );
      
      if (response.statusCode == 200) {
        return response.data['download_url'] as String;
      }
      throw Exception('Failed to get download URL');
    } catch (e) {
      // Fallback to proxy_get if presigned URL is not available/configured
      return '${ApiClient.baseUrl}/storage/proxy_get?key=$key';
    }
  }
}
