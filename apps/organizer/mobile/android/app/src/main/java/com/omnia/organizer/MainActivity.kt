package com.omnia.organizer

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.SystemClock
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.omnia.organizer.R
import com.omnia.organizer.ui.BrowseScreen
import com.omnia.organizer.ui.BrowseLayoutMode
import com.omnia.organizer.ui.CreateFolderDialog
import com.omnia.organizer.ui.ErrorBanner
import com.omnia.organizer.ui.FirstRunOnboardingFlow
import com.omnia.organizer.ui.HomeScreen
import com.omnia.organizer.ui.NoticeBanner
import com.omnia.organizer.ui.OnboardingPermissionState
import com.omnia.organizer.ui.OrganizerViewModel
import com.omnia.organizer.ui.RenameDialog
import com.omnia.organizer.ui.SearchScreen
import com.omnia.organizer.ui.SettingsScreen
import com.omnia.organizer.ui.StorageCategoryKey
import com.omnia.organizer.ui.StoragePermissionRequiredScreen
import com.omnia.organizer.ui.StorageScreen
import com.omnia.organizer.ui.TrashScreen
import com.omnia.organizer.ui.WorkspaceConnectingScreen
import com.omnia.organizer.ui.WorkspaceUnavailableScreen
import com.omnia.organizer.ui.theme.OmniaTheme
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.core.domain.model.TrashEntry
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashStartedAt = SystemClock.elapsedRealtime()
        val coldStartMinimumDurationMs = coldStartSplashMinimumDurationMs(this)
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition {
            SystemClock.elapsedRealtime() - splashStartedAt < coldStartMinimumDurationMs
        }
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

private const val ColdStartSplashMinimumDurationMs = 1600L
private const val LaunchSplashMinimumDurationMs = 1600L
private const val LaunchSplashMaximumDurationMs = 4200L
private const val ReducedColdStartSplashMinimumDurationMs = 950L
private const val ReducedLaunchSplashMinimumDurationMs = 950L
private const val ReducedLaunchSplashMaximumDurationMs = 2200L
private const val CurrentDisclosureVersion = 1
private const val OofmPrefsName = "oofm_startup"
private const val PrefIntroComplete = "intro_complete"
private const val PrefDisclosureVersion = "disclosure_version"
private const val PrefStorageAccessRequested = "storage_access_requested"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppRoot(
    viewModel: OrganizerViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val startupPrefs = remember(context) {
        context.getSharedPreferences(OofmPrefsName, Context.MODE_PRIVATE)
    }
    var accessRefreshTick by remember { mutableIntStateOf(0) }
    var currentRoute by rememberSaveable { mutableStateOf(OrganizerRoute.Home.route) }
    var hasHandledFirstResume by rememberSaveable { mutableStateOf(false) }
    var splashVisible by rememberSaveable { mutableStateOf(false) }
    var menuExpanded by remember { mutableStateOf(false) }
    var splashStartedAt by remember { mutableLongStateOf(SystemClock.elapsedRealtime()) }
    var pendingMoveToTrashItem by remember { mutableStateOf<FileItem?>(null) }
    var confirmDeleteSelection by remember { mutableStateOf(false) }
    var pendingPermanentDeleteEntry by remember { mutableStateOf<TrashEntry?>(null) }
    var confirmClearTrash by remember { mutableStateOf(false) }
    var hasCompletedIntro by rememberSaveable { mutableStateOf(startupPrefs.getBoolean(PrefIntroComplete, false)) }
    var acceptedDisclosureVersion by rememberSaveable {
        mutableIntStateOf(startupPrefs.getInt(PrefDisclosureVersion, 0))
    }
    var hasRequestedStorageAccess by rememberSaveable {
        mutableStateOf(startupPrefs.getBoolean(PrefStorageAccessRequested, false))
    }
    val primaryRoutes = remember {
        listOf(OrganizerRoute.Home, OrganizerRoute.Browse, OrganizerRoute.Search, OrganizerRoute.Storage)
    }
    val topBarTitle = when {
        currentRoute == OrganizerRoute.Browse.route && state.isSelectionMode ->
            "${state.selectedDocumentIds.size} selected"

        else -> when (currentRoute) {
            OrganizerRoute.Home.route -> "Home"
            OrganizerRoute.Browse.route -> "Browse"
            OrganizerRoute.Search.route -> "Search"
            OrganizerRoute.Storage.route -> "Storage"
            OrganizerRoute.Trash.route -> "Recycle Bin"
            OrganizerRoute.Settings.route -> "Settings"
            else -> "Omnia Organizer"
        }
    }
    val topBarSubtitle = when {
        currentRoute == OrganizerRoute.Browse.route && state.isSelectionMode ->
            "Bulk actions are ready"

        currentRoute == OrganizerRoute.Browse.route ||
            currentRoute == OrganizerRoute.Search.route ||
            currentRoute == OrganizerRoute.Storage.route ->
            state.root?.displayName ?: ""

        else -> ""
    }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                accessRefreshTick++
                if (hasHandledFirstResume) {
                    splashStartedAt = SystemClock.elapsedRealtime()
                    splashVisible = true
                } else {
                    hasHandledFirstResume = true
                }
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
            hasRequestedStorageAccess = true
            startupPrefs.edit().putBoolean(PrefStorageAccessRequested, true).apply()
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
    val onboardingPermissionState = when {
        hasStorageAccess && state.root != null -> OnboardingPermissionState.READY
        hasStorageAccess -> OnboardingPermissionState.LIMITED
        hasRequestedStorageAccess -> OnboardingPermissionState.DENIED
        else -> OnboardingPermissionState.NOT_REQUESTED
    }
    val shouldShowOnboarding = !hasCompletedIntro || acceptedDisclosureVersion < CurrentDisclosureVersion
    val disclosureOnly = hasCompletedIntro && acceptedDisclosureVersion < CurrentDisclosureVersion
    val splashStatusText = when {
        !hasStorageAccess -> "Preparing secure storage access"
        state.root == null -> "Connecting to your phone files"
        state.isLoading -> "Loading your workspace"
        state.isStorageRefreshing -> "Warming storage insight"
        else -> "Launching Omnia Organizer"
    }
    val splashSupportingText = when {
        !hasStorageAccess -> "OOFM is checking permissions, privacy boundaries, and startup safety."
        state.root == null -> "The first device handshake is happening in the background so the phone stays responsive."
        state.isStorageRefreshing -> "Heavy storage summaries stay behind the curtain while the app gets ready."
        else -> "OmniaCreata clarity for the files that actually matter on your phone."
    }
    val openFileRequest: (FileItem) -> Unit = { item ->
        openDocument(
            context = context,
            uri = viewModel.documentUriFor(item),
            mimeType = item.mimeType,
            onFailure = viewModel::reportActionFailure
        )
    }
    val shareFileRequest: (FileItem) -> Unit = { item ->
        shareDocument(
            context = context,
            uri = viewModel.documentUriFor(item),
            mimeType = item.mimeType,
            displayName = item.name,
            onFailure = viewModel::reportActionFailure
        )
    }

    LaunchedEffect(hasStorageAccess) {
        if (hasStorageAccess) {
            viewModel.enableDeviceStorageRoot()
        }
    }

    LaunchedEffect(currentRoute, hasStorageAccess, state.root?.treeUri, state.root?.rootDocumentId) {
        if (hasStorageAccess && currentRoute == OrganizerRoute.Storage.route) {
            viewModel.ensureStorageSummary()
        }
    }

    LaunchedEffect(currentRoute) {
        if (currentRoute != OrganizerRoute.Browse.route) {
            viewModel.clearBrowseActionMode()
            viewModel.dismissBrowseControlsSheet()
            viewModel.dismissFileDetail()
        }
    }

    LaunchedEffect(
        splashVisible,
        hasStorageAccess,
        state.root?.treeUri,
        state.root?.rootDocumentId,
        state.isLoading,
        state.isStorageRefreshing,
        state.errorMessage,
        state.reducedEffectsMode
    ) {
        if (!splashVisible) return@LaunchedEffect
        val minimumDurationMs = launchSplashMinimumDurationMs(state.reducedEffectsMode)
        val maximumDurationMs = launchSplashMaximumDurationMs(state.reducedEffectsMode)

        while (splashVisible) {
            val elapsed = SystemClock.elapsedRealtime() - splashStartedAt
            val minimumReached = elapsed >= minimumDurationMs
            val readyToContinue =
                !hasStorageAccess || (state.root != null && !state.isLoading) || (!state.isLoading && state.errorMessage != null)
            val timedOut = elapsed >= maximumDurationMs

            if (minimumReached && (readyToContinue || timedOut)) {
                splashVisible = false
                break
            }

            delay(120L)
        }
    }

    if (splashVisible) {
        LaunchSplashScreen(
            statusText = splashStatusText,
            supportingText = splashSupportingText
        )
        return
    }

    if (shouldShowOnboarding) {
        FirstRunOnboardingFlow(
            permissionState = onboardingPermissionState,
            startAtDisclosure = disclosureOnly,
            onRequestAccess = requestStorageAccessAction,
            onFinish = {
                hasCompletedIntro = true
                acceptedDisclosureVersion = CurrentDisclosureVersion
                startupPrefs.edit()
                    .putBoolean(PrefIntroComplete, true)
                    .putInt(PrefDisclosureVersion, CurrentDisclosureVersion)
                    .apply()
            }
        )
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surface,
                        MaterialTheme.colorScheme.background
                    )
                )
            )
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            topBar = {
                CenterAlignedTopAppBar(
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                        navigationIconContentColor = MaterialTheme.colorScheme.primary,
                        titleContentColor = MaterialTheme.colorScheme.onSurface,
                        actionIconContentColor = MaterialTheme.colorScheme.primary
                    ),
                    title = {
                        Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                            Text(
                                text = "OOFM / $topBarTitle",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            if (topBarSubtitle.isNotBlank()) {
                                Text(
                                    text = topBarSubtitle,
                                    style = MaterialTheme.typography.labelMedium,
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
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Surface(
                        shape = RoundedCornerShape(26.dp),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f),
                        tonalElevation = 4.dp
                    ) {
                        NavigationBar(containerColor = Color.Transparent) {
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
            if (state.notice != null) {
                NoticeBanner(notice = state.notice!!, onDismiss = viewModel::clearNotice)
            }
            if (state.root == null) {
                if (state.isLoading) {
                    WorkspaceConnectingScreen()
                } else {
                    WorkspaceUnavailableScreen(
                        onReconnect = handleStorageAction,
                        onOpenSettings = { currentRoute = OrganizerRoute.Settings.route }
                    )
                }
                return@Scaffold
            }

            when (currentRoute) {
                OrganizerRoute.Home.route -> HomeScreen(
                    state = state,
                    onOpenBrowse = { currentRoute = OrganizerRoute.Browse.route },
                    onOpenSearch = { currentRoute = OrganizerRoute.Search.route },
                    onOpenStorage = { currentRoute = OrganizerRoute.Storage.route },
                    onOpenTrash = { currentRoute = OrganizerRoute.Trash.route },
                    onOpenDownloads = {
                        viewModel.openSmartFolder(setOf("downloads", "download"), "Downloads")
                        currentRoute = OrganizerRoute.Browse.route
                    },
                    onOpenScreenshots = {
                        viewModel.openSmartFolder(setOf("screenshots"), "Screenshots")
                        currentRoute = OrganizerRoute.Browse.route
                    },
                    onOpenDocuments = {
                        viewModel.openSmartFolder(setOf("documents"), "Documents")
                        currentRoute = OrganizerRoute.Browse.route
                    },
                    onPickFolder = requestStorageAccessAction,
                    onOpenFile = openFileRequest,
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Browse.route -> BrowseScreen(
                    state = state,
                    onBrowseLayoutChange = viewModel::setBrowseLayoutMode,
                    onOpenFolder = viewModel::openFolder,
                    onPickFolder = requestStorageAccessAction,
                    onNavigateToBreadcrumb = viewModel::navigateToBreadcrumb,
                    onShowBrowseControls = viewModel::showBrowseControlsSheet,
                    onDismissBrowseControls = viewModel::dismissBrowseControlsSheet,
                    onBrowseSortOptionChange = viewModel::setBrowseSortOption,
                    onBrowseSortDirectionChange = viewModel::setBrowseSortDirection,
                    onBrowseScopeFilterChange = viewModel::setBrowseScopeFilter,
                    onBrowseTypeFilterChange = viewModel::setBrowseTypeFilter,
                    onResetBrowseControls = viewModel::resetBrowseExplorerControls,
                    onOpenFileDetail = viewModel::openFileDetail,
                    onDismissFileDetail = viewModel::dismissFileDetail,
                    onOpenFile = openFileRequest,
                    onShareFile = shareFileRequest,
                    onRequestRename = viewModel::requestRename,
                    onMoveToTrash = { item -> pendingMoveToTrashItem = item },
                    onCreateFolder = viewModel::requestCreateFolder,
                    onEnterSelectionMode = viewModel::enterSelectionMode,
                    onToggleSelection = viewModel::toggleSelection,
                    onClearSelection = viewModel::clearBrowseActionMode,
                    onSelectAll = viewModel::selectAllCurrentFolder,
                    onRequestCopySelection = viewModel::requestCopySelection,
                    onRequestMoveSelection = viewModel::requestMoveSelection,
                    onRequestShareSelection = {
                        val targets = viewModel.selectedShareTargets()
                        val uris = viewModel.documentUrisFor(targets)
                        shareDocuments(
                            context = context,
                            uris = uris,
                            items = targets,
                            onFailure = viewModel::reportActionFailure
                        )
                        viewModel.completeShareSelection(
                            sharedCount = uris.size,
                            skippedCount = (state.selectedDocumentIds.size - uris.size).coerceAtLeast(0)
                        )
                    },
                    onRequestRenameSelection = viewModel::requestRenameSelection,
                    onDeleteSelection = { confirmDeleteSelection = true },
                    onDismissDestinationPicker = viewModel::dismissDestinationPicker,
                    onOpenDestinationFolder = viewModel::openDestinationFolder,
                    onNavigateDestinationBreadcrumb = viewModel::navigateDestinationBreadcrumb,
                    onConfirmDestinationOperation = viewModel::confirmDestinationOperation,
                    onCreateFolderInDestination = {
                        val target = state.destinationPickerState?.targetDocumentId
                        viewModel.requestCreateFolder(targetDocumentId = target, forDestinationPicker = true)
                    }
                )

                OrganizerRoute.Search.route -> SearchScreen(
                    state = state,
                    onPickFolder = requestStorageAccessAction,
                    onQueryChange = viewModel::updateSearchQuery,
                    onKindFilter = viewModel::updateKindFilter,
                    onDateFilter = viewModel::updateDateFilter,
                    onSizeFilter = viewModel::updateSizeFilter,
                    onOpenFile = openFileRequest,
                    onShowInBrowse = { item ->
                        viewModel.showInBrowse(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Storage.route -> StorageScreen(
                    state = state,
                    onPickFolder = requestStorageAccessAction,
                    onRetrySummary = { viewModel.refreshActiveRoute(OrganizerRoute.Storage.route) },
                    onOpenStorageCategory = viewModel::openStorageCategory,
                    onClearStorageCategory = viewModel::clearStorageCategoryView,
                    onOpenCategoryFolder = {
                        state.storageCategoryView?.folderPath?.let(viewModel::openFolderPath)
                        currentRoute = OrganizerRoute.Browse.route
                    },
                    onOpenFile = openFileRequest,
                    onOpenParent = { item ->
                        viewModel.openParentOf(item)
                        currentRoute = OrganizerRoute.Browse.route
                    }
                )

                OrganizerRoute.Trash.route -> TrashScreen(
                    state = state,
                    onRestore = viewModel::restoreFromTrash,
                    onDeletePermanently = { entry -> pendingPermanentDeleteEntry = entry }
                )

                OrganizerRoute.Settings.route -> SettingsScreen(
                    state = state,
                    onPickFolder = requestStorageAccessAction,
                    onClearRoot = viewModel::clearRoot,
                    onClearTrash = { confirmClearTrash = true }
                )
            }
            }
        }
    }

    pendingMoveToTrashItem?.let { item ->
        ActionConfirmationDialog(
            title = "Move to Recycle Bin?",
            body = "You can restore ${item.name} later from Recycle Bin.",
            confirmLabel = "Move to bin",
            onDismiss = { pendingMoveToTrashItem = null },
            onConfirm = {
                pendingMoveToTrashItem = null
                viewModel.moveToTrash(item)
            }
        )
    }
    if (confirmDeleteSelection) {
        ActionConfirmationDialog(
            title = "Move selected items to Recycle Bin?",
            body = "Selected files will leave the current folder, but they stay recoverable until you delete them forever.",
            confirmLabel = "Move selected items",
            onDismiss = { confirmDeleteSelection = false },
            onConfirm = {
                confirmDeleteSelection = false
                viewModel.deleteSelection()
            }
        )
    }
    pendingPermanentDeleteEntry?.let { entry ->
        ActionConfirmationDialog(
            title = "Delete forever?",
            body = "${entry.displayName} will be removed permanently and cannot be restored from Recycle Bin.",
            confirmLabel = "Delete forever",
            onDismiss = { pendingPermanentDeleteEntry = null },
            onConfirm = {
                pendingPermanentDeleteEntry = null
                viewModel.deletePermanentlyFromTrash(entry)
            }
        )
    }
    if (confirmClearTrash) {
        ActionConfirmationDialog(
            title = "Clear Recycle Bin metadata?",
            body = "This only clears OOFM's saved Recycle Bin list. Files that were already moved on disk are not deleted by this action.",
            confirmLabel = "Clear metadata",
            onDismiss = { confirmClearTrash = false },
            onConfirm = {
                confirmClearTrash = false
                viewModel.clearTrash()
            }
        )
    }
    RenameDialog(state = state, onDismiss = viewModel::dismissRename, onConfirm = viewModel::renameRequestedItem)
    CreateFolderDialog(state = state, onDismiss = viewModel::dismissCreateFolder, onConfirm = viewModel::createFolder)
}

@Composable
private fun LaunchSplashScreen(
    statusText: String,
    supportingText: String
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF090505),
                            Color(0xFF140D0A),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
                .padding(horizontal = 24.dp, vertical = 32.dp)
        ) {
            Column(
                modifier = Modifier.align(Alignment.CenterStart)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.omnia_creata_logo),
                    contentDescription = "Omnia Creata",
                    modifier = Modifier.size(220.dp),
                    contentScale = ContentScale.Fit
                )
                Spacer(modifier = Modifier.height(28.dp))
                Text(
                    text = "Omnia Organizer",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "A calmer way to load, sort, and control your phone files.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f)
                )
            }

            Column(
                modifier = Modifier.align(Alignment.BottomStart)
            ) {
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(modifier = Modifier.height(12.dp))
                LinearProgressIndicator(
                    modifier = Modifier.size(width = 240.dp, height = 4.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = supportingText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.72f)
                )
            }
        }
    }
}

private fun coldStartSplashMinimumDurationMs(context: Context): Long =
    if (shouldUseReducedEffects(context)) {
        ReducedColdStartSplashMinimumDurationMs
    } else {
        ColdStartSplashMinimumDurationMs
    }

private fun launchSplashMinimumDurationMs(reducedEffectsMode: Boolean): Long =
    if (reducedEffectsMode) {
        ReducedLaunchSplashMinimumDurationMs
    } else {
        LaunchSplashMinimumDurationMs
    }

private fun launchSplashMaximumDurationMs(reducedEffectsMode: Boolean): Long =
    if (reducedEffectsMode) {
        ReducedLaunchSplashMaximumDurationMs
    } else {
        LaunchSplashMaximumDurationMs
    }

private fun shouldUseReducedEffects(context: Context): Boolean {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(memoryInfo)
    val totalMemMb = memoryInfo.totalMem / (1024L * 1024L)
    return activityManager.isLowRamDevice || activityManager.memoryClass <= 192 || totalMemMb <= 4096L
}

private fun openDocument(
    context: Context,
    uri: Uri?,
    mimeType: String,
    onFailure: (String) -> Unit
) {
    if (uri == null) {
        onFailure("This file is no longer available. Refresh the folder and try again.")
        return
    }
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, if (mimeType.isBlank()) "*/*" else mimeType)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Open with")) }
        .onFailure {
            onFailure("Android could not open this file with the available apps.")
        }
}

private fun shareDocument(
    context: Context,
    uri: Uri?,
    mimeType: String,
    displayName: String,
    onFailure: (String) -> Unit
) {
    if (uri == null) {
        onFailure("This file cannot be shared right now because the underlying item is unavailable.")
        return
    }
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = if (mimeType.isBlank()) "*/*" else mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, displayName)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Share file")) }
        .onFailure {
            onFailure("Android could not open a share target for this file.")
        }
}

private fun shareDocuments(
    context: Context,
    uris: List<Uri>,
    items: List<com.omnia.organizer.core.domain.model.FileItem>,
    onFailure: (String) -> Unit
) {
    if (uris.isEmpty()) {
        onFailure("No shareable files were available in the current selection.")
        return
    }
    val resolvedType = items
        .map { item -> item.mimeType.ifBlank { "*/*" } }
        .distinct()
        .singleOrNull()
        ?: "*/*"
    val intent = if (uris.size == 1) {
        Intent(Intent.ACTION_SEND).apply {
            type = resolvedType
            putExtra(Intent.EXTRA_STREAM, uris.first())
            putExtra(Intent.EXTRA_SUBJECT, items.firstOrNull()?.name.orEmpty())
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    } else {
        Intent(Intent.ACTION_SEND_MULTIPLE).apply {
            type = resolvedType
            putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "Share files")) }
        .onFailure {
            onFailure("Android could not open a share target for the selected files.")
        }
}

@Composable
private fun ActionConfirmationDialog(
    title: String,
    body: String,
    confirmLabel: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(body) },
        confirmButton = {
            FilledTonalButton(onClick = onConfirm) {
                Text(confirmLabel)
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

private fun hasFullStorageAccess(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
    } else {
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) ==
            PackageManager.PERMISSION_GRANTED
    }
}
