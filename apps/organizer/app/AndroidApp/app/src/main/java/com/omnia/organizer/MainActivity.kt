package com.omnia.organizer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.omnia.organizer.ui.theme.OmniaTheme
import com.omnia.organizer.ui.screens.CaptureScreen
import com.omnia.organizer.ui.screens.LibraryScreen
import com.omnia.organizer.ui.screens.SearchScreen
import com.omnia.organizer.ui.screens.SettingsScreen
import com.omnia.organizer.ui.screens.TasksScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            OmniaTheme { AppRoot() }
        }
    }
}

private enum class OmniaDestination(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Capture("capture", "Capture", Icons.Default.AddCircle),
    Library("library", "Library", Icons.Default.Folder),
    Search("search", "Search", Icons.Default.Search),
    Tasks("tasks", "Tasks", Icons.Default.CheckCircle),
    Settings("settings", "Settings", Icons.Default.Settings)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppRoot() {
    val navController = rememberNavController()
    val destinations = remember { OmniaDestination.values().toList() }
    val currentRoute by navController.currentBackStackEntryAsState()
    val selectedRoute = currentRoute?.destination?.route ?: OmniaDestination.Capture.route

    Scaffold(
        topBar = { CenterAlignedTopAppBar(title = { Text(destinations.find { it.route == selectedRoute }?.label ?: "Omnia Organizer") }) },
        bottomBar = {
            NavigationBar {
                destinations.forEach { dest ->
                    NavigationBarItem(
                        selected = selectedRoute == dest.route,
                        onClick = { if (selectedRoute != dest.route) navController.navigate(dest.route) },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label) }
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = OmniaDestination.Capture.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(OmniaDestination.Capture.route) { CaptureScreen(Modifier) }
            composable(OmniaDestination.Library.route) { LibraryScreen(Modifier) }
            composable(OmniaDestination.Search.route) { SearchScreen(Modifier) }
            composable(OmniaDestination.Tasks.route) { TasksScreen(Modifier) }
            composable(OmniaDestination.Settings.route) { SettingsScreen(Modifier) }
        }
    }
}

@Composable
private fun PlaceholderScreen(title: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text("$title screen coming soon…")
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewAppRoot() { OmniaTheme { AppRoot() } }
