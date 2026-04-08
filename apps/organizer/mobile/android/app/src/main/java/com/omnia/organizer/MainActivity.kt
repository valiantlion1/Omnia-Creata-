package com.omnia.organizer

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.omnia.organizer.ui.BrowseScreen
import com.omnia.organizer.ui.CreateFolderDialog
import com.omnia.organizer.ui.ErrorBanner
import com.omnia.organizer.ui.HomeScreen
import com.omnia.organizer.ui.OrganizerViewModel
import com.omnia.organizer.ui.RenameDialog
import com.omnia.organizer.ui.SearchScreen
import com.omnia.organizer.ui.SettingsScreen
import com.omnia.organizer.ui.StoragePermissionRequiredScreen
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
    val lifecycleOwner = LocalLifecycleOwner.current
    var accessRefreshTick by remember { mutableIntStateOf(0) }
    var currentRoute by rememberSaveable { mutableStateOf(OrganizerRoute.Home.route) }
    var menuExpanded by remember { mutableStateOf(false) }
    val primaryRoutes = remember {
        listOf(OrganizerRoute.Home, OrganizerRoute.Browse, OrganizerRoute.Search, OrganizerRoute.Storage)
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                accessRefreshTick++
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val legacyPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        accessRefreshTick++
    }

    val hasStorageAccess = remember(accessRefreshTick) { hasFullStorageAccess(context) }
    val requestStorageAccess = remember(context, legacyPermissionLauncher) {
        {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val appIntent = Intent(
                    Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                runCatching { context.startActivity(appIntent) }
                    .recoverCatching { context.startActivity(fallbackIntent) }
            } else {
                legacyPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    )
                )
            }
        }
    }
    val handleStorageAction: () -> Unit = {
        if (hasStorageAccess) {
            viewModel.enableDeviceStorageRoot()
        } else {
            requestStorageAccess()
        }
    }
    val requestStorageAccessAction: () -> Unit = { requestStorageAccess() }

    LaunchedEffect(hasStorageAccess) {
        if (hasStorageAccess) {
            viewModel.enableDeviceStorageRoot()
        }
    }

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
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = handleStorageAction) {
                        Icon(
                            Icons.Default.UploadFile,
                            contentDescription = if (hasStorageAccess) "Reconnect storage" else "Grant storage access"
                        )
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
                            text = { Text(if (hasStorageAccess) "Reconnect device storage" else "Grant device storage access") },
                            onClick = {
                                menuExpanded = false
                                requestStorageAccess()
                            }
                        )
                        if (state.root != null) {
                            DropdownMenuItem(
                                text = { Text("Reset current root") },
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
            if (!hasStorageAccess) {
                StoragePermissionRequiredScreen(onGrantAccess = requestStorageAccessAction)
                return@Scaffold
            }

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
                    onPickFolder = requestStorageAccessAction,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Browse.route -> BrowseScreen(
                    state = state,
                    onOpenFolder = viewModel::openFolder,
                    onPickFolder = requestStorageAccessAction,
                    onNavigateToBreadcrumb = viewModel::navigateToBreadcrumb,
                    onOpenFile = { item -> openDocument(context, viewModel.documentUriFor(item), item.mimeType) },
                    onShareFile = { item -> shareDocument(context, viewModel.documentUriFor(item), item.mimeType, item.name) },
                    onRequestRename = viewModel::requestRename,
                    onMoveToTrash = viewModel::moveToTrash,
                    onCreateFolder = viewModel::requestCreateFolder
                )

                OrganizerRoute.Search.route -> SearchScreen(
                    state = state,
                    onPickFolder = requestStorageAccessAction,
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
                    onPickFolder = requestStorageAccessAction,
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
                    onPickFolder = requestStorageAccessAction,
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

private fun hasFullStorageAccess(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
    } else {
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) ==
            PackageManager.PERMISSION_GRANTED
    }
}
