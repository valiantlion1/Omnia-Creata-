import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/theme_provider.dart';

class MainScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainScreen({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;

    return Container(
      decoration: BoxDecoration(
        color: colors.background.withOpacity(0.8),
        border: Border(top: BorderSide(color: colors.borderLight, width: 1)),
      ),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 16.0,
                vertical: 8.0,
              ),
              child: BottomNavigationBar(
                elevation: 0,
                backgroundColor: Colors.transparent,
                currentIndex: navigationShell.currentIndex,
                onTap: (index) {
                  navigationShell.goBranch(
                    index,
                    initialLocation: index == navigationShell.currentIndex,
                  );
                },
                type: BottomNavigationBarType.fixed,
                selectedItemColor: Theme.of(context).primaryColor,
                unselectedItemColor: Theme.of(
                  context,
                ).textTheme.bodyMedium?.color,
                selectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.normal,
                  fontSize: 12,
                ),
                items: [
                  BottomNavigationBarItem(
                    icon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.home_outlined),
                    ),
                    activeIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.home),
                    ),
                    label: l.navHome,
                  ),
                  BottomNavigationBarItem(
                    icon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.add_photo_alternate_outlined),
                    ),
                    activeIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.add_photo_alternate),
                    ),
                    label: l.navEditor,
                  ),
                  BottomNavigationBarItem(
                    icon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.photo_library_outlined),
                    ),
                    activeIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.photo_library),
                    ),
                    label: l.navGallery,
                  ),
                  BottomNavigationBarItem(
                    icon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.person_outline),
                    ),
                    activeIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 6),
                      child: Icon(Icons.person),
                    ),
                    label: l.navProfile,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
