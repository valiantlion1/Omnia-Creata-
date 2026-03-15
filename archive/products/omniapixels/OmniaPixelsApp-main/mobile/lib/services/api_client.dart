import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Change this to your actual backend URL when not running locally
  // Use 10.0.2.2 for Android emulator to access localhost, or actual IP for physical device
  static const String baseUrl = 'http://localhost:8000'; 

  factory ApiClient() {
    return _instance;
  }

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add Auth Interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Do not add token for login or register endpoints
          if (!options.path.contains('/auth/login') && 
              !options.path.contains('/auth/register')) {
            final token = await _storage.read(key: 'access_token');
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          // You can handle global errors here (e.g., 401 Unauthorized -> Logout user)
          if (e.response?.statusCode == 401) {
            // Handle unauthorized access (e.g., clear token)
            _storage.delete(key: 'access_token');
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<void> setToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'access_token');
  }
}
