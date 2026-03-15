import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'screens/home_screen.dart';
import 'screens/upload_screen.dart';
import 'screens/processing_screen.dart';
import 'screens/result_screen.dart';
import 'screens/auth/login_screen.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Set up Crashlytics
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
  
  runApp(OmniaPixelsApp());
}

class OmniaPixelsApp extends StatefulWidget {
  @override
  _OmniaPixelsAppState createState() => _OmniaPixelsAppState();
}

class _OmniaPixelsAppState extends State<OmniaPixelsApp> {
  final ApiService _apiService = ApiService();
  final AuthService _authService = AuthService();
  bool _isLoggedIn = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final isLoggedIn = await _authService.isLoggedIn();
    if (isLoggedIn) {
      final accessToken = await _authService.getAccessToken();
      if (accessToken != null) {
        _apiService.setAccessToken(accessToken);
      }
    }
    
    setState(() {
      _isLoggedIn = isLoggedIn;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniaPixels',
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        cardTheme: CardTheme(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
      home: _isLoading 
          ? Scaffold(body: Center(child: CircularProgressIndicator()))
          : _isLoggedIn ? HomeScreen() : LoginScreen(),
      routes: {
        '/home': (context) => HomeScreen(),
        '/login': (context) => LoginScreen(),
        '/upload': (context) => UploadScreen(),
        '/processing': (context) => ProcessingScreen(),
        '/result': (context) => ResultScreen(),
      },
    );
  }
}
