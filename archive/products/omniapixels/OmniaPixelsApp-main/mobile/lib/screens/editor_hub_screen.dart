import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../widgets/premium_ui.dart';
import 'package:image_picker/image_picker.dart';
import '../services/image_service.dart';
import '../services/zerocost_service.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/credit_provider.dart';
import '../widgets/glow_orbs_background.dart';
import 'processing_screen.dart';

class EditorHubScreen extends StatefulWidget {
  const EditorHubScreen({super.key});

  @override
  State<EditorHubScreen> createState() => _EditorHubScreenState();
}

class _EditorHubScreenState extends State<EditorHubScreen> {
  final int maxCredits = 10;
  final ImageService _imageService = ImageService();
  
  bool _isProcessing = false;
  String _processMessage = "";

  Future<void> _navigateToEditor(XFile pickedFile) async {
    if (!mounted) return;
    context.push('/editor', extra: {'pickedFile': pickedFile});
  }


  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final creditProvider = context.watch<CreditProvider>();
    final int credits = creditProvider.credits;
    
    return Scaffold(
      backgroundColor: colors.background,
      body: Stack(
        children: [
          // THE MISSING PREMIUM BACKGROUND
          Positioned.fill(
             child: GlowOrbsBackground(
               baseColor: colors.accentGold,
             ),
          ),
          SafeArea(
            child: ScrollConfiguration(
              behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(top: 16, bottom: 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildHeader(colors, l, credits, user),
                    const SizedBox(height: 32),
                    _buildGiantTouchCard(colors, l),
                    const SizedBox(height: 32),
                    _buildAiSuggestionBanner(colors, l),
                    const SizedBox(height: 24),
                    _buildRecentEdits(colors, l),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(AppColors colors, AppLocalizations l, int credits, dynamic user) {
    // Dinamik isim belirleme
    String displayName = l.editorNewItem; // "Yeni" v.b. default
    String initials = "AE";
    
    if (user != null) {
      displayName = user.email;
      if (displayName.isNotEmpty && displayName != "Kullanıcı") {
        initials = displayName.substring(0, 1).toUpperCase();
        if (displayName.split(' ').length > 1) {
          initials += displayName.split(' ')[1].substring(0, 1).toUpperCase();
        }
      }
    } else {
      displayName = "Misafir";
      initials = "G";
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                // Avatar
                Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [colors.accentGold, colors.accentGoldLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(color: colors.accentGold.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Karşılama Yazısı (Taşmaları önlemek için Expanded)
              Expanded(
                child: InkWell(
                  onTap: () => context.go('/settings'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Hoş geldin,",
                        style: TextStyle(color: colors.textSecondary, fontSize: 13),
                      ),
                      Text(
                        displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: colors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          ),
          // Actions
          Row(
            children: [
              // Bildirim Zil İkonu
              InkWell(
                onTap: () {
                  // Profil veya Settings paneline yönlendirme, kullanıcının isteği
                  context.go('/settings');
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: colors.surfaceGlass,
                    shape: BoxShape.circle,
                    border: Border.all(color: colors.borderLight),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Icon(Icons.notifications_outlined, color: colors.textPrimary, size: 20),
                      Positioned(
                        top: 10,
                        right: 12,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.redAccent,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Credits Pill Badge
              InkWell(
                onTap: () => context.push('/paywall'),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: colors.surfaceGlass,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: colors.borderLight),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.bolt_rounded, color: colors.accentGold, size: 16),
                      const SizedBox(width: 4),
                      Text("$credits", style: TextStyle(color: colors.accentGold, fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGiantTouchCard(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: AnimatedFadeInUp(
        delay: const Duration(milliseconds: 100),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () async {
              final pickedFile = await _imageService.pickImageFromGallery();
              if (pickedFile != null && mounted) {
                _navigateToEditor(pickedFile);
              }
            },
            borderRadius: BorderRadius.circular(40),
            splashColor: colors.accentGold.withOpacity(0.1),
            highlightColor: colors.accentGold.withOpacity(0.05),
            child: PremiumGlassCard(
              borderRadius: 40,
              child: SizedBox(
                height: 350,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                  // Subtle inner glow (reduced yellow intensity to avoid "sapsarı" look)
                  Positioned(
                    top: -50,
                    right: -50,
                    child: Container(
                      width: 200, height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(colors: [colors.accentGold.withOpacity(0.05), Colors.transparent], stops: const [0, 0.7]),
                      ),
                    ),
                  ),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80, height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(colors: [colors.accentGold, colors.accentGoldLight], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          boxShadow: colors.premiumShadow,
                        ),
                        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 36),
                      ),
                      const SizedBox(height: 24),
                      Text("Tap to Edit Photo", style: TextStyle(color: colors.textPrimary, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                      const SizedBox(height: 8),
                      Text("AI Enhancement & Upscaling", style: TextStyle(color: colors.textSecondary, fontSize: 14)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAiSuggestionBanner(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: AnimatedFadeInUp(
        delay: const Duration(milliseconds: 500),
        child: PremiumGlassCard(
          borderRadius: 16,
          isAccent: false,
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colors.accentGold.withOpacity(0.12), // 0.12
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.accentGold.withOpacity(0.2)), // 0.2
                ),
                child: Icon(Icons.trending_up, color: colors.accentGold, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.editorAiSuggestion, style: TextStyle(color: colors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(l.editorAiSuggestionDesc, style: TextStyle(color: colors.textSecondary, fontSize: 11, height: 1.2)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: colors.accentGold, size: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentEdits(AppColors colors, AppLocalizations l) {
    final recentPhotos = [
      {'img': 'https://images.unsplash.com/photo-1632776088367-d0709928731e?w=400', 'type': l.editorLabelAiEnhanced, 'stars': true},
      {'img': 'https://images.unsplash.com/photo-1612005660669-006429efefff?w=400', 'type': l.editorLabelBgRemoved, 'stars': false},
      {'img': 'https://images.unsplash.com/photo-1749401640206-19e74ab20409?w=400', 'type': l.editorLabelUpscale, 'stars': true},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l.editorRecentEdits, style: TextStyle(color: colors.textPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
              InkWell(
                onTap: () => context.go('/gallery'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Text(l.editorViewAll, style: TextStyle(color: colors.accentGold, fontSize: 12)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            scrollDirection: Axis.horizontal,
            itemCount: recentPhotos.length + 1,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              if (index == recentPhotos.length) {
                // Add new card
                return InkWell(
                  onTap: () {},
                  child: PremiumGlassCard(
                    borderRadius: 16,
                    child: SizedBox(
                      width: 120,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_rounded, color: colors.textMuted, size: 22),
                          const SizedBox(height: 8),
                          Text(l.editorNewItem, style: TextStyle(color: colors.textMuted, fontSize: 11)),
                        ],
                      ),
                    ),
                  ),
                );
              }

              final photo = recentPhotos[index];
              return AnimatedFadeInUp(
                delay: Duration(milliseconds: 200 + (index * 80)),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    width: 120,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(photo['img'] as String, fit: BoxFit.cover),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 60,
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [colors.background.withOpacity(0.85), Colors.transparent], // 0.85
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          left: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: colors.accentGold.withOpacity(0.8), // 0.8
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              photo['type'] as String,
                              style: TextStyle(color: colors.background, fontSize: 10, fontWeight: FontWeight.w600),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                        if (photo['stars'] == true)
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Icon(Icons.star_rounded, color: colors.accentGold, size: 12),
                          )
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        )
      ],
    );
  }

  Widget _buildStatsRow(AppColors colors, AppLocalizations l) {
    final stats = [
      {'label': l.editorStatEdited, 'val': '47', 'c': colors.accentGold},
      {'label': l.editorStatThisWeek, 'val': '12', 'c': colors.accentGreen},
      {'label': l.editorStatSaved, 'val': '23', 'c': colors.accentBlue},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Row(
        children: stats.map((stat) {
          final color = stat['c'] as Color;
          return Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 6), // 12px gap / 2
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colors.surfaceGlassLight, // 0.03
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colors.borderFaint), // 0.06
              ),
              child: Column(
                children: [
                  Text(stat['val'] as String, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text(stat['label'] as String, style: TextStyle(color: colors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

