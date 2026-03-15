package com.omniapixels.android.presentation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable

@Composable
fun NavigationGraph(navController: NavHostController) {
    NavHost(navController, startDestination = "upload") {
        composable("upload") { UploadScreen() }
        composable("queue") { QueueScreen(emptyList()) }
        composable("result") { ResultScreen(emptyList()) }
        composable("settings") { SettingsScreen() }
        composable("paywall") { PaywallScreen() }
        composable("debug") { DebugScreen(rawJson = "{}") }
    }
}
