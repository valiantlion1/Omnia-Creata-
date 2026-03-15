import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../widgets/premium_ui.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/credit_provider.dart';
import '../l10n/app_localizations.dart';
import '../models/user_model.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isPro = false;
  final Map<String, bool> _toggles = {
    "push": true,
    "email": false,
    "ai_suggest": true,
    "local_mode": true,
    "analytics": false,
    "biometric": false,
  };

  void _toggleSetting(String id) {
    setState(() {
      _toggles[id] = !(_toggles[id] ?? false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeader(colors, l),
              _buildProfileCard(colors, l, user),
              _buildStatsRow(colors, l),
              _buildThemeSelector(colors, l),
              _buildLanguageSelector(colors, l),
              _buildPreferencesToggles(colors, l),
              _buildAccountMenu(colors, l),
              _buildGdprActions(colors, l),
              _buildLogoutButton(colors, l),
              _buildVersionFooter(colors, l),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 36),
          Text(
            l.settingsTitle,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontSize: 17,
              letterSpacing: -0.17, // -0.01em
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 36),
        ],
      ),
    );
  }

  Widget _buildProfileCard(AppColors colors, AppLocalizations l, UserModel? user) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: AnimatedFadeInUp(
        delay: const Duration(milliseconds: 100),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                colors.accentGold.withOpacity(0.08),
                colors.accentGold.withOpacity(0.03),
              ],
            ),
            border: Border.all(color: colors.accentGold.withOpacity(0.15)),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Radial gradient top right
              Positioned(
                top: -30,
                right: -30,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        colors.accentGold.withOpacity(0.05),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.7],
                    ),
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      // Avatar
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: colors.accentGold.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: colors.accentGold.withOpacity(0.3),
                            width: 1.5,
                          ),
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          clipBehavior: Clip.none,
                          children: [
                            Text(
                              "AE",
                              style: TextStyle(
                                color: colors.accentGold,
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Positioned(
                              bottom: -4,
                              right: -4,
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: colors.background,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: colors.accentGold.withOpacity(0.3),
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: colors.accentGreen,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                              Text(
                                user?.email.split('@').first ?? "Misafir",
                                style: TextStyle(
                                  color: colors.textPrimary,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.17,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user?.email ?? "Giriş yapılmadı",
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: colors.textMuted.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: colors.textMuted.withOpacity(0.2),
                                    ),
                                  ),
                                  child: Text(
                                    l.editorFreeLabel,
                                    style: TextStyle(
                                      color: colors.textMuted,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: () => context.push('/paywall'),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: colors.accentGold.withOpacity(
                                        0.15,
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: colors.accentGold.withOpacity(
                                          0.25,
                                        ),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.flash_on_rounded,
                                          color: colors.accentGold,
                                          size: 10,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          l.editorUpgradePro,
                                          style: TextStyle(
                                            color: colors.accentGold,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Credits Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l.settingsDailyUsage,
                        style: TextStyle(
                          color: colors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        "${user?.credits ?? 0} Kredi",
                        style: TextStyle(
                          color: colors.accentGold,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 6, // 1.5 tailwind = ~6px
                    decoration: BoxDecoration(
                      color: colors.surfaceGlassMedium, // 0.08
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: ((user?.credits ?? 0) / 10).clamp(0.0, 1.0),
                      child: Container(
                        decoration: BoxDecoration(
                          color: colors.accentGold,
                          borderRadius: BorderRadius.circular(999),
                          boxShadow: [
                            BoxShadow(
                              color: colors.accentGold.withOpacity(0.5),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow(AppColors colors, AppLocalizations l) {
    final creditProvider = context.watch<CreditProvider>();
    final stats = [
      {'label': l.settingsStatEdits, 'value': '${creditProvider.totalEdits}', 'color': colors.accentGold},
      {'label': l.settingsStatThisMonth, 'value': '${creditProvider.monthEdits}', 'color': colors.accentGreen},
      {'label': l.settingsStatTotalOps, 'value': '${creditProvider.totalEdits}', 'color': colors.accentBlue},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Row(
        children: stats.map((s) {
          return Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4), // gap-2 / 2
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colors.surfaceGlassLight, // 0.03
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.borderLight), // 0.06
              ),
              child: Column(
                children: [
                  Text(
                    s['value'] as String,
                    style: TextStyle(
                      color: s['color'] as Color,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    s['label'] as String,
                    style: TextStyle(color: colors.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildThemeSelector(AppColors colors, AppLocalizations l) {
    final activeTheme = context.watch<ThemeProvider>().themeMode;

    final themes = [
      {
        'id': AppThemeMode.dark,
        'label': l.settingsThemeDark,
        'icon': Icons.dark_mode_outlined,
        'color': colors.accentBlue,
      },
      {
        'id': AppThemeMode.amoled,
        'label': l.settingsThemeAmoled,
        'icon': Icons.dark_mode,
        'color': colors.textPrimary,
      },
      {
        'id': AppThemeMode.light,
        'label': l.settingsThemeLight,
        'icon': Icons.light_mode_outlined,
        'color': colors.accentOrange,
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.settingsTheme.toUpperCase(),
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ), // 0.1em tracking-wider
          ),
          const SizedBox(height: 10),
          Row(
            children: themes.map((t) {
              final isSelected = activeTheme == t['id'];
              final color = t['color'] as Color;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: InkWell(
                    onTap: () => context.read<ThemeProvider>().setTheme(
                      t['id'] as AppThemeMode,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? color.withOpacity(0.08)
                            : colors.surfaceGlassLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? color.withOpacity(0.2)
                              : colors.borderLight,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            t['icon'] as IconData,
                            size: 16,
                            color: isSelected ? color : colors.textMuted,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            t['label'] as String,
                            style: TextStyle(
                              color: isSelected ? color : colors.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector(AppColors colors, AppLocalizations l) {
    final currentLocale = context.watch<ThemeProvider>().locale.languageCode;
    final langs = [
      {'label': "Türkçe", 'code': 'tr'},
      {'label': "English", 'code': 'en'}
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.settingsLanguage.toUpperCase(),
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: langs.map((lang) {
                final isSelected = currentLocale == lang['code'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    onTap: () => context.read<ThemeProvider>().setLocale(Locale(lang['code']!)),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? colors.accentGold.withOpacity(0.12)
                            : colors.surfaceGlassLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? colors.accentGold.withOpacity(0.25)
                              : colors.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          if (isSelected) ...[
                            Icon(
                              Icons.check,
                              color: colors.accentGold,
                              size: 11,
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            lang['label']!,
                            style: TextStyle(
                              color: isSelected
                                  ? colors.accentGold
                                  : colors.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferencesToggles(AppColors colors, AppLocalizations l) {
    final settings = [
      {'id': 'push', 'label': l.settingsNotifications, 'desc': 'İşlem bitti uyarıları'},
      {
        'id': 'email',
        'label': l.settingsEmailSummary,
        'desc': 'Günlük aktivite özeti',
      },
      {
        'id': 'ai_suggest',
        'label': 'AI Önerileri',
        'desc': 'Akıllı düzenleme ipuçları',
      },
      {
        'id': 'local_mode',
        'label': 'Önce Yerel İşlem',
        'desc': 'Gizlilik öncelikli mod',
      },
      {
        'id': 'analytics',
        'label': 'Kullanım Analizi',
        'desc': 'Ürünü iyileştirmemize yardım et',
      },
      {
        'id': 'biometric',
        'label': 'Biyometrik Giriş',
        'desc': 'Parmak izi ile hızlı giriş',
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.settingsAppearance.toUpperCase(),
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.borderLight),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Column(
                children: settings.asMap().entries.map((entry) {
                  final i = entry.key;
                  final s = entry.value;
                  final isOn = _toggles[s['id']] ?? false;

                  return Container(
                    decoration: BoxDecoration(
                      color: i % 2 == 0
                          ? colors.surfaceGlassLight
                          : colors.surfaceGlassMedium.withOpacity(0.01),
                      border: Border(
                        bottom: i < settings.length - 1
                            ? BorderSide(
                                color: colors.borderLight.withOpacity(0.05),
                              )
                            : BorderSide.none,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s['label'] as String,
                                style: TextStyle(
                                  color: colors.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                s['desc'] as String,
                                style: TextStyle(
                                  color: colors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () => _toggleSetting(s['id'] as String),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: 44,
                            height: 24,
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              gradient: isOn
                                  ? LinearGradient(
                                      colors: [
                                        colors.accentGold,
                                        colors.accentGold,
                                      ],
                                    )
                                  : null,
                              color: isOn
                                  ? null
                                  : colors.surfaceGlassMedium.withOpacity(0.1),
                            ),
                            child: AnimatedAlign(
                              duration: const Duration(milliseconds: 200),
                              alignment: isOn
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: isOn
                                      ? Colors.white
                                      : colors.textMuted.withOpacity(0.4),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountMenu(AppColors colors, AppLocalizations l) {
    final items = [
      {
        'icon': Icons.workspace_premium_rounded,
        'label': l.settingsSubscription,
        'desc': l.settingsSubscriptionDesc,
        'color': colors.accentGold,
      },
      {
        'icon': Icons.card_giftcard_rounded,
        'label': l.settingsInviteFriend,
        'desc': l.settingsInviteReward,
        'color': colors.accentPurple,
      },
      {
        'icon': Icons.star_rounded,
        'label': l.settingsRateApp,
        'desc': l.settingsRateDesc,
        'color': colors.accentOrange,
      },
      {
        'icon': Icons.help_outline_rounded,
        'label': l.settingsHelpCenter,
        'desc': l.settingsHelpDesc,
        'color': colors.accentBlue,
      },
      {
        'icon': Icons.description_outlined,
        'label': l.settingsPrivacy,
        'desc': 'GDPR · KVKK',
        'color': colors.textSecondary,
      },
      {
        'icon': Icons.security_rounded,
        'label': 'Güvenlik',
        'desc': '2FA ve güvenlik ayarları',
        'color': colors.accentGreen,
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.settingsAccount.toUpperCase(),
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.borderLight),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Column(
                children: items.asMap().entries.map((entry) {
                  final i = entry.key;
                  final item = entry.value;
                  final color = item['color'] as Color;

                  return Material(
                    color: i % 2 == 0
                        ? colors.surfaceGlassLight
                        : colors.surfaceGlassMedium.withOpacity(0.01),
                    child: InkWell(
                      onTap: () {},
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: i < items.length - 1
                                ? BorderSide(
                                    color: colors.borderLight.withOpacity(0.05),
                                  )
                                : BorderSide.none,
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                item['icon'] as IconData,
                                size: 16,
                                color: color,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['label'] as String,
                                    style: TextStyle(
                                      color: colors.textPrimary,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    item['desc'] as String,
                                    style: TextStyle(
                                      color: colors.textMuted,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.chevron_right,
                              color: colors.textMuted,
                              size: 16,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGdprActions(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () {},
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: colors.surfaceGlass,
                  border: Border.all(color: colors.borderLight),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.share_rounded,
                      color: colors.textSecondary,
                      size: 14,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "Verilerimi İndir",
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: InkWell(
              onTap: () {},
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: colors.accentRed.withOpacity(0.06),
                  border: Border.all(color: colors.accentRed.withOpacity(0.15)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.delete_outline_rounded,
                      color: colors.accentRed,
                      size: 14,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l.settingsDeleteAccount,
                      style: TextStyle(
                        color: colors.accentRed,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: InkWell(
        onTap: () => context.read<AuthProvider>().logout(),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: colors.surfaceGlass,
            border: Border.all(color: colors.borderLight),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.logout_rounded, color: colors.accentRed, size: 16),
              const SizedBox(width: 8),
              Text(
                l.settingsLogout,
                style: TextStyle(
                  color: colors.accentRed,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVersionFooter(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      child: Column(
        children: [
          Text(
            "OmniaPixels v1.0.0-rc · by OmniaCreata",
            style: TextStyle(color: colors.textMuted, fontSize: 11),
          ),
          const SizedBox(height: 4),
          Text(
            "© 2026 Ali Erdinç Yiğitaslan · omniacreata.com",
            style: TextStyle(
              color: colors.textMuted.withOpacity(0.7),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
