import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../services/ad_service.dart';
import '../services/purchase_service.dart';
import '../widgets/glow_orbs_background.dart';

class PlanItem {
  final String id;
  final String name;
  final String price;
  final String? priceYearly;
  final String period;
  final String? tag;
  final Color? tagColor;
  final Color color;
  final IconData icon;
  final String description;
  final List<FeatureItem> features;
  final String cta;
  final bool ctaDisabled;

  PlanItem({
    required this.id,
    required this.name,
    required this.price,
    this.priceYearly,
    required this.period,
    this.tag,
    this.tagColor,
    required this.color,
    required this.icon,
    required this.description,
    required this.features,
    required this.cta,
    required this.ctaDisabled,
  });
}

class FeatureItem {
  final String text;
  final bool included;
  final String? note;

  FeatureItem({required this.text, required this.included, this.note});
}

class CreditPack {
  final int amount;
  final String price;
  final String perCredit;
  final bool popular;

  CreditPack({
    required this.amount,
    required this.price,
    required this.perCredit,
    this.popular = false,
  });
}

class PaywallScreen extends StatefulWidget {
  const PaywallScreen({super.key});

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen>
    with SingleTickerProviderStateMixin {
  String _billing = "monthly";
  String _selectedPlan = "pro";
  final AdService _adService = AdService();
  final PurchaseService _purchaseService = PurchaseService();
  bool _isWatchingAd = false;

  Future<void> _handleWatchAd() async {
    setState(() => _isWatchingAd = true);
    try {
      await _adService.initialize();
      final credits = await _adService.showRewardedAd();
      if (credits > 0) {
        _purchaseService.addAdRewardCredits(credits);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 +$credits kredi kazandın!'),
              backgroundColor: const Color(0xFF4CAF50),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Reklam yüklenemedi: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isWatchingAd = false);
    }
  }

  List<PlanItem> getPlans(AppLocalizations l) => [
    PlanItem(
      id: "free",
      name: l.paywallFreeName,
      price: "₺0",
      period: "",
      color: const Color(0xFF8A8A9E),
      icon: Icons.auto_awesome,
      description: l.paywallFreeDesc,
      features: [
        FeatureItem(text: l.paywallFreeRights, included: true),
        FeatureItem(text: l.paywallFreeUpscale, included: true),
        FeatureItem(text: l.paywallFreeFilters, included: true),
        FeatureItem(text: l.paywallFreeAdReward, included: true),
        FeatureItem(
          text: l.paywallFreeBadge,
          included: true,
          note: l.paywallFreeBadgeNote,
        ),
        FeatureItem(text: l.paywallFreeNoCloud, included: false),
        FeatureItem(text: l.paywallFreeNoUpscale, included: false),
        FeatureItem(text: l.paywallFreeNoFast, included: false),
        FeatureItem(text: l.paywallFreeNoBatch, included: false),
      ],
      cta: l.paywallFreeCta,
      ctaDisabled: true,
    ),
    PlanItem(
      id: "pro",
      name: l.paywallProName,
      price: "₺299",
      priceYearly: "₺2.399",
      period: "/ay",
      tag: l.paywallProTag,
      tagColor: const Color(0xFFC9A84C),
      color: const Color(0xFFC9A84C),
      icon: Icons.workspace_premium, // Crown equivalent
      description: l.paywallProDesc,
      features: [
        FeatureItem(text: l.paywallProUnlimited, included: true),
        FeatureItem(text: l.paywallProAllAi, included: true),
        FeatureItem(text: l.paywallProUpscale, included: true),
        FeatureItem(text: l.paywallProFast, included: true),
        FeatureItem(text: l.paywallProBatch, included: true),
        FeatureItem(text: l.paywallProNoBadge, included: true),
        FeatureItem(text: l.paywallProCloud, included: true),
        FeatureItem(text: l.paywallProStyle, included: true),
        FeatureItem(text: l.paywallProNoAds, included: true),
      ],
      cta: l.paywallProCta,
      ctaDisabled: false,
    ),
    PlanItem(
      id: "enterprise",
      name: l.paywallEntName,
      price: l.paywallEntPrice,
      period: "",
      tag: l.paywallEntTag,
      tagColor: const Color(0xFF4A90D9),
      color: const Color(0xFF4A90D9),
      icon: Icons.business, // Building2 equivalent
      description: l.paywallEntDesc,
      features: [
        FeatureItem(text: "10+ lisans", included: true),
        FeatureItem(text: "Geliştirici araçları", included: true),
        FeatureItem(text: "Markasız kullanım", included: true),
        FeatureItem(text: "Hizmet garantisi", included: true),
        FeatureItem(text: "Özel sunucu", included: true),
        FeatureItem(text: "Admin panel", included: true),
        FeatureItem(text: "Gelişmiş analitik", included: true),
        FeatureItem(text: "Öncelikli destek", included: true),
        FeatureItem(text: "Özel entegrasyonlar", included: true),
      ],
      cta: l.paywallEntCta,
      ctaDisabled: false,
    ),
  ];

  List<CreditPack> getCreditPacks(AppLocalizations l) => [
    CreditPack(amount: 50, price: "₺89", perCredit: "₺1.78"),
    CreditPack(amount: 200, price: "₺239", perCredit: "₺1.19", popular: true),
    CreditPack(amount: 1000, price: "₺599", perCredit: "₺0.60"),
  ];

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;
    final plans = getPlans(l);
    final creditPacks = getCreditPacks(l);

    return Scaffold(
      backgroundColor: colors.background,
      body: Stack(
        children: [
          // Background Glow
          const Positioned.fill(
            child: GlowOrbsBackground(
              baseColor: Color(0xFFC9A84C), // accentGold
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go('/');
                          }
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: colors.surfaceGlassLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: colors.borderLight),
                          ),
                          child: Icon(
                            Icons.arrow_back,
                            size: 18,
                            color: colors.textPrimary,
                          ),
                        ),
                      ),
                      Text(
                        "OmniaPixels Pro",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: colors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 36), // Balance the row
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Hero
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 16,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: colors.accentGold.withOpacity(0.12),
                                  border: Border.all(
                                    color: colors.accentGold.withOpacity(0.25),
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.workspace_premium,
                                      size: 13,
                                      color: colors.accentGold,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      "Premium Üyelik",
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: colors.accentGold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                "Yaratıcılığınıza\n",
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  color: colors.textPrimary,
                                  letterSpacing: -0.52,
                                  height:
                                      0.1, // Tight line height for the gradient text below
                                ),
                                textAlign: TextAlign.center,
                              ),
                              ShaderMask(
                                shaderCallback: (bounds) => LinearGradient(
                                  colors: [
                                    colors.accentGoldLight,
                                    colors.accentGold,
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ).createShader(bounds),
                                child: const Text(
                                  "sınır koyma",
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: -0.52,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                "Pro'ya geç, tüm AI gücünü tek platformda kullan",
                                style: TextStyle(
                                  fontSize: 14,
                                  color: colors.textSecondary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),

                        // Billing Toggle
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 20,
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: colors.surfaceGlass,
                              border: Border.all(color: colors.borderLight),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                _buildBillingBtn("monthly", l.paywallMonthly, colors),
                                _buildBillingBtn(
                                  "yearly",
                                  l.paywallYearly,
                                  colors,
                                  discount: l.paywallYearlySave,
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Plans List
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Column(
                            children: plans
                                .map((plan) => _buildPlanCard(plan, colors))
                                .toList(),
                          ),
                        ),

                        // Divider
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 20,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Divider(
                                  color: colors.surfaceGlassMedium,
                                  thickness: 1,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                ),
                                child: Text(
                                  l.paywallOrBuyRights,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textMuted,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Divider(
                                  color: colors.surfaceGlassMedium,
                                  thickness: 1,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Credit Packs
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            children: creditPacks.map((pack) {
                              return Expanded(
                                child: Padding(
                                  padding: EdgeInsets.only(
                                    right: pack == creditPacks.last ? 0 : 8,
                                  ),
                                  child: _buildCreditPack(pack, colors, l),
                                ),
                              );
                            }).toList(),
                          ),
                        ),

                        // Trust Signals
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 24,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildTrustSignal(
                                  Icons.shield_outlined,
                                  "Güvenli Ödeme",
                                  "SSL şifreli",
                                  const Color(0xFF3DBA8C),
                                  colors,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildTrustSignal(
                                  Icons.star_outline,
                                  "İptal Et",
                                  "İstediğin zaman",
                                  const Color(0xFFC9A84C),
                                  colors,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildTrustSignal(
                                  Icons.card_giftcard,
                                  "Referral",
                                  "Arkadaşını davet et",
                                  const Color(0xFFB07DD9),
                                  colors,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Ecosystem Banner
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 8,
                          ),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 32),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              gradient: LinearGradient(
                                colors: [
                                  colors.accentGold.withOpacity(0.08),
                                  const Color(0xFF4A90D9).withOpacity(0.06),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              border: Border.all(
                                color: colors.accentGold.withOpacity(0.15),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.group,
                                      size: 14,
                                      color: colors.accentGold,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      "Omnia All Access Pass",
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: colors.accentGold,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  "OmniaPixels + OmniaOrganizer + OmniaCreata",
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: colors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "Tek hesap, tüm Omnia ekosistemi. Yakında...",
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: colors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Text(
                                      "Erken Erişim için Kaydol",
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: colors.accentGold,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Icon(
                                      Icons.chevron_right,
                                      size: 12,
                                      color: colors.accentGold,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Reklam İzle → Kredi Kazan
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: GestureDetector(
                            onTap: _isWatchingAd ? null : _handleWatchAd,
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: LinearGradient(
                                  colors: [
                                    const Color(0xFF4CAF50).withOpacity(0.1),
                                    const Color(0xFF4CAF50).withOpacity(0.05),
                                  ],
                                ),
                                border: Border.all(
                                  color: const Color(0xFF4CAF50).withOpacity(0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF4CAF50).withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: _isWatchingAd
                                        ? Padding(
                                            padding: const EdgeInsets.all(10),
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: const Color(0xFF4CAF50),
                                            ),
                                          )
                                        : const Icon(
                                            Icons.play_circle_fill,
                                            color: Color(0xFF4CAF50),
                                            size: 22,
                                          ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Reklam İzle → +5 Kredi',
                                          style: TextStyle(
                                            color: colors.textPrimary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Kısa bir video izleyerek ücretsiz kredi kazan',
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
                                    color: const Color(0xFF4CAF50),
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingBtn(
    String type,
    String label,
    AppColors colors, {
    String? discount,
  }) {
    final isSelected = _billing == type;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _billing = type),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? colors.accentGold.withOpacity(0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? colors.accentGold.withOpacity(0.25)
                  : Colors.transparent,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? colors.accentGold : colors.textMuted,
                ),
              ),
              if (discount != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3DBA8C).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    discount,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF3DBA8C),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanCard(PlanItem plan, AppColors colors) {
    final isSelected = _selectedPlan == plan.id;
    final displayPrice = _billing == "yearly" && plan.priceYearly != null
        ? plan.priceYearly!
        : plan.price;
    final displayPeriod = _billing == "yearly" && plan.priceYearly != null
        ? "/yıl"
        : plan.period;

    return GestureDetector(
      onTap: () {
        if (!plan.ctaDisabled) {
          setState(() => _selectedPlan = plan.id);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? plan.color.withOpacity(0.06)
              : colors.surfaceGlassLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? plan.color.withOpacity(0.35)
                : colors.borderLight,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: plan.color.withOpacity(0.18),
                        border: Border.all(color: plan.color.withOpacity(0.30)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(plan.icon, size: 20, color: plan.color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                displayPrice,
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: colors.textPrimary,
                                ),
                              ),
                              if (displayPeriod.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(left: 6),
                                  child: Text(
                                    displayPeriod,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          Text(
                            plan.description,
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Features (Top 4)
                ...plan.features
                    .take(4)
                    .map(
                      (f) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Icon(
                              f.included ? Icons.check : Icons.close,
                              size: 13,
                              color: f.included ? plan.color : colors.textMuted,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              f.text,
                              style: TextStyle(
                                fontSize: 12,
                                color: f.included
                                    ? const Color(0xFFA0A0B8)
                                    : colors.textMuted,
                              ),
                            ),
                            if (f.note != null)
                              Padding(
                                padding: const EdgeInsets.only(left: 4),
                                child: Text(
                                  "(${f.note})",
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Color(0xFFE8A830),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    )
                    .toList(),

                const SizedBox(height: 12),

                // CTA
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: plan.ctaDisabled
                        ? null
                        : plan.id == "pro"
                        ? LinearGradient(
                            colors: [colors.accentGold, colors.accentGoldLight],
                          )
                        : null,
                    color: plan.ctaDisabled
                        ? colors.surfaceGlassLight
                        : plan.id != "pro"
                        ? plan.color.withOpacity(0.18)
                        : null,
                    border: plan.ctaDisabled
                        ? Border.all(color: colors.borderLight)
                        : null,
                    boxShadow: plan.id == "pro" && !plan.ctaDisabled
                        ? [
                            BoxShadow(
                              color: colors.accentGold.withOpacity(0.25),
                              blurRadius: 20,
                            ),
                          ]
                        : [],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        plan.cta,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: plan.ctaDisabled
                              ? colors.textMuted
                              : plan.id == "pro"
                              ? colors.background
                              : plan.color,
                        ),
                      ),
                      if (!plan.ctaDisabled)
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Icon(
                            Icons.chevron_right,
                            size: 14,
                            color: plan.id == "pro"
                                ? colors.background
                                : plan.color,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (plan.tag != null)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: plan.tagColor!.withOpacity(0.2),
                    border: Border.all(color: plan.tagColor!.withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    plan.tag!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: plan.tagColor,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreditPack(CreditPack pack, AppColors colors, AppLocalizations l) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: pack.popular
            ? colors.accentGold.withOpacity(0.08)
            : colors.surfaceGlassLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: pack.popular
              ? colors.accentGold.withOpacity(0.25)
              : colors.borderLight,
        ),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Column(
            children: [
              Text(
                "${pack.amount}",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: pack.popular ? colors.accentGold : colors.textPrimary,
                ),
              ),
              Text(
                l.paywallRightsUnit,
                style: TextStyle(fontSize: 10, color: colors.textMuted),
              ),
              const SizedBox(height: 4),
              Text(
                pack.price,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: colors.textPrimary,
                ),
              ),
              Text(
                "${pack.perCredit}/hak",
                style: TextStyle(fontSize: 9, color: colors.textMuted),
              ),
            ],
          ),
          if (pack.popular)
            Positioned(
              top: -20,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: colors.accentGold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "İdeal",
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: colors.background,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTrustSignal(
    IconData icon,
    String label,
    String desc,
    Color color,
    AppColors colors,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceGlassLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.borderLight),
      ),
      child: Column(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: colors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            desc,
            style: TextStyle(fontSize: 9, color: colors.textMuted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
