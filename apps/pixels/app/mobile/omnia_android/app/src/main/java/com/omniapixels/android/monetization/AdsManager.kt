package com.omniapixels.android.monetization

import android.app.Activity
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.InterstitialAd
import com.google.android.gms.ads.rewarded.RewardedAd

class AdsManager {
    fun loadBanner(adView: AdView) {
        adView.loadAd(AdRequest.Builder().build())
    }
    fun loadInterstitial(activity: Activity, onLoaded: (InterstitialAd?) -> Unit) {
        // TODO: Interstitial demo
    }
    fun loadRewarded(activity: Activity, onLoaded: (RewardedAd?) -> Unit) {
        // TODO: Rewarded demo
    }
}
