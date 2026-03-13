package com.omniapixels.android.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.omniapixels.android.presentation.screens.HomeScreen

@Composable
fun OmniaNavigation(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                onNavigateToUpload = { processingType ->
                    navController.navigate("upload/$processingType")
                }
            )
        }
        
        composable("upload/{processingType}") { backStackEntry ->
            val processingType = backStackEntry.arguments?.getString("processingType") ?: "enhance"
            // TODO: Create UploadScreen
            HomeScreen(onNavigateToUpload = {})
        }
        
        composable("processing/{jobId}") { backStackEntry ->
            val jobId = backStackEntry.arguments?.getString("jobId") ?: ""
            // TODO: Create ProcessingScreen
            HomeScreen(onNavigateToUpload = {})
        }
        
        composable("result/{jobId}") { backStackEntry ->
            val jobId = backStackEntry.arguments?.getString("jobId") ?: ""
            // TODO: Create ResultScreen
            HomeScreen(onNavigateToUpload = {})
        }
    }
}
