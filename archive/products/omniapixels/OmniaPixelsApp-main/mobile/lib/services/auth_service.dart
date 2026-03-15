import 'package:dio/dio.dart';
import '../models/user_model.dart';
import 'api_client.dart';

class AuthService {
  final ApiClient _apiClient = ApiClient();

  /// Register a new user
  Future<bool> register(String email, String password) async {
    try {
      final response = await _apiClient.dio.post(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['detail'] ?? 'Registration failed');
      }
      throw Exception('An unexpected error occurred during registration.');
    }
  }

  /// Login and store JWT token
  Future<bool> login(String email, String password) async {
    // MOCK BYPASS İÇİN ADMİN KONTROLÜ
    final emailLower = email.toLowerCase().trim();
    if (emailLower == 'admin@omniapixels.com' || emailLower == 'valiantlion@omniapixels.com') {
      await _apiClient.setToken('mock_admin_token_$emailLower');
      print("MOCK LOGIN SUCCESS: $emailLower");
      return true;
    }

    try {
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );
      
      if (response.statusCode == 200) {
        final token = response.data['access_token'];
        if (token != null) {
          await _apiClient.setToken(token);
          return true;
        }
      }
      return false;
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['detail'] ?? 'Login failed');
      }
      throw Exception('An unexpected error occurred during login.');
    }
  }

  /// Get current user profile (also returns real-time credits)
  Future<UserModel> me() async {
    final token = await _apiClient.getToken();
    // MOCK BYPASS KULLANICI DÖNDÜRME
    if (token != null && token.startsWith('mock_admin_token_')) {
      final nameStr = token.contains('admin') ? "Omnia Admin" : "Valiant Lion";
      final emailStr = token.contains('admin') ? "admin@omniapixels.com" : "valiantlion@omniapixels.com";
      return UserModel(
        id: 999,
        email: emailStr,
        isPro: true,
        credits: 9999, // Sınırsız sembolik kredi
      );
    }

    try {
      final response = await _apiClient.dio.get('/auth/me');
      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      }
      throw Exception('Failed to load user profile');
    } catch (e) {
      if (e is DioException) {
        throw Exception(e.response?.data['detail'] ?? 'Profile fetch failed');
      }
      throw Exception('An unexpected error occurred fetching profile.');
    }
  }

  /// Logout user by clearing token
  Future<void> logout() async {
    await _apiClient.clearToken();
  }

  /// Check if user has an active session
  Future<bool> isLoggedIn() async {
    final token = await _apiClient.getToken();
    return token != null;
  }
}
