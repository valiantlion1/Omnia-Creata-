package com.omniapixels.android

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class OmniaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // TODO: Firebase Analytics/Crashlytics init
        // TODO: Ads/Billing init
    }
}
