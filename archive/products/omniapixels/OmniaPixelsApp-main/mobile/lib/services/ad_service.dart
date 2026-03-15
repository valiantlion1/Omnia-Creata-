import 'dart:async';
import 'package:flutter/foundation.dart';

/// Placeholder Ad Service for OmniaPixels.
/// 
/// In production, this will use google_mobile_ads package.
/// For now, it provides the interface and simulates ad behavior
/// so the rest of the app can integrate without the actual SDK.
///
/// To enable real ads:
/// 1. Add `google_mobile_ads: ^5.3.0` to pubspec.yaml
/// 2. Add AdMob App ID to AndroidManifest.xml and Info.plist
/// 3. Replace simulation methods with real SDK calls
class AdService {
  static final AdService _instance = AdService._internal();
  factory AdService() => _instance;
  AdService._internal();

  bool _isInitialized = false;
  bool _isRewardedAdReady = false;

  // Test Ad Unit IDs (Google's official test IDs)
  static const String _testBannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111';
  static const String _testRewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';
  static const String _testInterstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712';

  /// Initialize the ad SDK
  Future<void> initialize() async {
    if (_isInitialized) return;
    // In production: await MobileAds.instance.initialize();
    _isInitialized = true;
    debugPrint('[AdService] Initialized (simulation mode)');
    await _loadRewardedAd();
  }

  /// Load a rewarded ad
  Future<void> _loadRewardedAd() async {
    // Simulate ad loading
    await Future.delayed(const Duration(seconds: 1));
    _isRewardedAdReady = true;
    debugPrint('[AdService] Rewarded ad ready');
  }

  /// Check if rewarded ad is ready
  bool get isRewardedAdReady => _isRewardedAdReady;

  /// Show rewarded ad and return credits earned
  /// Returns the number of credits earned (0 if ad was not watched)
  Future<int> showRewardedAd() async {
    if (!_isRewardedAdReady) {
      debugPrint('[AdService] No rewarded ad ready');
      return 0;
    }

    // Simulate ad watching (2 seconds)
    _isRewardedAdReady = false;
    debugPrint('[AdService] Showing rewarded ad...');
    await Future.delayed(const Duration(seconds: 2));
    debugPrint('[AdService] Rewarded ad completed! +5 credits');
    
    // Preload next ad
    _loadRewardedAd();
    
    return 5; // Reward: 5 credits
  }

  /// Show an interstitial ad (between screens)
  Future<void> showInterstitialAd() async {
    debugPrint('[AdService] Showing interstitial ad (simulated)');
    await Future.delayed(const Duration(seconds: 1));
  }

  /// Dispose resources
  void dispose() {
    _isInitialized = false;
    _isRewardedAdReady = false;
  }
}
