import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/onboarding_screen.dart';
import '../screens/login_screen.dart';
import '../screens/editor_hub_screen.dart';
import '../screens/queue_screen.dart';
import '../screens/gallery_screen.dart';
import '../screens/settings_screen.dart';

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/onboarding',
    routes: [
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const EditorHubScreen(),
      ),
      GoRoute(
        path: '/queue',
        builder: (context, state) => const QueueScreen(),
      ),
      GoRoute(
        path: '/gallery',
        builder: (context, state) => const GalleryScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
}
