import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Brand Colors (Figma React Exact)
  final Color accentGold;
  final Color accentGoldLight;
  final Color accentRed;
  final Color accentBlue;
  final Color accentGreen;
  final Color accentPurple;
  final Color accentOrange;

  // Backgrounds
  final Color background;
  final Color backgroundSecondary;

  // Text Colors
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;

  // Surfaces & Glassmorphism Colors
  final Color surfaceGlassLight;
  final Color surfaceGlass;
  final Color surfaceGlassMedium;
  final Color surfaceGlassStrong;

  // Borders
  final Color borderFaint;
  final Color borderLight;
  final Color borderMedium;
  final Color borderStrong;

  const AppColors({
    required this.accentGold,
    required this.accentGoldLight,
    required this.accentRed,
    required this.accentBlue,
    required this.accentGreen,
    required this.accentPurple,
    required this.accentOrange,
    required this.background,
    required this.backgroundSecondary,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.surfaceGlassLight,
    required this.surfaceGlass,
    required this.surfaceGlassMedium,
    required this.surfaceGlassStrong,
    required this.borderFaint,
    required this.borderLight,
    required this.borderMedium,
    required this.borderStrong,
  });

  // Base brand colors
  static const _gold = Color(0xFFC9A84C);
  static const _goldLight = Color(0xFFE8C97A);

  List<BoxShadow> get premiumShadow => [
    BoxShadow(
      color: accentGold.withOpacity(0.35),
      blurRadius: 25,
      offset: const Offset(0, 0),
    ),
    BoxShadow(
      color: Colors.black.withOpacity(0.4),
      blurRadius: 20,
      offset: const Offset(0, 4),
    )
  ];

  static const amoled = AppColors(
    accentGold: _gold,
    accentGoldLight: _goldLight,
    accentRed: Color(0xFFE05656),
    accentBlue: Color(0xFF4A90D9),
    accentGreen: Color(0xFF3DBA8C),
    accentPurple: Color(0xFFB07DD9),
    accentOrange: Color(0xFFE8A830),
    background: Color(0xFF060608),           // Pure Deep AMOLED Black
    backgroundSecondary: Color(0xFF0E0E18),  // Slightly lighter deep blue-black
    textPrimary: Color(0xFFF0F0FA),
    textSecondary: Color(0xFF8A8A9E),
    textMuted: Color(0xFF6B6B84),
    surfaceGlassLight: Color(0x07FFFFFF),    // 0.03
    surfaceGlass: Color(0x0AFFFFFF),         // 0.04
    surfaceGlassMedium: Color(0x0CFFFFFF),   // 0.05
    surfaceGlassStrong: Color(0x0FFFFFFF),   // 0.06
    borderFaint: Color(0x0FFFFFFF),          // 0.06
    borderLight: Color(0x11FFFFFF),          // 0.07
    borderMedium: Color(0x19FFFFFF),         // 0.10
    borderStrong: Color(0x1FFFFFFF),         // 0.12
  );

  static const dark = AppColors(
    accentGold: _gold,
    accentGoldLight: _goldLight,
    accentRed: Color(0xFFE05656),
    accentBlue: Color(0xFF4A90D9),
    accentGreen: Color(0xFF3DBA8C),
    accentPurple: Color(0xFFB07DD9),
    accentOrange: Color(0xFFE8A830),
    background: Color(0xFF16161D),           // Standard dark gray-blue
    backgroundSecondary: Color(0xFF1E1E28),
    textPrimary: Color(0xFFF0F0FA),
    textSecondary: Color(0xFF9A9AA8),
    textMuted: Color(0xFF7A7A8A),
    surfaceGlassLight: Color(0x08FFFFFF),
    surfaceGlass: Color(0x0DFFFFFF),
    surfaceGlassMedium: Color(0x12FFFFFF),
    surfaceGlassStrong: Color(0x1AFFFFFF),
    borderFaint: Color(0x12FFFFFF),
    borderLight: Color(0x17FFFFFF),
    borderMedium: Color(0x22FFFFFF),
    borderStrong: Color(0x2AFFFFFF),
  );

  static const light = AppColors(
    accentGold: Color(0xFFB38D2F),            // Slightly darker gold for readability on light background
    accentGoldLight: _gold,
    accentRed: Color(0xFFD32F2F),
    accentBlue: Color(0xFF1976D2),
    accentGreen: Color(0xFF388E3C),
    accentPurple: Color(0xFF7B1FA2),
    accentOrange: Color(0xFFE65100),
    background: Color(0xFFF7F7F9),           // Off-white background
    backgroundSecondary: Color(0xFFFFFFFF),  // Pure white cards
    textPrimary: Color(0xFF1A1A24),          // Almost black text
    textSecondary: Color(0xFF5A5A68),        // Gray text
    textMuted: Color(0xFF8A8A9E),            // Light gray text
    surfaceGlassLight: Color(0x07000000),    // Black with low opacity for glass on light bg
    surfaceGlass: Color(0x0A000000),
    surfaceGlassMedium: Color(0x0F000000),
    surfaceGlassStrong: Color(0x14000000),
    borderFaint: Color(0x14000000),
    borderLight: Color(0x1A000000),
    borderMedium: Color(0x26000000),
    borderStrong: Color(0x33000000),
  );
}

class AppTheme {
  // Keeping these for backwards compatibility until full refactor is done,
  // but they will point to AMOLED by default so nothing breaks immediately.
  static const Color accentGold = Color(0xFFC9A84C);
  static const Color accentGoldLight = Color(0xFFE8C97A);
  static const Color accentRed = Color(0xFFE05656);
  static const Color accentBlue = Color(0xFF4A90D9);
  static const Color accentGreen = Color(0xFF3DBA8C);
  static const Color accentPurple = Color(0xFFB07DD9);
  static const Color accentOrange = Color(0xFFE8A830);
  static const Color backgroundAMOLED = Color(0xFF060608);
  static const Color backgroundSecondary = Color(0xFF0E0E18);
  static const Color textPrimary = Color(0xFFF0F0FA);
  static const Color textSecondary = Color(0xFF8A8A9E);
  static const Color textMuted = Color(0xFF6B6B84);
  static const Color surfaceGlassLight = Color(0x07FFFFFF);
  static const Color surfaceGlass = Color(0x0AFFFFFF);
  static const Color surfaceGlassMedium = Color(0x0CFFFFFF);
  static const Color surfaceGlassStrong = Color(0x0FFFFFFF);
  static const Color borderFaint = Color(0x0FFFFFFF);
  static const Color borderLight = Color(0x11FFFFFF);
  static const Color borderMedium = Color(0x19FFFFFF); 
  static const Color borderStrong = Color(0x1FFFFFFF);

  static List<BoxShadow> get premiumShadow => AppColors.amoled.premiumShadow;

  static ThemeData get darkTheme => _buildTheme(AppColors.dark, Brightness.dark);
  static ThemeData get lightTheme => _buildTheme(AppColors.light, Brightness.light);
  static ThemeData get amoledTheme => _buildTheme(AppColors.amoled, Brightness.dark);

  static ThemeData _buildTheme(AppColors colors, Brightness brightness) {
    return ThemeData(
      brightness: brightness,
      scaffoldBackgroundColor: colors.background,
      primaryColor: colors.accentGold,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: colors.accentGold,
        onPrimary: colors.background,
        secondary: colors.accentGoldLight,
        onSecondary: colors.background,
        error: colors.accentRed,
        onError: colors.background,
        surface: colors.backgroundSecondary,
        onSurface: colors.textPrimary,
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData(brightness: brightness).textTheme
      ).copyWith(
        displayLarge: GoogleFonts.inter(color: colors.textPrimary, fontWeight: FontWeight.w800, letterSpacing: -0.02 * 40),
        displayMedium: GoogleFonts.inter(color: colors.textPrimary, fontWeight: FontWeight.w800, letterSpacing: -0.02 * 32),
        titleLarge: GoogleFonts.inter(color: colors.textPrimary, fontWeight: FontWeight.w800, letterSpacing: -0.02 * 24),
        titleMedium: GoogleFonts.inter(color: colors.textPrimary, fontWeight: FontWeight.bold),
        bodyLarge: TextStyle(color: colors.textPrimary),
        bodyMedium: TextStyle(color: colors.textSecondary),
        labelLarge: TextStyle(color: colors.textMuted, fontWeight: FontWeight.w600, letterSpacing: 1.2),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceGlass,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colors.accentGold, width: 1.0),
        ),
        hintStyle: TextStyle(color: colors.textMuted, fontSize: 15),
      ),
    );
  }
}
