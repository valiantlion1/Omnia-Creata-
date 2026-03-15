import 'dart:async';
import 'package:flutter/foundation.dart';

/// Available subscription plans
enum SubscriptionPlan {
  monthly,
  yearly,
}

/// Available credit packs
enum CreditPack {
  small, // 50 credits - $2.99
  medium, // 200 credits - $7.99
  large, // 1000 credits - $19.99
}

/// Purchase result
class PurchaseResult {
  final bool success;
  final String? errorMessage;
  final String? transactionId;

  PurchaseResult({
    required this.success,
    this.errorMessage,
    this.transactionId,
  });
}

/// In-App Purchase Service for OmniaPixels.
///
/// Handles Pro subscriptions and credit pack purchases.
/// In production, use `in_app_purchase` package with Play Store / App Store.
/// Currently runs in simulation mode for development.
///
/// To enable real purchases:
/// 1. Add `in_app_purchase: ^3.2.0` to pubspec.yaml
/// 2. Configure products in Play Console / App Store Connect
/// 3. Replace simulation methods with real IAP SDK calls
class PurchaseService {
  static final PurchaseService _instance = PurchaseService._internal();
  factory PurchaseService() => _instance;
  PurchaseService._internal();

  bool _isInitialized = false;
  bool _isPro = false;
  int _credits = 10; // Free tier starts with 10 credits

  /// Product IDs (must match Play Console / App Store Connect)
  static const String proMonthlyId = 'omniapixels_pro_monthly';
  static const String proYearlyId = 'omniapixels_pro_yearly';
  static const String credits50Id = 'omniapixels_credits_50';
  static const String credits200Id = 'omniapixels_credits_200';
  static const String credits1000Id = 'omniapixels_credits_1000';

  /// Pricing (display only — actual pricing comes from store)
  static const Map<String, String> pricing = {
    proMonthlyId: '\$9.99/ay',
    proYearlyId: '\$79.99/yıl',
    credits50Id: '\$2.99',
    credits200Id: '\$7.99',
    credits1000Id: '\$19.99',
  };

  /// Initialize the purchase service
  Future<void> initialize() async {
    if (_isInitialized) return;
    // In production: connect to IAP store, restore purchases
    _isInitialized = true;
    debugPrint('[PurchaseService] Initialized (simulation mode)');
  }

  /// Current state
  bool get isPro => _isPro;
  int get credits => _credits;

  /// Purchase Pro subscription
  Future<PurchaseResult> purchasePro(SubscriptionPlan plan) async {
    debugPrint('[PurchaseService] Purchasing Pro (${plan.name})...');
    // Simulate purchase flow
    await Future.delayed(const Duration(seconds: 2));

    _isPro = true;
    _credits = 999999; // Unlimited for Pro

    debugPrint('[PurchaseService] Pro activated!');
    return PurchaseResult(
      success: true,
      transactionId: 'sim_${DateTime.now().millisecondsSinceEpoch}',
    );
  }

  /// Purchase credit pack
  Future<PurchaseResult> purchaseCredits(CreditPack pack) async {
    debugPrint('[PurchaseService] Purchasing credits (${pack.name})...');
    await Future.delayed(const Duration(seconds: 1));

    final creditsToAdd = switch (pack) {
      CreditPack.small => 50,
      CreditPack.medium => 200,
      CreditPack.large => 1000,
    };

    _credits += creditsToAdd;

    debugPrint('[PurchaseService] +$creditsToAdd credits (total: $_credits)');
    return PurchaseResult(
      success: true,
      transactionId: 'sim_cr_${DateTime.now().millisecondsSinceEpoch}',
    );
  }

  /// Add credits from watching ads
  void addAdRewardCredits(int amount) {
    _credits += amount;
    debugPrint('[PurchaseService] +$amount ad reward credits (total: $_credits)');
  }

  /// Use credits for a processing job
  bool useCredit({int amount = 1}) {
    if (_isPro || _credits >= amount) {
      if (!_isPro) _credits -= amount;
      return true;
    }
    return false;
  }

  /// Restore purchases (e.g. after reinstall)
  Future<void> restorePurchases() async {
    debugPrint('[PurchaseService] Restoring purchases...');
    await Future.delayed(const Duration(seconds: 1));
    // In production: query store for active subscriptions
  }

  /// Dispose resources
  void dispose() {
    _isInitialized = false;
  }
}
