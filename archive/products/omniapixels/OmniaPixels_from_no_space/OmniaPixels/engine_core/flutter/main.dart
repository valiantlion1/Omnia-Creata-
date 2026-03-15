import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'lib/router/app_router.dart';
import 'lib/theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: OmniaApp()));
}

class OmniaApp extends ConsumerWidget {
  const OmniaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = createRouter();
    return MaterialApp.router(
      title: 'OmniaPixels',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}


