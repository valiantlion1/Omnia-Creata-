import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config.dart';
import 'services/auth_service.dart';
import 'services/api_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/upload_screen.dart';
import 'screens/processing_screen.dart';
import 'screens/result_screen.dart';
import 'screens/gallery_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  runApp(const OmniaPixelsApp());
}

class OmniaPixelsApp extends StatelessWidget {
  const OmniaPixelsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ProxyProvider<AuthService, ApiService>(
          update: (_, auth, __) => ApiService(authService: auth),
        ),
      ],
      child: MaterialApp(
        title: 'OmniaPixels',
        debugShowCheckedModeBanner: false,
        theme: _buildTheme(),
        home: const _AppEntry(),
        routes: {
          '/home': (_) => const HomeScreen(),
          '/login': (_) => const LoginScreen(),
          '/gallery': (_) => const GalleryScreen(),
          '/upload': (_) => const UploadScreen(),
          '/processing': (_) => const ProcessingScreen(),
          '/result': (_) => const ResultScreen(),
        },
      ),
    );
  }

  ThemeData _buildTheme() {
    const primary = Color(0xFF6C3CE1);
    const bg = Color(0xFF0F0F14);
    const surface = Color(0xFF1A1A24);
    const surfaceVariant = Color(0xFF242433);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: primary,
        secondary: const Color(0xFFB06EFF),
        surface: surface,
        surfaceContainerHighest: surfaceVariant,
        onPrimary: Colors.white,
        onSurface: Colors.white,
      ),
      scaffoldBackgroundColor: bg,
      appBarTheme: const AppBarTheme(
        backgroundColor: bg,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}

class _AppEntry extends StatefulWidget {
  const _AppEntry();

  @override
  State<_AppEntry> createState() => _AppEntryState();
}

class _AppEntryState extends State<_AppEntry> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final auth = context.read<AuthService>();
    await auth.init();
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    // DEV: Always go to home, skip auth
    return const HomeScreen();
  }
}
