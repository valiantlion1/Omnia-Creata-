import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../pages/home_page.dart';
import '../pages/editor_page.dart';
import '../pages/settings_page.dart';

GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: <RouteBase>[
      GoRoute(
        path: '/',
        builder: (context, state) => const HomePage(),
        routes: [
          GoRoute(
            path: 'editor',
            builder: (context, state) {
              final module = state.uri.queryParameters['module'] ?? 'cropper';
              return EditorPage(initialModule: module);
            },
          ),
          GoRoute(
            path: 'settings',
            builder: (context, state) => const SettingsPage(),
          ),
        ],
      ),
    ],
  );
}


