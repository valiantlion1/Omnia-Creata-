import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/splash_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/login_screen.dart';
import '../screens/home_screen.dart';
import '../screens/editor_hub_screen.dart';
import '../screens/editor_workspace_screen.dart';
import '../screens/queue_screen.dart';
import '../screens/gallery_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/paywall_screen.dart';
import '../screens/main_screen.dart'; // Added MainScreen for ShellRoute
import '../providers/auth_provider.dart';
class AppRouter {
  final AuthProvider authProvider;
  
  AppRouter(this.authProvider);

  late final GoRouter router = GoRouter(
    initialLocation: '/splash',
    // refreshListenable: authProvider, // Web'de MouseTracker hatasını önlemek için manuel yönlendirmeye geçildi.
    redirect: (context, state) {
      final authStatus = authProvider.authStatus;
      final path = state.matchedLocation;
      final isGoingToAuthScreen = path == '/login' || path == '/onboarding' || path == '/splash';
      
      if (authStatus == AuthStatus.unauthenticated && !isGoingToAuthScreen) {
        return '/login'; 
      }

      if ((authStatus == AuthStatus.authenticated || authStatus == AuthStatus.guest) && isGoingToAuthScreen) {
        if (path == '/splash' || path == '/onboarding') {
          // let them pass through splash if needed, but usually we just skip to home if already logged in?
          // For now, let's just skip login
          if (path == '/login') return '/';
        } else {
          return '/';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const CustomSplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/paywall',
        builder: (context, state) => const PaywallScreen(),
      ),
      GoRoute(
        path: '/queue',
        builder: (context, state) => const QueueScreen(),
      ),
      GoRoute(
        path: '/editor',
        builder: (context, state) {
          final extras = state.extra as Map<String, dynamic>?;
          return EditorWorkspaceScreen(pickedFile: extras!['pickedFile']);
        },
      ),
      
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/editor_hub',
                builder: (context, state) => const EditorHubScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/gallery',
                builder: (context, state) => const GalleryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
