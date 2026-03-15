import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages credits and usage statistics locally.
/// Persists to SharedPreferences.
class CreditProvider extends ChangeNotifier {
  static const String _creditsKey = 'omniapixels_credits';
  static const String _totalEditsKey = 'omniapixels_total_edits';
  static const String _monthEditsKey = 'omniapixels_month_edits';
  static const String _monthKey = 'omniapixels_current_month';
  static const String _lastResetKey = 'omniapixels_last_daily_reset';

  static const int dailyFreeCredits = 10;

  int _credits = 10;
  int _totalEdits = 0;
  int _monthEdits = 0;
  bool _isLoaded = false;
  bool _isAdmin = false; // Admin modu bypass'ı

  int get credits => _credits;
  int get totalEdits => _totalEdits;
  int get monthEdits => _monthEdits;
  bool get isLoaded => _isLoaded;
  bool get isAdmin => _isAdmin;

  CreditProvider() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _credits = prefs.getInt(_creditsKey) ?? dailyFreeCredits;
      _totalEdits = prefs.getInt(_totalEditsKey) ?? 0;
      _monthEdits = prefs.getInt(_monthEditsKey) ?? 0;

      // Check if month changed → reset month counter
      final savedMonth = prefs.getInt(_monthKey) ?? 0;
      final currentMonth = DateTime.now().month;
      if (savedMonth != currentMonth) {
        _monthEdits = 0;
        await prefs.setInt(_monthKey, currentMonth);
        await prefs.setInt(_monthEditsKey, 0);
      }

      // Daily free credit reset
      final lastReset = prefs.getString(_lastResetKey);
      final today = DateTime.now().toIso8601String().substring(0, 10);
      if (lastReset != today) {
        _credits = dailyFreeCredits;
        await prefs.setString(_lastResetKey, today);
        await prefs.setInt(_creditsKey, _credits);
      }
    } catch (_) {
      _credits = dailyFreeCredits;
    }
    _isLoaded = true;
    notifyListeners();
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_creditsKey, _credits);
    await prefs.setInt(_totalEditsKey, _totalEdits);
    await prefs.setInt(_monthEditsKey, _monthEdits);
  }

  /// Use credits for a processing action. Returns false if not enough credits.
  bool useCredits(int amount) {
    if (_isAdmin) {
      // Admin ise sınırsız kredi kullanımı, sayıcılar artar ama kredi aynı kalır.
      _totalEdits++;
      _monthEdits++;
      notifyListeners();
      _save();
      return true;
    }

    if (_credits < amount) return false;
    _credits -= amount;
    _totalEdits++;
    _monthEdits++;
    notifyListeners();
    _save();
    return true;
  }

  /// Admin modunu açıp kapatmak için (Örn: admin email ile giriş yapıldığında)
  void setAdminStatus(bool isAdminStatus) {
    _isAdmin = isAdminStatus;
    if (_isAdmin) {
      // Admin ise sembolik olarak her zaman max krediden (veya 9999) başlatılabilir
      _credits = 9999;
    }
    notifyListeners();
  }

  /// Add credits (from watching ads, purchases, etc.)
  void addCredits(int amount) {
    _credits += amount;
    notifyListeners();
    _save();
  }

  /// Get cost for an action
  static int getCost(String actionName) {
    // Match the costs shown in EditorHub UI
    switch (actionName) {
      case 'autoEnhance':
        return 1;
      case 'upscale2x':
        return 2;
      case 'denoise':
        return 1;
      case 'grayscale':
        return 3;
      case 'vignette':
        return 1;
      default:
        return 1;
    }
  }
}
