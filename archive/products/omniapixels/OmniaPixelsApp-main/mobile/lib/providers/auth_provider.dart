import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

enum AuthStatus {
  unauthenticated, // First time launch / Logged out
  guest,           // Chose "Continue as Guest"
  authenticated,   // Fully logged in via API
}

class AuthProvider extends ChangeNotifier {
  AuthStatus _authStatus = AuthStatus.unauthenticated;
  UserModel? _user;
  final AuthService _authService = AuthService();

  AuthStatus get authStatus => _authStatus;
  UserModel? get user => _user;

  AuthProvider() {
    _initAuth();
  }

  Future<void> _initAuth() async {
    try {
      final isLoggedIn = await _authService.isLoggedIn();
      if (isLoggedIn) {
        _user = await _authService.me();
        _authStatus = AuthStatus.authenticated;
      } else {
        _authStatus = AuthStatus.unauthenticated;
      }
    } catch (e) {
      // If token expired or invalid, default to unauthenticated
      _authStatus = AuthStatus.unauthenticated;
      await _authService.logout();
    }
    notifyListeners();
  }

  Future<void> loginAsGuest() async {
    _authStatus = AuthStatus.guest;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final success = await _authService.login(email, password);
    if (success) {
      _user = await _authService.me();
      _authStatus = AuthStatus.authenticated;
      notifyListeners();
    } else {
      throw Exception("Login failed");
    }
  }

  Future<void> register(String email, String password) async {
    final success = await _authService.register(email, password);
    if (!success) {
      throw Exception("Registration failed");
    }
  }

  Future<void> refreshProfile() async {
    if (_authStatus == AuthStatus.authenticated) {
      try {
        _user = await _authService.me();
        notifyListeners();
      } catch (e) {
        // Ignore background refresh errors
      }
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _authStatus = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
