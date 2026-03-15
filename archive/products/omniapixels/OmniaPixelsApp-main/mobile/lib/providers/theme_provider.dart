import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

enum AppThemeMode {
  dark,
  amoled,
  light,
}

class ThemeProvider extends ChangeNotifier {
  AppThemeMode _themeMode = AppThemeMode.dark;
  Locale _locale = const Locale('tr');

  AppThemeMode get themeMode => _themeMode;
  Locale get locale => _locale;

  AppColors get colors {
    switch (_themeMode) {
      case AppThemeMode.amoled:
        return AppColors.amoled;
      case AppThemeMode.light:
        return AppColors.light;
      case AppThemeMode.dark:
      default:
        return AppColors.dark;
    }
  }

  ThemeProvider() {
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();

    // Load theme
    final savedTheme = prefs.getString('themeMode') ?? 'dark';
    switch (savedTheme) {
      case 'amoled':
        _themeMode = AppThemeMode.amoled;
        break;
      case 'light':
        _themeMode = AppThemeMode.light;
        break;
      case 'dark':
      default:
        _themeMode = AppThemeMode.dark;
    }

    // Load locale
    final savedLocale = prefs.getString('locale') ?? 'tr';
    _locale = Locale(savedLocale);

    notifyListeners();
  }

  Future<void> setTheme(AppThemeMode mode) async {
    if (_themeMode == mode) return;
    
    _themeMode = mode;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('themeMode', mode.name);
  }

  Future<void> setLocale(Locale newLocale) async {
    if (_locale == newLocale) return;

    _locale = newLocale;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('locale', newLocale.languageCode);
  }
}
