package com.omniapixels.android.analytics

import android.content.Context
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics

class AnalyticsManager(context: Context) {
    private val analytics = FirebaseAnalytics.getInstance(context)
    private val crashlytics = FirebaseCrashlytics.getInstance()

    fun logEvent(name: String, params: Map<String, Any>? = null) {
        // TODO: Analytics event
    }
    fun logError(error: Throwable) {
        crashlytics.recordException(error)
    }
}
