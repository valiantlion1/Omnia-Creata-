import 'package:dio/dio.dart';
import 'dart:io';

class StorageService {
  final Dio _dio = Dio();

  Future<void> uploadFile(File file, String uploadUrl) async {
    try {
      final bytes = await file.readAsBytes();
      
      await _dio.put(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {
            'Content-Type': 'image/jpeg', // TODO: Detect actual content type
          },
        ),
      );
    } catch (e) {
      throw Exception('Failed to upload file: $e');
    }
  }

  Future<File> downloadFile(String downloadUrl, String filename) async {
    try {
      final response = await _dio.download(
        downloadUrl,
        '/tmp/$filename', // TODO: Use proper temp directory
      );
      
      return File('/tmp/$filename');
    } catch (e) {
      throw Exception('Failed to download file: $e');
    }
  }
}
