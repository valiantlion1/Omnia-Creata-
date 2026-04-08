package com.omnia.organizer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.ui.BrowseScreen
import com.omnia.organizer.ui.CreateFolderDialog
import com.omnia.organizer.ui.ErrorBanner
import com.omnia.organizer.ui.HomeScreen
import com.omnia.organizer.ui.OrganizerUiState
import com.omnia.organizer.ui.OrganizerViewModel
import com.omnia.organizer.ui.RenameDialog
import com.omnia.organizer.ui.SearchScreen
import com.omnia.organizer.ui.SettingsScreen
import com.omnia.organizer.ui.StorageScreen
import com.omnia.organizer.ui.TrashScreen
import com.omnia.organizer.ui.theme.OmniaTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            OmniaTheme {
                AppRoot()
            }
        }
    }
}

private enum class OrganizerRoute(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Home("home", "Home", Icons.Default.Home),
    Browse("browse", "Browse", Icons.Default.Folder),
    Search("search", "Search", Icons.Default.Search),
    Storage("storage", "Storage", Icons.Default.Storage),
    Trash("trash", "Recycle Bin", Icons.Default.Delete),
    Settings("settings", "Settings", Icons.Default.Settings)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppRoot(
    viewModel: OrganizerViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val openTreeLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
            }
            viewModel.onTreePicked(uri)
        }
    }
    val openTreePicker = remember(openTreeLauncher) { { openTreeLauncher.launch(null) } }
    var currentRoute by rememberSaveable { mutableStateOf(OrganizerRoute.Home.route) }
    var menuExpanded by remember { mutableStateOf(false) }
    val primaryRoutes = remember { listOf(OrganizerRoute.Home, OrganizerRoute.Browse, OrganizerRoute.Search, OrganizerRoute.Storage) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                        Text(
                            when (currentRoute) {
                                OrganizerRoute.Home.route -> "Omnia Organizer"
                                OrganizerRoute.Browse.route -> "Browse"
                                OrganizerRoute.Search.route -> "Search"
                                OrganizerRoute.Storage.route -> "Storage"
                                OrganizerRoute.Trash.route -> "Recycle Bin"
                                OrganizerRoute.Settings.route -> "Settings"
                                else -> "Omnia Organizer"
                            }
                        )
                        state.root?.displayName?.takeIf { it.isNotBlank() }?.let { rootName ->
                            Text(
                                text = rootName,
                                style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
                                color = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = openTreePicker) {
                        Icon(Icons.Default.UploadFile, contentDescription = "Change storage root")
                    }
                    IconButton(onClick = { viewModel.refreshActiveRoute(currentRoute) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        DropdownMenuItem(
                            text = { Text("Recycle Bin") },
                            onClick = {
                                currentRoute = OrganizerRoute.Trash.route
                                menuExpanded = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Settings") },
                            onClick = {
                                currentRoute = OrganizerRoute.Settings.route
                                menuExpanded = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Change folder") },
                            onClick = {
                                menuExpanded = false
                                openTreePicker()
                            }
                        )
                        if (state.root != null) {
                            DropdownMenuItem(
                                text = { Text("Clear selected folder") },
                                onClick = {
                                    currentRoute = OrganizerRoute.Home.route
                                    viewModel.clearRoot()
                                    menuExpanded = false
                                }
                            )
                        }
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                primaryRoutes.forEach { route ->
                    NavigationBarItem(
                        selected = currentRoute == route.route,
                        onClick = { currentRoute = route.route },
                        icon = { Icon(route.icon, contentDescription = route.label) },
                        label = { Text(route.label) }
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (state.errorMessage != null) {
                ErrorBanner(message = state.errorMessage.orEmpty(), onDismiss = viewModel::clearError)
            }

            when (currentRoute) {
                OrganizerRoute.Home.route -> HomeScreen(
                    state = state,
                    onOpenBrowse = { currentRoute = OrganizerRoute.Browse.route },
                    onOpenSearch = { currentRoute = OrganizerRoute.Search.route },
                    onOpenStorage = { currentRoute = OrganizerRoute.Storage.route },
                    onOpenTrash = { currentRoute = OrganizerRoute.Trash.route },
                    onPickFolder = openTreePicker,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Browse.route -> BrowseScreen(
                    state = state,
                    onOpenFolder = viewModel::openFolder,
                    onPickFolder = openTreePicker,
                    onNavigateToBreadcrumb = viewModel::navigateToBreadcrumb,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onShareFile = { item -> shareDocument(context, viewModel.documentUriFor(item), item.mimeType, item.name) },
                    onRequestRename = viewModel::requestRename,
                    onMoveToTrash = viewModel::moveToTrash,
                    onCreateFolder = viewModel::requestCreateFolder
                )

                OrganizerRoute.Search.route -> SearchScreen(
                    state = state,
                    onPickFolder = openTreePicker,
                    onQueryChange = viewModel::updateSearchQuery,
                    onKindFilter = viewModel::updateKindFilter,
                    onDateFilter = viewModel::updateDateFilter,
                    onSizeFilter = viewModel::updateSizeFilter,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Storage.route -> StorageScreen(
                    state = state,
                    onPickFolder = openTreePicker,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Trash.route -> TrashScreen(
                    state = state,
                    onRestore = viewModel::restoreFromTrash,
                    onDeletePermanently = viewModel::deletePermanentlyFromTrash
                )

                OrganizerRoute.Settings.route -> SettingsScreen(
                    state = state,
                    onPickFolder = openTreePicker,
                    onClearRoot = viewModel::clearRoot,
                    onClearTrash = viewModel::clearTrash
                )
            }
        }
    }

    RenameDialog(state = state, onDismiss = viewModel::dismissRename, onConfirm = viewModel::renameRequestedItem)
    CreateFolderDialog(state = state, onDismiss = viewModel::dismissCreateFolder, onConfirm = viewModel::createFolder)
}

private fun openDocument(context: Context, uri: Uri?, mimeType: String) {
    if (uri == null) return
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, if (mimeType.isBlank()) "*/*" else mimeType)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Open with")) }
}

private fun shareDocument(context: Context, uri: Uri?, mimeType: String, displayName: String) {
    if (uri == null) return
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = if (mimeType.isBlank()) "*/*" else mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, displayName)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Share file")) }
}
