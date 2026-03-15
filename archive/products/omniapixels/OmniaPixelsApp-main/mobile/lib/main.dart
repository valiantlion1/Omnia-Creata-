import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';
import 'theme/app_theme.dart';
import 'utils/app_router.dart';
import 'providers/theme_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/gallery_provider.dart';
import 'providers/credit_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => GalleryProvider()),
        ChangeNotifierProvider(create: (_) => CreditProvider()),
        ProxyProvider<AuthProvider, AppRouter>(
          update: (context, authProvider, previous) => previous ?? AppRouter(authProvider),
        )
      ],
      child: const OmniaPixelsApp(),
    ),
  );
}


class OmniaPixelsApp extends StatelessWidget {
  const OmniaPixelsApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final appRouter = Provider.of<AppRouter>(context, listen: false);

    ThemeMode getThemeMode(AppThemeMode mode) {
      switch (mode) {
        case AppThemeMode.light:
          return ThemeMode.light;
        case AppThemeMode.dark:
        case AppThemeMode.amoled:
        default:
          return ThemeMode.dark;
      }
    }

    ThemeData getDarkThemeData(AppThemeMode mode) {
      if (mode == AppThemeMode.amoled) return AppTheme.amoledTheme;
      return AppTheme.darkTheme;
    }

    return MaterialApp.router(
      title: 'OmniaPixels',
      theme: AppTheme.lightTheme,
      darkTheme: getDarkThemeData(themeProvider.themeMode),
      themeMode: getThemeMode(themeProvider.themeMode),
      routerConfig: appRouter.router,
      debugShowCheckedModeBanner: false,
      locale: themeProvider.locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('tr'),
        Locale('en'),
      ],
    );
  }
}
