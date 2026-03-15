import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/premium_ui.dart';
import '../widgets/glow_orbs_background.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;
    final user = context.watch<AuthProvider>().user;
    
    String displayName = user != null && user.email != null ? user.email!.split('@')[0] : "Misafir";

    return Scaffold(
      backgroundColor: colors.background,
      body: Stack(
        children: [
          Positioned.fill(
             child: GlowOrbsBackground(
               baseColor: colors.accentBlue,
             ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(top: 24, bottom: 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Title / Logo
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Image.asset('assets/images/logo.png', width: 32, height: 32),
                            const SizedBox(width: 12),
                            Text(
                              l.appName,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: colors.textPrimary,
                                letterSpacing: -0.5,
                              ),
                            )
                          ],
                        ),
                        InkWell(
                          onTap: () => context.push('/paywall'),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: colors.accentGold.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: colors.accentGold.withOpacity(0.5)),
                            ),
                            child: Text(
                              "PRO", 
                              style: TextStyle(
                                color: colors.accentGold, 
                                fontWeight: FontWeight.bold, 
                                fontSize: 13
                              )
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Welcome Text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Hoş geldin, $displayName",
                          style: TextStyle(color: colors.textSecondary, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Bugün ne yaratmak istersin?",
                          style: TextStyle(
                            color: colors.textPrimary, 
                            fontSize: 28, 
                            fontWeight: FontWeight.w800, 
                            letterSpacing: -1.0
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Call To Action (Main)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: AnimatedFadeInUp(
                      delay: const Duration(milliseconds: 100),
                      child: InkWell(
                        onTap: () => context.go('/editor_hub'),
                        borderRadius: BorderRadius.circular(24),
                        child: PremiumGlassCard(
                          borderRadius: 24,
                          isAccent: true,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
                            child: Column(
                              children: [
                                Icon(Icons.stars_rounded, size: 48, color: colors.accentGold),
                                const SizedBox(height: 16),
                                Text(
                                  "Yapay Zeka Stüdyosu",
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  "Fotoğraflarını profesyonelce düzenle,\nNetleştir, Arka Plan sil ve daha fazlası...",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: colors.textSecondary,
                                    fontSize: 14,
                                    height: 1.4,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [colors.accentGold, colors.accentGoldLight],
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: colors.premiumShadow,
                                  ),
                                  child: Text(
                                    "Stüdyoya Git",
                                    style: TextStyle(
                                      color: colors.background,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                )
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Feed / News / Tips
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Text(
                      "İlham Panosu",
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Horizontal feed
                  SizedBox(
                    height: 220,
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      scrollDirection: Axis.horizontal,
                      children: [
                        _buildFeedCard(
                          colors,
                          "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500",
                          "Yeni: 4x Ultra Upscale",
                          "Fotoğraflarınızı daha da büyütün.",
                          0,
                        ),
                        const SizedBox(width: 16),
                        _buildFeedCard(
                          colors,
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
                          "Topluluk: Haftanın En İyileri",
                          "Kullanıcılarımızın şaheserleri.",
                          100,
                        ),
                        const SizedBox(width: 16),
                        _buildFeedCard(
                          colors,
                          "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=500",
                          "İpucu: Inpaint Nasıl Kullanılır?",
                          "İstenmeyen objeleri yok etme rehberi.",
                          200,
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildFeedCard(AppColors colors, String imgUrl, String title, String subtitle, int delayMs) {
    return AnimatedFadeInUp(
      delay: Duration(milliseconds: delayMs),
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: colors.borderLight),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(imgUrl, fit: BoxFit.cover),
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [colors.background.withOpacity(0.9), Colors.transparent],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 16,
                left: 12,
                right: 12,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
