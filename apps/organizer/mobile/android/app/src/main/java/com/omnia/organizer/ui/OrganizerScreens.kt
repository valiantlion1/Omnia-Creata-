package com.omnia.organizer.ui

import com.omnia.organizer.BuildConfig
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.omnia.organizer.R
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.core.domain.model.FileKind
import com.omnia.organizer.core.domain.model.FolderHandle
import com.omnia.organizer.core.domain.model.SearchDateFilter
import com.omnia.organizer.core.domain.model.SearchSizeFilter
import com.omnia.organizer.core.domain.model.StorageSummary
import com.omnia.organizer.core.domain.model.TrashEntry
import com.omnia.organizer.ui.HomeSummary
import com.omnia.organizer.ui.StorageCategoryKey
import com.omnia.organizer.ui.StorageCategoryView
import java.text.DateFormat
import java.io.File
import java.util.Date

enum class OnboardingPermissionState {
    NOT_REQUESTED,
    DENIED,
    LIMITED,
    READY
}

@Composable
fun ErrorBanner(message: String, onDismiss: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = message,
                color = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onDismiss) {
                Text("Dismiss")
            }
        }
    }
}

@Composable
fun NoticeBanner(notice: UserNotice, onDismiss: () -> Unit) {
    val containerColor = if (notice.tone == NoticeTone.SUCCESS) {
        MaterialTheme.colorScheme.secondaryContainer
    } else {
        MaterialTheme.colorScheme.tertiaryContainer
    }
    val contentColor = if (notice.tone == NoticeTone.SUCCESS) {
        MaterialTheme.colorScheme.onSecondaryContainer
    } else {
        MaterialTheme.colorScheme.onTertiaryContainer
    }
    val icon = if (notice.tone == NoticeTone.SUCCESS) {
        Icons.Default.CheckCircle
    } else {
        Icons.Default.Info
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = contentColor)
            Text(
                text = notice.message,
                color = contentColor,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onDismiss) {
                Text("Dismiss")
            }
        }
    }
}

@Composable
fun StoragePermissionRequiredScreen(onGrantAccess: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("Allow full phone access", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    "Omnia Organizer works best when Android lets it see your phone storage like a real file manager. After approval, the app will load device storage automatically.",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "What this unlocks",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "> Browse folders and files across phone storage\n> Search downloads, documents, screenshots, videos, and more\n> Move items to Recycle Bin and restore them later",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "Trust note: OOFM does not require an account to start. Access is used to help you browse, search, and organize files on your device.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                FilledTonalButton(onClick = onGrantAccess) {
                    Text("Grant device storage access")
                }
            }
        }
    }
}

@Composable
fun WorkspaceConnectingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.56f))
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                CircularProgressIndicator()
                Text(
                    "Connecting device workspace",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    "OOFM already has storage permission. It is building the file-manager workspace so Browse, Search, and Storage can stay in sync.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun WorkspaceUnavailableScreen(
    onReconnect: () -> Unit,
    onOpenSettings: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    "Storage access is granted, but the workspace is not ready",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    "This usually means Android kept the permission but OOFM needs to rebuild its live view of phone storage. Reconnect once and the explorer should come back cleanly.",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "What to expect",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    "- Reconnect refreshes the current device view\n- Browse, Search, and Storage stay device-first\n- No account is required to recover access",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FilledTonalButton(onClick = onReconnect) {
                        Text("Reconnect storage")
                    }
                    OutlinedButton(onClick = onOpenSettings) {
                        Text("Open Settings")
                    }
                }
            }
        }
    }
}

@Composable
fun FirstRunOnboardingFlow(
    permissionState: OnboardingPermissionState,
    startAtDisclosure: Boolean,
    onRequestAccess: () -> Unit,
    onFinish: () -> Unit
) {
    var page by remember(startAtDisclosure) { mutableStateOf(if (startAtDisclosure) 3 else 0) }
    val lastPageIndex = 4

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.secondary.copy(alpha = 0.24f),
                        MaterialTheme.colorScheme.background
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                BrandWordmarkBadge(compact = true)
                OnboardingProgress(page = page, steps = lastPageIndex + 1)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    when (page) {
                        0 -> OnboardingPage(
                            eyebrow = "Welcome",
                            title = "A calmer file manager for your phone",
                            body = "Browse, search, sort, and recover files without desktop chaos squeezed onto a small screen.",
                            points = listOf(
                                "Browse folders without losing your place",
                                "Recover mistakes through Recycle Bin"
                            )
                        )

                        1 -> OnboardingPage(
                            eyebrow = "What you get",
                            title = "Fast paths into the files people actually need",
                            body = "OOFM keeps Downloads, Screenshots, Documents, new files, and storage categories within a few taps.",
                            points = listOf(
                                "Pinned jumps for everyday folders",
                                "Explorer-style Browse with filters and detail sheets"
                            )
                        )

                        2 -> OnboardingPage(
                            eyebrow = "Trust",
                            title = "No account wall before the app becomes useful",
                            body = "OOFM starts as a device utility first. Storage access powers file management, not a hidden signup funnel.",
                            points = listOf(
                                "No forced account to start using core file tools",
                                "Privacy and data-use explanations stay visible in Settings"
                            )
                        )

                        3 -> PermissionEducationPage(
                            permissionState = permissionState,
                            onRequestAccess = onRequestAccess
                        )

                        else -> DisclosurePage()
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (page > 0) {
                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            onClick = { page = (page - 1).coerceAtLeast(0) }
                        ) {
                            Text("Back")
                        }
                    }
                    if (page < lastPageIndex) {
                        TextButton(
                            modifier = Modifier.weight(1f),
                            onClick = { page = 3 }
                        ) {
                            Text("Skip")
                        }
                        FilledTonalButton(
                            modifier = Modifier.weight(1f),
                            onClick = { page = (page + 1).coerceAtMost(lastPageIndex) }
                        ) {
                            Text(if (page == 2) "Go to access" else "Next")
                        }
                    }
                }
                if (page == lastPageIndex) {
                    FilledTonalButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onFinish
                    ) {
                        Text("I understand")
                    }
                }
            }
        }
    }
}

@Composable
fun HomeScreen(
    state: OrganizerUiState,
    onOpenBrowse: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenStorage: () -> Unit,
    onOpenTrash: () -> Unit,
    onOpenDownloads: () -> Unit,
    onOpenScreenshots: () -> Unit,
    onOpenDocuments: () -> Unit,
    onPickFolder: () -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onOpenParent: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush()),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            WorkspaceHeroCard(
                state = state,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                onPickFolder = onPickFolder
            )
        }
        item {
            state.homeSummary?.let { summary ->
                HomeStorageSummaryCard(
                    summary = summary,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    onOpenStorage = onOpenStorage
                )
            } ?: SectionHint(
                text = "Storage insight is still warming up. Browse and Search already work while the summary is prepared."
            )
        }
        if (state.reducedEffectsMode) {
            item {
                SectionHint(
                    "Stability mode is active for this device. OOFM keeps startup summaries lighter so Browse and Search stay responsive."
                )
            }
        }
        item { SectionTitle("Quick actions", "Jump into the core file tools without extra chrome.") }
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ShortcutCard("Browse", "Open folders", Icons.Default.Folder, onOpenBrowse, Modifier.weight(1f))
                ShortcutCard("Search", "Find by name", Icons.Default.Search, onOpenSearch, Modifier.weight(1f))
            }
        }
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ShortcutCard("Storage", "See categories", Icons.Default.Storage, onOpenStorage, Modifier.weight(1f))
                ShortcutCard("Recycle Bin", "Restore items", Icons.Default.Delete, onOpenTrash, Modifier.weight(1f))
            }
        }
        item { SectionTitle("Pinned entry points", "Jump into the phone folders people use most.") }
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item { PinnedEntryCard(title = "Downloads", subtitle = "Packages, PDFs, and app downloads", onClick = onOpenDownloads) }
                item { PinnedEntryCard(title = "Screenshots", subtitle = "Find captures without hunting through folders", onClick = onOpenScreenshots) }
                item { PinnedEntryCard(title = "Documents", subtitle = "Contracts, notes, receipts, and office files", onClick = onOpenDocuments) }
                item { PinnedEntryCard(title = "Recycle Bin", subtitle = "Restore files you removed earlier", onClick = onOpenTrash) }
            }
        }
        item { SectionTitle("New files", "Latest items that may still need sorting or sharing.") }
        if (state.newFiles.isEmpty()) {
            item { SectionHint("No new files have been surfaced yet from the current storage root.") }
        } else {
            items(state.newFiles, key = { "new-${it.documentId}" }) { item ->
                FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
            }
        }
        item { SectionTitle("Recent files", "Jump back into what you touched last.") }
        if (state.recentFiles.isEmpty()) {
            item { SectionHint("No recent files yet in the current storage root.") }
        } else {
            items(state.recentFiles, key = { "recent-${it.documentId}" }) { item ->
                FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
            }
        }
        item { SectionTitle("Large files", "The fastest place to clear space without digging around.") }
        if (state.largeFiles.isEmpty()) {
            item { SectionHint("No large files found yet.") }
        } else {
            items(state.largeFiles, key = { "large-${it.documentId}" }) { item ->
                FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
            }
        }
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
fun BrowseScreen(
    state: OrganizerUiState,
    onBrowseLayoutChange: (BrowseLayoutMode) -> Unit,
    onOpenFolder: (FileItem) -> Unit,
    onPickFolder: () -> Unit,
    onNavigateToBreadcrumb: (Int) -> Unit,
    onShowBrowseControls: () -> Unit,
    onDismissBrowseControls: () -> Unit,
    onBrowseSortOptionChange: (BrowseSortOption) -> Unit,
    onBrowseSortDirectionChange: (BrowseSortDirection) -> Unit,
    onBrowseScopeFilterChange: (BrowseScopeFilter) -> Unit,
    onBrowseTypeFilterChange: (BrowseTypeFilter) -> Unit,
    onResetBrowseControls: () -> Unit,
    onOpenFileDetail: (FileItem) -> Unit,
    onDismissFileDetail: () -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onShareFile: (FileItem) -> Unit,
    onRequestRename: (FileItem) -> Unit,
    onMoveToTrash: (FileItem) -> Unit,
    onCreateFolder: () -> Unit,
    onEnterSelectionMode: (FileItem) -> Unit,
    onToggleSelection: (FileItem) -> Unit,
    onClearSelection: () -> Unit,
    onSelectAll: () -> Unit,
    onRequestCopySelection: () -> Unit,
    onRequestMoveSelection: () -> Unit,
    onRequestShareSelection: () -> Unit,
    onRequestRenameSelection: () -> Unit,
    onDeleteSelection: () -> Unit,
    onDismissDestinationPicker: () -> Unit,
    onOpenDestinationFolder: (FileItem) -> Unit,
    onNavigateDestinationBreadcrumb: (Int) -> Unit,
    onConfirmDestinationOperation: () -> Unit,
    onCreateFolderInDestination: () -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    val visibleItems = remember(
        state.items,
        state.browseSortOption,
        state.browseSortDirection,
        state.browseScopeFilter,
        state.browseTypeFilter
    ) {
        state.visibleBrowseItems()
    }
    val folderCount = visibleItems.count { it.isDirectory }
    val fileCount = visibleItems.size - folderCount
    val currentPathSummary = remember(state.breadcrumb) {
        state.breadcrumb.joinToString(" / ") { it.name }
    }
    val hasActiveBrowseFilters = state.browseScopeFilter != BrowseScopeFilter.ALL ||
        state.browseTypeFilter != BrowseTypeFilter.ALL
    val browseControlsSummary = remember(
        state.browseSortOption,
        state.browseSortDirection,
        state.browseScopeFilter,
        state.browseTypeFilter
    ) {
        buildBrowseControlsSummary(state)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush())
    ) {
        BrowseExplorerCard(
            state = state,
            visibleItemCount = visibleItems.size,
            folderCount = folderCount,
            fileCount = fileCount,
            controlsSummary = browseControlsSummary,
            breadcrumb = state.breadcrumb,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            onBrowseLayoutChange = onBrowseLayoutChange,
            onShowBrowseControls = onShowBrowseControls,
            onNavigateToBreadcrumb = onNavigateToBreadcrumb,
            onCreateFolder = onCreateFolder
        )
        if (state.isSelectionMode) {
            BrowseActionModeCard(
                state = state,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                onClearSelection = onClearSelection,
                onSelectAll = onSelectAll,
                onRequestCopySelection = onRequestCopySelection,
                onRequestMoveSelection = onRequestMoveSelection,
                onRequestShareSelection = onRequestShareSelection,
                onRequestRenameSelection = onRequestRenameSelection,
                onDeleteSelection = onDeleteSelection
            )
        }
        DestinationPickerDialog(
            state = state,
            onDismiss = onDismissDestinationPicker,
            onOpenFolder = onOpenDestinationFolder,
            onNavigateToBreadcrumb = onNavigateDestinationBreadcrumb,
            onConfirm = onConfirmDestinationOperation,
            onCreateFolder = onCreateFolderInDestination
        )
        if (state.showBrowseControlsSheet) {
            BrowseControlsBottomSheet(
                state = state,
                onDismiss = onDismissBrowseControls,
                onBrowseSortOptionChange = onBrowseSortOptionChange,
                onBrowseSortDirectionChange = onBrowseSortDirectionChange,
                onBrowseScopeFilterChange = onBrowseScopeFilterChange,
                onBrowseTypeFilterChange = onBrowseTypeFilterChange,
                onReset = onResetBrowseControls
            )
        }
        state.fileDetailTarget?.let { item ->
            FileDetailBottomSheet(
                item = item,
                currentPathSummary = currentPathSummary,
                onDismiss = onDismissFileDetail,
                onOpen = {
                    onDismissFileDetail()
                    onOpenFile(item)
                },
                onShare = {
                    onDismissFileDetail()
                    onShareFile(item)
                },
                onRename = if (item.canRename) {
                    {
                        onDismissFileDetail()
                        onRequestRename(item)
                    }
                } else {
                    null
                },
                onMoveToTrash = if (item.canDelete) {
                    {
                        onDismissFileDetail()
                        onMoveToTrash(item)
                    }
                } else {
                    null
                }
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                when {
                    state.items.isEmpty() -> BrowseEmptyState(
                        title = "This folder is empty",
                        subtitle = "Create a folder here or move files in when you want this part of the explorer to grow.",
                        resetLabel = null,
                        onReset = null
                    )

                    visibleItems.isEmpty() -> BrowseEmptyState(
                        title = "Nothing matches the current filter",
                        subtitle = "The folder still has content, but your current folder or type filter is hiding everything here.",
                        resetLabel = if (hasActiveBrowseFilters) "Reset filters" else null,
                        onReset = if (hasActiveBrowseFilters) onResetBrowseControls else null
                    )

                    state.browseLayoutMode == BrowseLayoutMode.GRID -> {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 148.dp),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 28.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            gridItems(visibleItems, key = { it.documentId }) { item ->
                                FileGridCard(
                                    item = item,
                                    selected = state.selectedDocumentIds.contains(item.documentId),
                                    selectionMode = state.isSelectionMode,
                                    onClick = {
                                        if (state.isSelectionMode) {
                                            onToggleSelection(item)
                                        } else if (item.isDirectory) {
                                            onOpenFolder(item)
                                        } else {
                                            onOpenFileDetail(item)
                                        }
                                    },
                                    onLongPress = { onEnterSelectionMode(item) },
                                    onShare = if (!state.isSelectionMode && !item.isDirectory) { { onShareFile(item) } } else null,
                                    onRename = if (!state.isSelectionMode && item.canRename) { { onRequestRename(item) } } else null,
                                    onDelete = if (!state.isSelectionMode && item.canDelete) { { onMoveToTrash(item) } } else null
                                )
                            }
                        }
                    }

                    else -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 28.dp, top = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            items(visibleItems, key = { it.documentId }) { item ->
                                FileRow(
                                    item = item,
                                    selected = state.selectedDocumentIds.contains(item.documentId),
                                    selectionMode = state.isSelectionMode,
                                    onClick = {
                                        if (state.isSelectionMode) {
                                            onToggleSelection(item)
                                        } else if (item.isDirectory) {
                                            onOpenFolder(item)
                                        } else {
                                            onOpenFileDetail(item)
                                        }
                                    },
                                    onLongPress = { onEnterSelectionMode(item) },
                                    onShare = if (!state.isSelectionMode && !item.isDirectory) { { onShareFile(item) } } else null,
                                    onRename = if (!state.isSelectionMode && item.canRename) { { onRequestRename(item) } } else null,
                                    onDelete = if (!state.isSelectionMode && item.canDelete) { { onMoveToTrash(item) } } else null
                                )
                            }
                            item { Spacer(modifier = Modifier.height(12.dp)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeStorageSummaryCard(
    summary: HomeSummary,
    modifier: Modifier = Modifier,
    onOpenStorage: () -> Unit
) {
    val totalCapacity = summary.freeBytes?.let { summary.usedBytes + it }
    val usageProgress = if (totalCapacity != null && totalCapacity > 0L) {
        (summary.usedBytes.toFloat() / totalCapacity.toFloat()).coerceIn(0f, 1f)
    } else {
        null
    }
    Card(
        modifier = modifier.fillMaxWidth(),
        onClick = onOpenStorage,
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Dashboard utility",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
            Text(
                "Storage summary",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Used ${formatBytes(summary.usedBytes)}${summary.freeBytes?.let { " | Free ${formatBytes(it)}" }.orEmpty()}",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            usageProgress?.let {
                LinearProgressIndicator(
                    progress = { it },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.56f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatPill("${summary.fileCount} files")
                StatPill("${summary.folderCount} folders")
            }
            if (summary.topCategories.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(summary.topCategories, key = { it.kind.name }) { category ->
                        AssistChip(
                            onClick = onOpenStorage,
                            label = {
                                Text(
                                    "${kindLabel(category.kind)} ${formatBytes(category.bytes)}"
                                )
                            }
                        )
                    }
                }
            }
            Text(
                "Open Storage to drill into categories and large files.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.tertiary
            )
        }
    }
}

@Composable
private fun OnboardingProgress(page: Int, steps: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(steps) { index ->
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(4.dp),
                shape = RoundedCornerShape(999.dp),
                color = if (index <= page) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                }
            ) {}
        }
    }
}

@Composable
private fun OnboardingPage(
    eyebrow: String,
    title: String,
    body: String,
    points: List<String>
) {
    Card(
        shape = RoundedCornerShape(30.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(eyebrow, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.tertiary)
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
            Text(body, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
            BrandChecklist(points)
        }
    }
}

@Composable
private fun PermissionEducationPage(
    permissionState: OnboardingPermissionState,
    onRequestAccess: () -> Unit
) {
    val title = when (permissionState) {
        OnboardingPermissionState.NOT_REQUESTED -> "Give OOFM the access a file manager actually needs"
        OnboardingPermissionState.DENIED -> "Storage access is still blocked"
        OnboardingPermissionState.LIMITED -> "Access is partially ready"
        OnboardingPermissionState.READY -> "Storage access is ready"
    }
    val body = when (permissionState) {
        OnboardingPermissionState.NOT_REQUESTED ->
            "Android will show its own permission UI next. OOFM asks for this so Browse, Search, Storage, and Recycle Bin can behave like a real phone file manager."

        OnboardingPermissionState.DENIED ->
            "Android did not grant storage access yet. You can retry now; if you skip, the app will still open but file management features will stay blocked until access is granted."

        OnboardingPermissionState.LIMITED ->
            "Android accepted the permission path, but OOFM is still connecting to the device workspace. You can continue now and let the app finish the handshake."

        OnboardingPermissionState.READY ->
            "Device storage is connected. Browse, Search, and Storage can use the current workspace right away."
    }
    val buttonLabel = when (permissionState) {
        OnboardingPermissionState.DENIED -> "Retry access"
        OnboardingPermissionState.READY -> "Access ready"
        else -> "Grant device access"
    }

    Card(
        shape = RoundedCornerShape(30.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Permission", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.tertiary)
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
            Text(body, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
            BrandChecklist(
                listOf(
                    "Used for browsing, searching, sharing, moving, and restoring files on your phone",
                    "Not a sign-in requirement and not a hidden data-harvesting step",
                    "You can revisit the same explanation later from Settings"
                )
            )
            FilledTonalButton(
                onClick = onRequestAccess,
                enabled = permissionState != OnboardingPermissionState.READY
            ) {
                Text(buttonLabel)
            }
        }
    }
}

@Composable
private fun DisclosurePage() {
    Card(
        shape = RoundedCornerShape(30.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Transparency", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.tertiary)
            Text("What OOFM does and does not do", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "Before you continue, the product should be clear about its boundaries. This is a mobile file manager first. Store release legal copy can tighten later, but the core promise should already be understandable.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            BrandChecklist(
                listOf(
                    "OOFM uses storage access to help you browse, search, sort, share, and recover files on your device",
                    "The app does not force account creation before core file-management use",
                    "Privacy summary, data-use summary, policy, and about surfaces stay reachable in Settings"
                )
            )
        }
    }
}

@Composable
private fun PinnedEntryCard(
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    val icon = quickEntryIcon(title)
    OutlinedCard(
        onClick = onClick,
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.16f))
    ) {
        Column(
            modifier = Modifier
                .width(170.dp)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.88f)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.padding(10.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun SearchScreen(
    state: OrganizerUiState,
    onPickFolder: () -> Unit,
    onQueryChange: (String) -> Unit,
    onKindFilter: (FileKind?) -> Unit,
    onDateFilter: (SearchDateFilter) -> Unit,
    onSizeFilter: (SearchSizeFilter) -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onShowInBrowse: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush())
    ) {
        SearchExplorerPanel(
            state = state,
            onQueryChange = onQueryChange,
            onKindFilter = onKindFilter,
            onDateFilter = onDateFilter,
            onSizeFilter = onSizeFilter,
            modifier = Modifier.padding(top = 12.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            when {
                state.searchQuery.isBlank() -> SectionHint("Type a file name to search inside the connected storage view.")
                state.isSearchLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            CircularProgressIndicator()
                            Text("Scanning files inside the current storage root...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                state.searchResults.isEmpty() -> SearchEmptyState(
                    query = state.searchQuery,
                    hasFilters = state.searchFilters.kind != null ||
                        state.searchFilters.dateFilter != SearchDateFilter.ANYTIME ||
                        state.searchFilters.sizeFilter != SearchSizeFilter.ANY
                )
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            SectionTitle(
                                "Search results",
                                "${state.searchResults.size} match(es) in ${state.root.displayName}."
                            )
                        }
                        items(state.searchResults, key = { "search-${it.documentId}" }) { item ->
                            SearchResultCard(
                                item = item,
                                rootDocumentId = state.root.rootDocumentId,
                                onOpen = { if (item.isDirectory) onShowInBrowse(item) else onOpenFile(item) },
                                onShowInBrowse = { onShowInBrowse(item) }
                            )
                        }
                        item { Spacer(modifier = Modifier.height(12.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
fun StorageScreen(
    state: OrganizerUiState,
    onPickFolder: () -> Unit,
    onRetrySummary: () -> Unit,
    onOpenStorageCategory: (StorageCategoryKey) -> Unit,
    onClearStorageCategory: () -> Unit,
    onOpenCategoryFolder: () -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onOpenParent: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }
    val summary = state.storageSummary
    if (summary == null) {
        if (state.isStorageRefreshing) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    CircularProgressIndicator()
                    Text("Scanning storage root...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            BrowseEmptyState(
                title = "Storage insight is not ready yet",
                subtitle = "The explorer is connected, but the summary scan did not finish. Retry when you want a fresh storage breakdown.",
                resetLabel = "Retry storage scan",
                onReset = onRetrySummary
            )
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush()),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            StorageOverviewCard(
                state = state,
                summary = summary,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
        state.storageCategoryView?.let { categoryView ->
            item {
                StorageCategoryExplorerCard(
                    view = categoryView,
                    modifier = Modifier.padding(horizontal = 16.dp),
                    onBack = onClearStorageCategory,
                    onOpenCategoryFolder = if (categoryView.folderPath != null) onOpenCategoryFolder else null
                )
            }
            if (categoryView.items.isEmpty()) {
                item {
                    SectionHint("OOFM did not surface any items in this category yet.")
                }
            } else {
                items(categoryView.items, key = { "storage-category-${it.documentId}" }) { item ->
                    FileRow(
                        item = item,
                        onClick = { onOpenFile(item) },
                        onOpenParent = { onOpenParent(item) }
                    )
                }
            }
        } ?: run {
            item { SectionTitle("Categories", "Tap a category to inspect matching files with the same explorer language as Browse.") }
            item {
                StorageCategoryShortcutGrid(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    onOpenCategory = onOpenStorageCategory
                )
            }
            item { SectionTitle("Largest files", "Open the file directly or jump back to its parent folder.") }
            items(summary.largeFiles, key = { "storage-${it.documentId}" }) { item ->
                FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
            }
        }
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
private fun StorageCategoryShortcutGrid(
    modifier: Modifier = Modifier,
    onOpenCategory: (StorageCategoryKey) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = modifier.heightIn(max = 420.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        gridItems(
            listOf(
                StorageCategoryKey.IMAGES,
                StorageCategoryKey.VIDEOS,
                StorageCategoryKey.AUDIO,
                StorageCategoryKey.DOCUMENTS,
                StorageCategoryKey.ARCHIVES_AND_APKS,
                StorageCategoryKey.DOWNLOADS
            ),
            key = { it.name }
        ) { category ->
            StorageCategoryCard(category = category, onClick = { onOpenCategory(category) })
        }
    }
}

@Composable
private fun StorageCategoryCard(
    category: StorageCategoryKey,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.42f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.88f)
            ) {
                Icon(
                    imageVector = when (category) {
                        StorageCategoryKey.DOWNLOADS -> Icons.Default.Folder
                        else -> Icons.Default.UploadFile
                    },
                    contentDescription = null,
                    modifier = Modifier.padding(12.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Text(storageCategoryTitle(category), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(
                storageCategorySubtitle(category),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StorageCategoryExplorerCard(
    view: StorageCategoryView,
    modifier: Modifier = Modifier,
    onBack: () -> Unit,
    onOpenCategoryFolder: (() -> Unit)?
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                view.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                view.subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onBack) {
                    Text("Back to overview")
                }
                if (onOpenCategoryFolder != null) {
                    FilledTonalButton(onClick = onOpenCategoryFolder) {
                        Text("Open folder in Browse")
                    }
                }
            }
            Text(
                "${view.items.size} item(s) surfaced in this category.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.tertiary
            )
        }
    }
}

@Composable
private fun SearchExplorerPanel(
    state: OrganizerUiState,
    onQueryChange: (String) -> Unit,
    onKindFilter: (FileKind?) -> Unit,
    onDateFilter: (SearchDateFilter) -> Unit,
    onSizeFilter: (SearchSizeFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Search",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                "Connected to ${state.root?.displayName.orEmpty()}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = onQueryChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Search files") },
                singleLine = true
            )
            Text(
                "Type filters",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = state.searchFilters.kind == null, onClick = { onKindFilter(null) }, label = { Text("All types") }) }
                item { FilterChip(selected = state.searchFilters.kind == FileKind.IMAGE, onClick = { onKindFilter(FileKind.IMAGE) }, label = { Text("Images") }) }
                item { FilterChip(selected = state.searchFilters.kind == FileKind.DOCUMENT, onClick = { onKindFilter(FileKind.DOCUMENT) }, label = { Text("Documents") }) }
                item { FilterChip(selected = state.searchFilters.kind == FileKind.VIDEO, onClick = { onKindFilter(FileKind.VIDEO) }, label = { Text("Videos") }) }
                item { FilterChip(selected = state.searchFilters.kind == FileKind.AUDIO, onClick = { onKindFilter(FileKind.AUDIO) }, label = { Text("Audio") }) }
            }
            Text(
                "Time and size",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.ANYTIME, onClick = { onDateFilter(SearchDateFilter.ANYTIME) }, label = { Text("Any time") }) }
                item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.LAST_7_DAYS, onClick = { onDateFilter(SearchDateFilter.LAST_7_DAYS) }, label = { Text("7 days") }) }
                item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.LAST_30_DAYS, onClick = { onDateFilter(SearchDateFilter.LAST_30_DAYS) }, label = { Text("30 days") }) }
                item { FilterChip(selected = state.searchFilters.sizeFilter == SearchSizeFilter.LARGE_10_MB, onClick = { onSizeFilter(SearchSizeFilter.LARGE_10_MB) }, label = { Text("10 MB+") }) }
                item { FilterChip(selected = state.searchFilters.sizeFilter == SearchSizeFilter.HUGE_100_MB, onClick = { onSizeFilter(SearchSizeFilter.HUGE_100_MB) }, label = { Text("100 MB+") }) }
            }
        }
    }
}

@Composable
private fun SearchEmptyState(
    query: String,
    hasFilters: Boolean
) {
    SectionHint(
        if (hasFilters) {
            "No results matched \"$query\" with the active filters. Try clearing some filters or opening Browse for a manual path check."
        } else {
            "No results matched \"$query\". Try a shorter name or jump into Browse if you remember the folder."
        }
    )
}

@Composable
private fun SearchResultCard(
    item: FileItem,
    rootDocumentId: String,
    onOpen: () -> Unit,
    onShowInBrowse: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f)
                ) {
                    Icon(
                        imageVector = if (item.isDirectory) Icons.Default.Folder else Icons.Default.UploadFile,
                        contentDescription = null,
                        modifier = Modifier.padding(10.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(item.name, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(
                        if (item.isDirectory) "Folder result" else "${kindLabel(item.kind)} • ${formatBytes(item.sizeBytes ?: 0L)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Text(
                locationSummary(item, rootDocumentId),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.tertiary
            )
            Text(
                "Modified ${formatDate(item.lastModified)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onOpen) {
                    Text(if (item.isDirectory) "Open folder" else "Open")
                }
                OutlinedButton(onClick = onShowInBrowse) {
                    Text("Show in Browse")
                }
            }
        }
    }
}

@Composable
fun TrashScreen(
    state: OrganizerUiState,
    onRestore: (TrashEntry) -> Unit,
    onDeletePermanently: (TrashEntry) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush()),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            WorkspaceContextStrip(
                title = "Recycle Bin",
                subtitle = "Deleted items stay recoverable here until you decide they should disappear forever.",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
            )
        }
        if (state.trashEntries.isEmpty()) {
            item { SectionHint("Recycle Bin is empty.") }
        } else {
            items(state.trashEntries, key = { it.id }) { entry ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(entry.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Deleted ${formatDate(entry.deletedAt)} | ${formatBytes(entry.sizeBytes ?: 0L)}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilledTonalButton(onClick = { onRestore(entry) }) {
                                Text("Restore")
                            }
                            OutlinedButton(onClick = { onDeletePermanently(entry) }) {
                                Text("Delete forever")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    state: OrganizerUiState,
    onPickFolder: () -> Unit,
    onClearRoot: () -> Unit,
    onClearTrash: () -> Unit
) {
    var infoSheet by remember { mutableStateOf<SettingsInfoSheet?>(null) }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBackgroundBrush()),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(26.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondary)
            ) {
                  Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                      BrandWordmarkBadge(compact = true)
                      Text("Omnia Organizer", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSecondary)
                      Text("Package com.omnia.organizer", color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.8f))
                      Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.8f))
                      Text(if (BuildConfig.ALPHA) "Channel Alpha" else "Channel Release", color = MaterialTheme.colorScheme.primary)
                      Text(
                          "This screen now shows the exact installed build so phone testing and Play-prep reviews stay grounded.",
                          style = MaterialTheme.typography.bodySmall,
                          color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.82f)
                      )
                  }
            }
        }
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Storage access", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(state.root?.displayName ?: "Device storage not connected")
                    Text(
                        if (state.root != null) "Status: Connected and ready" else "Status: Waiting for device access",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                    Text(
                        "OOFM now targets full phone storage access where Android allows it. If access is lost, reconnect from here and the app will rebuild its device view.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = onPickFolder) { Text("Reconnect storage") }
                        if (state.root != null) {
                            OutlinedButton(onClick = onClearRoot) { Text("Reset access") }
                        }
                    }
                }
            }
        }
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Privacy and trust", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        "The app is built to organize files on your device without forcing sign-in first. Storage access is requested so browse, search, open, share, and recycle flows can work like a proper mobile file manager.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "Current launch posture: device-first behavior, no forced account wall, and trust disclosures reachable in-product before Play rollout.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = { infoSheet = SettingsInfoSheet.PRIVACY }) { Text("Privacy summary") }
                        OutlinedButton(onClick = { infoSheet = SettingsInfoSheet.DATA_USE }) { Text("Data use") }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { infoSheet = SettingsInfoSheet.TERMS }) { Text("Terms & policy") }
                        OutlinedButton(onClick = { infoSheet = SettingsInfoSheet.ABOUT }) { Text("About OOFM") }
                    }
                    Text(
                        "Launch contact: omnia.organizer.app@gmail.com",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
        if (state.reducedEffectsMode) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Device stability mode", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "OOFM detected a lower-memory or lower-headroom device profile and is keeping some startup and summary work lighter so core file actions stay responsive.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Recycle Bin", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("${state.trashEntries.size} saved item(s)")
                    Text(
                        "Metadata can be cleared without touching the already-trashed files on disk. This is mainly an alpha recovery tool.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedButton(onClick = onClearTrash) { Text("Clear metadata list") }
                }
            }
        }
    }
    infoSheet?.let { sheet ->
        SettingsInfoDialog(sheet = sheet, onDismiss = { infoSheet = null })
    }
}

@Composable
fun RenameDialog(state: OrganizerUiState, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    val item = state.renameTarget ?: return
    var newName by remember(item.documentId) { mutableStateOf(item.name) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename file") },
        text = {
            OutlinedTextField(
                value = newName,
                onValueChange = { newName = it },
                label = { Text("New name") },
                singleLine = true
            )
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(newName) }) {
                Text("Rename")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun CreateFolderDialog(state: OrganizerUiState, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    if (!state.showCreateFolderDialog) return
    var folderName by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create folder") },
        text = {
            OutlinedTextField(
                value = folderName,
                onValueChange = { folderName = it },
                label = { Text("Folder name") },
                singleLine = true
            )
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(folderName) }) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun BrandWordmarkBadge(compact: Boolean = false) {
    Surface(
        shape = RoundedCornerShape(if (compact) 18.dp else 24.dp),
        color = MaterialTheme.colorScheme.secondary,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.28f))
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = if (compact) 10.dp else 14.dp,
                vertical = if (compact) 8.dp else 12.dp
            ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.omnia_creata_logo),
                contentDescription = "Omnia Creata",
                modifier = Modifier
                    .size(if (compact) 32.dp else 38.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    "OmniaCreata",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "Premium file clarity for mobile",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSecondary
                )
            }
        }
    }
}

@Composable
private fun BrandChecklist(points: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        points.forEach { point ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    modifier = Modifier.padding(top = 2.dp),
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.primary
                ) {
                    Text(
                        ">",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
                Text(
                    point,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
private fun WorkspaceHeroCard(
    state: OrganizerUiState,
    modifier: Modifier = Modifier,
    onPickFolder: () -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Connected workspace",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
            Text(
                state.root?.displayName.orEmpty(),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                "Browse, search, storage, and recovery all stay inside this connected device view.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (state.isStorageRefreshing) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.24f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onPickFolder) {
                    Text("Reconnect storage")
                }
                StatPill(label = "${state.recentFiles.size} recents")
                if (state.storageSummary != null) {
                    StatPill(label = formatBytes(state.storageSummary.totalBytes))
                }
            }
        }
    }
}

@Composable
private fun StorageOverviewCard(
    state: OrganizerUiState,
    summary: StorageSummary,
    modifier: Modifier = Modifier
) {
    val totalCapacity = summary.freeBytes?.let { summary.totalBytes + it }
    val usageProgress = if (totalCapacity != null && totalCapacity > 0L) {
        (summary.totalBytes.toFloat() / totalCapacity.toFloat()).coerceIn(0f, 1f)
    } else {
        null
    }
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Storage overview",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                state.root?.displayName.orEmpty(),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Surface(
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.72f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "Used ${formatBytes(summary.totalBytes)}${summary.freeBytes?.let { " | Free ${formatBytes(it)}" }.orEmpty()}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "Tap a category to drill in or use the largest files list for cleanup.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            usageProgress?.let {
                LinearProgressIndicator(
                    progress = { it },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.44f)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatPill(label = "${summary.fileCount} files")
                StatPill(label = "${summary.folderCount} folders")
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatPill(label = "Large ${state.largeFiles.size}")
                StatPill(label = "Recent ${state.recentFiles.size}")
            }
            if (state.isStorageRefreshing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            } else if (state.lastStorageScanAt != null) {
                Text(
                    "Last scan ${formatDate(state.lastStorageScanAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CategoryPills(summary: StorageSummary) {
    if (summary.categories.isEmpty()) return
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(summary.categories.take(4), key = { it.kind.name }) { category ->
            AssistChip(
                onClick = {},
                label = {
                    Text(
                        "${category.kind.name.lowercase().replaceFirstChar(Char::uppercase)} ${formatBytes(category.bytes)}"
                    )
                }
            )
        }
    }
}

@Composable
private fun WorkspaceContextStrip(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.18f))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                "Workspace",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
            Text(title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun BreadcrumbTrail(
    breadcrumb: List<FolderHandle>,
    onNavigateToBreadcrumb: (Int) -> Unit,
    onCreateFolder: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState),
            verticalAlignment = Alignment.CenterVertically
        ) {
            breadcrumb.forEachIndexed { index, handle ->
                if (index > 0) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                AssistChip(
                    onClick = { onNavigateToBreadcrumb(index) },
                    label = { Text(handle.name, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (breadcrumb.size > 1) {
                OutlinedCard(onClick = { onNavigateToBreadcrumb(breadcrumb.lastIndex - 1) }) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null
                        )
                        Text("Up one folder")
                    }
                }
            }
            OutlinedButton(onClick = onCreateFolder) {
                Text("New folder")
            }
        }
    }
}

@Composable
private fun BrowseExplorerCard(
    state: OrganizerUiState,
    visibleItemCount: Int,
    folderCount: Int,
    fileCount: Int,
    controlsSummary: String,
    breadcrumb: List<FolderHandle>,
    onBrowseLayoutChange: (BrowseLayoutMode) -> Unit,
    onShowBrowseControls: () -> Unit,
    onNavigateToBreadcrumb: (Int) -> Unit,
    onCreateFolder: () -> Unit,
    modifier: Modifier = Modifier
) {
    val breadcrumbScrollState = rememberScrollState()
    val actionScrollState = rememberScrollState()
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.96f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = "Current folder",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                    Text(
                        text = breadcrumb.lastOrNull()?.name ?: state.root?.displayName.orEmpty(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                StatPill(label = "$visibleItemCount items")
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatPill(label = "$folderCount folders")
                StatPill(label = "$fileCount files")
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(breadcrumbScrollState),
                verticalAlignment = Alignment.CenterVertically
            ) {
                breadcrumb.forEachIndexed { index, handle ->
                    if (index > 0) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    AssistChip(
                        onClick = { onNavigateToBreadcrumb(index) },
                        label = { Text(handle.name, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    )
                }
            }
            Text(
                text = controlsSummary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(actionScrollState),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = state.browseLayoutMode == BrowseLayoutMode.LIST,
                    onClick = { onBrowseLayoutChange(BrowseLayoutMode.LIST) },
                    label = { Text("List") }
                )
                FilterChip(
                    selected = state.browseLayoutMode == BrowseLayoutMode.GRID,
                    onClick = { onBrowseLayoutChange(BrowseLayoutMode.GRID) },
                    label = { Text("Grid") }
                )
                AssistChip(onClick = onCreateFolder, label = { Text("New folder") })
                AssistChip(onClick = onShowBrowseControls, label = { Text("Sort & filter") })
            }
        }
    }
}

private enum class SettingsInfoSheet {
    PRIVACY,
    DATA_USE,
    TERMS,
    ABOUT
}

@Composable
private fun SettingsInfoDialog(
    sheet: SettingsInfoSheet,
    onDismiss: () -> Unit
) {
    val title = when (sheet) {
        SettingsInfoSheet.PRIVACY -> "Privacy summary"
        SettingsInfoSheet.DATA_USE -> "Data use"
        SettingsInfoSheet.TERMS -> "Terms & policy"
        SettingsInfoSheet.ABOUT -> "About OOFM"
    }
    val body = when (sheet) {
        SettingsInfoSheet.PRIVACY ->
            "Omnia Organizer is built around on-device file management.\n\nStorage access exists so Browse, Search, Storage, sharing, move, rename, and Recycle Bin flows can work.\n\nCore file-management use does not require an account.\n\nCurrent trust posture:\n- device-first storage handling\n- no forced signup wall\n- reconnectable access states shown in product"

        SettingsInfoSheet.DATA_USE ->
            "At this alpha stage, OOFM keeps file-management work on the device.\n\nThe app does not need hidden profiling to browse, search, sort, move, share, or recover files.\n\nIf future versions add cloud sync, analytics, AI services, or account features, they should ship as explicit product changes with updated policy and disclosure."

        SettingsInfoSheet.TERMS ->
            "Formal terms, privacy policy, and store-facing legal copy still need their final review before public launch.\n\nCurrent product boundaries:\n- no forced account wall for core use\n- storage access is requested for file-management flows\n- files stay device-first in the current alpha path\n- support contact planned for launch: omnia.organizer.app@gmail.com"

        SettingsInfoSheet.ABOUT ->
            "OOFM is the internal shorthand for Omnia Organizer: File Manager.\n\nIt is an OmniaCreata mobile utility focused on calm, premium file control instead of ad-heavy or desktop-style file browsers.\n\nCurrent release goal: ship a trustworthy Android-first mobile file manager before broader automation or cloud layers."
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text(body)
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
private fun BrowseActionModeCard(
    state: OrganizerUiState,
    modifier: Modifier = Modifier,
    onClearSelection: () -> Unit,
    onSelectAll: () -> Unit,
    onRequestCopySelection: () -> Unit,
    onRequestMoveSelection: () -> Unit,
    onRequestShareSelection: () -> Unit,
    onRequestRenameSelection: () -> Unit,
    onDeleteSelection: () -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        "${state.selectedDocumentIds.size} selected",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        "Browse action mode is active for this folder.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onSelectAll) {
                        Text("Select all")
                    }
                    TextButton(onClick = onClearSelection) {
                        Text("Cancel")
                    }
                }
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilledTonalButton(onClick = onRequestCopySelection) {
                        Text("Copy")
                    }
                }
                item {
                    FilledTonalButton(onClick = onRequestMoveSelection) {
                        Text("Move")
                    }
                }
                item {
                    FilledTonalButton(onClick = onRequestShareSelection) {
                        Text("Share")
                    }
                }
                if (state.selectedDocumentIds.size == 1) {
                    item {
                        FilledTonalButton(onClick = onRequestRenameSelection) {
                            Text("Rename")
                        }
                    }
                }
                item {
                    FilledTonalButton(onClick = onDeleteSelection) {
                        Text("Delete")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BrowseControlsBottomSheet(
    state: OrganizerUiState,
    onDismiss: () -> Unit,
    onBrowseSortOptionChange: (BrowseSortOption) -> Unit,
    onBrowseSortDirectionChange: (BrowseSortDirection) -> Unit,
    onBrowseScopeFilterChange: (BrowseScopeFilter) -> Unit,
    onBrowseTypeFilterChange: (BrowseTypeFilter) -> Unit,
    onReset: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Sort & filter", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    "These controls only affect the current folder, so Browse stays predictable as you move around.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            BrowseSheetSection("Sort by") {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = state.browseSortOption == BrowseSortOption.NAME,
                            onClick = { onBrowseSortOptionChange(BrowseSortOption.NAME) },
                            label = { Text("Name") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseSortOption == BrowseSortOption.DATE_MODIFIED,
                            onClick = { onBrowseSortOptionChange(BrowseSortOption.DATE_MODIFIED) },
                            label = { Text("Date modified") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseSortOption == BrowseSortOption.SIZE,
                            onClick = { onBrowseSortOptionChange(BrowseSortOption.SIZE) },
                            label = { Text("Size") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseSortOption == BrowseSortOption.TYPE,
                            onClick = { onBrowseSortOptionChange(BrowseSortOption.TYPE) },
                            label = { Text("Type") }
                        )
                    }
                }
            }

            BrowseSheetSection("Direction") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = state.browseSortDirection == BrowseSortDirection.ASCENDING,
                        onClick = { onBrowseSortDirectionChange(BrowseSortDirection.ASCENDING) },
                        label = { Text("Ascending") }
                    )
                    FilterChip(
                        selected = state.browseSortDirection == BrowseSortDirection.DESCENDING,
                        onClick = { onBrowseSortDirectionChange(BrowseSortDirection.DESCENDING) },
                        label = { Text("Descending") }
                    )
                }
            }

            BrowseSheetSection("Scope") {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = state.browseScopeFilter == BrowseScopeFilter.ALL,
                            onClick = { onBrowseScopeFilterChange(BrowseScopeFilter.ALL) },
                            label = { Text("All items") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseScopeFilter == BrowseScopeFilter.FOLDERS_ONLY,
                            onClick = { onBrowseScopeFilterChange(BrowseScopeFilter.FOLDERS_ONLY) },
                            label = { Text("Folders only") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseScopeFilter == BrowseScopeFilter.FILES_ONLY,
                            onClick = { onBrowseScopeFilterChange(BrowseScopeFilter.FILES_ONLY) },
                            label = { Text("Files only") }
                        )
                    }
                }
            }

            BrowseSheetSection("File type") {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.ALL,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.ALL) },
                            label = { Text("All files") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.IMAGES,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.IMAGES) },
                            label = { Text("Images") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.VIDEOS,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.VIDEOS) },
                            label = { Text("Videos") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.AUDIO,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.AUDIO) },
                            label = { Text("Audio") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.DOCUMENTS,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.DOCUMENTS) },
                            label = { Text("Documents") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = state.browseTypeFilter == BrowseTypeFilter.ARCHIVES_AND_APKS,
                            onClick = { onBrowseTypeFilterChange(BrowseTypeFilter.ARCHIVES_AND_APKS) },
                            label = { Text("Archives/APKs") }
                        )
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                TextButton(onClick = onReset) {
                    Text("Reset")
                }
                FilledTonalButton(onClick = onDismiss) {
                    Text("Done")
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
private fun BrowseSheetSection(
    title: String,
    content: @Composable () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FileDetailBottomSheet(
    item: FileItem,
    currentPathSummary: String,
    onDismiss: () -> Unit,
    onOpen: () -> Unit,
    onShare: () -> Unit,
    onRename: (() -> Unit)?,
    onMoveToTrash: (() -> Unit)?
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(item.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    currentPathSummary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                FileDetailStatRow(label = "Type", value = kindLabel(item.kind))
                FileDetailStatRow(label = "Size", value = formatBytes(item.sizeBytes ?: 0L))
                FileDetailStatRow(label = "Modified", value = formatDate(item.lastModified))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilledTonalButton(onClick = onOpen, modifier = Modifier.weight(1f)) {
                    Text("Open")
                }
                OutlinedButton(onClick = onShare, modifier = Modifier.weight(1f)) {
                    Text("Share")
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (onRename != null) {
                    OutlinedButton(onClick = onRename, modifier = Modifier.weight(1f)) {
                        Text("Rename")
                    }
                }
                if (onMoveToTrash != null) {
                    OutlinedButton(onClick = onMoveToTrash, modifier = Modifier.weight(1f)) {
                        Text("Move to Recycle Bin")
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

@Composable
private fun FileDetailStatRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(start = 12.dp)
        )
    }
}

@Composable
private fun BrowseEmptyState(
    title: String,
    subtitle: String,
    resetLabel: String?,
    onReset: (() -> Unit)?
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 28.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.36f)),
            shape = RoundedCornerShape(26.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalAlignment = Alignment.Start
            ) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (resetLabel != null && onReset != null) {
                    OutlinedButton(onClick = onReset) {
                        Text(resetLabel)
                    }
                }
            }
        }
    }
}

@Composable
private fun DestinationPickerDialog(
    state: OrganizerUiState,
    onDismiss: () -> Unit,
    onOpenFolder: (FileItem) -> Unit,
    onNavigateToBreadcrumb: (Int) -> Unit,
    onConfirm: () -> Unit,
    onCreateFolder: () -> Unit
) {
    val picker = state.destinationPickerState ?: return
    val operationLabel = when (state.pendingFileOperation?.type) {
        FileOperationType.MOVE -> "Move"
        else -> "Copy"
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("$operationLabel destination") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "$operationLabel ${state.pendingFileOperation?.items?.size ?: 0} item(s) inside the current storage connection.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                DestinationBreadcrumbTrail(
                    breadcrumb = picker.breadcrumb,
                    onNavigateToBreadcrumb = onNavigateToBreadcrumb
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (picker.breadcrumb.size > 1) {
                        OutlinedButton(onClick = { onNavigateToBreadcrumb(picker.breadcrumb.lastIndex - 1) }) {
                            Text("Up one folder")
                        }
                    }
                    OutlinedButton(onClick = onCreateFolder) {
                        Text("New folder")
                    }
                }
                if (picker.items.isEmpty()) {
                    Text(
                        "No subfolders here. You can still choose this folder.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 280.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(picker.items, key = { "destination-${it.documentId}" }) { item ->
                            DestinationFolderRow(item = item, onClick = { onOpenFolder(item) })
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Choose this folder")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun DestinationBreadcrumbTrail(
    breadcrumb: List<FolderHandle>,
    onNavigateToBreadcrumb: (Int) -> Unit
) {
    val scrollState = rememberScrollState()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState),
        verticalAlignment = Alignment.CenterVertically
    ) {
        breadcrumb.forEachIndexed { index, handle ->
            if (index > 0) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            AssistChip(
                onClick = { onNavigateToBreadcrumb(index) },
                label = { Text(handle.name, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            )
        }
    }
}

@Composable
private fun DestinationFolderRow(
    item: FileItem,
    onClick: () -> Unit
) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Folder,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Text(
                text = item.name,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FileGridCard(
    item: FileItem,
    selected: Boolean = false,
    selectionMode: Boolean = false,
    onClick: () -> Unit,
    onLongPress: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    onRename: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongPress
            ),
        shape = RoundedCornerShape(24.dp),
        border = if (selected) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null,
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
            } else {
                MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = if (selected) {
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
                    } else {
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f)
                    }
                ) {
                    Icon(
                        imageVector = when {
                            selected -> Icons.Default.CheckCircle
                            item.isDirectory -> Icons.Default.Folder
                            else -> Icons.Default.UploadFile
                        },
                        contentDescription = item.name,
                        modifier = Modifier
                            .size(54.dp)
                            .padding(12.dp),
                        tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
                if (!selectionMode && (onShare != null || onRename != null || onDelete != null)) {
                    Box {
                        IconButton(onClick = { menuExpanded = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Actions")
                        }
                        DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                            if (onShare != null) {
                                DropdownMenuItem(text = { Text("Share") }, onClick = {
                                    menuExpanded = false
                                    onShare()
                                })
                            }
                            if (onRename != null) {
                                DropdownMenuItem(text = { Text("Rename") }, onClick = {
                                    menuExpanded = false
                                    onRename()
                                })
                            }
                            if (onDelete != null) {
                                DropdownMenuItem(text = { Text("Move to Recycle Bin") }, onClick = {
                                    menuExpanded = false
                                    onDelete()
                                })
                            }
                        }
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = if (item.isDirectory) "Folder" else kindLabel(item.kind),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = if (item.isDirectory) "Tap to open folder" else formatBytes(item.sizeBytes ?: 0L),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = formatDate(item.lastModified),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun ShortcutCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.88f)
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.padding(10.dp),
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun StatPill(label: String) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun FileRow(
    item: FileItem,
    selected: Boolean = false,
    selectionMode: Boolean = false,
    onClick: () -> Unit,
    onLongPress: (() -> Unit)? = null,
    onOpenParent: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    onRename: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    var menuExpanded by remember { mutableStateOf(false) }
    val secondaryLine = if (item.isDirectory) {
        "Folder • Updated ${formatDate(item.lastModified)}"
    } else {
        "${kindLabel(item.kind)} • ${formatBytes(item.sizeBytes ?: 0L)} • ${formatDate(item.lastModified)}"
    }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongPress
            ),
        shape = RoundedCornerShape(20.dp),
        border = if (selected) {
            BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
        } else {
            null
        },
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
            } else {
                MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = if (selected) {
                    MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                } else {
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.8f)
                }
            ) {
                Icon(
                    imageVector = when {
                        selected -> Icons.Default.CheckCircle
                        item.kind == FileKind.DIRECTORY -> Icons.Default.Folder
                        else -> Icons.Default.UploadFile
                    },
                    contentDescription = item.name,
                    modifier = Modifier
                        .size(38.dp)
                        .padding(8.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    item.name,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    secondaryLine,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (!selectionMode && (onShare != null || onRename != null || onDelete != null || onOpenParent != null)) {
                Box {
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Actions")
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        if (onOpenParent != null) {
                            DropdownMenuItem(text = { Text("Open parent folder") }, onClick = {
                                menuExpanded = false
                                onOpenParent()
                            })
                        }
                        if (onShare != null) {
                            DropdownMenuItem(text = { Text("Share") }, onClick = {
                                menuExpanded = false
                                onShare()
                            })
                        }
                        if (onRename != null) {
                            DropdownMenuItem(text = { Text("Rename") }, onClick = {
                                menuExpanded = false
                                onRename()
                            })
                        }
                        if (onDelete != null) {
                            DropdownMenuItem(text = { Text("Move to Recycle Bin") }, onClick = {
                                menuExpanded = false
                                onDelete()
                            })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyRootState(onPickFolder: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.secondary,
                        MaterialTheme.colorScheme.surface
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.padding(24.dp),
            shape = RoundedCornerShape(30.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.97f))
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                BrandWordmarkBadge()
                Text("Connect phone storage", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    "Grant device storage access so OOFM can behave like a proper mobile file manager. Once connected, the app will load your phone storage automatically.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                FilledTonalButton(onClick = onPickFolder) {
                    Text("Grant access")
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String? = null) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun screenBackgroundBrush(): Brush {
    return Brush.verticalGradient(
        colors = listOf(
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.surface,
            MaterialTheme.colorScheme.background
        )
    )
}

private fun quickEntryIcon(title: String): ImageVector = when (title.lowercase()) {
    "downloads" -> Icons.Default.UploadFile
    "recycle bin" -> Icons.Default.Delete
    "screenshots" -> Icons.Default.CheckCircle
    "documents" -> Icons.Default.Folder
    else -> Icons.Default.Folder
}

@Composable
private fun SectionHint(text: String) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val units = listOf("B", "KB", "MB", "GB", "TB")
    var value = bytes.toDouble()
    var index = 0
    while (value >= 1024 && index < units.lastIndex) {
        value /= 1024
        index++
    }
    return if (index == 0) "${value.toInt()} ${units[index]}" else String.format("%.1f %s", value, units[index])
}

private fun buildBrowseControlsSummary(state: OrganizerUiState): String {
    val parts = mutableListOf(
        "Sort: ${browseSortLabel(state.browseSortOption)} ${if (state.browseSortDirection == BrowseSortDirection.ASCENDING) "Asc" else "Desc"}",
        "Scope: ${browseScopeLabel(state.browseScopeFilter)}"
    )
    if (state.browseTypeFilter != BrowseTypeFilter.ALL) {
        parts += "Files: ${browseTypeFilterLabel(state.browseTypeFilter)}"
    }
    return parts.joinToString(" | ")
}

private fun browseSortLabel(option: BrowseSortOption): String = when (option) {
    BrowseSortOption.NAME -> "Name"
    BrowseSortOption.DATE_MODIFIED -> "Date modified"
    BrowseSortOption.SIZE -> "Size"
    BrowseSortOption.TYPE -> "Type"
}

private fun browseScopeLabel(filter: BrowseScopeFilter): String = when (filter) {
    BrowseScopeFilter.ALL -> "All items"
    BrowseScopeFilter.FOLDERS_ONLY -> "Folders only"
    BrowseScopeFilter.FILES_ONLY -> "Files only"
}

private fun browseTypeFilterLabel(filter: BrowseTypeFilter): String = when (filter) {
    BrowseTypeFilter.ALL -> "All files"
    BrowseTypeFilter.IMAGES -> "Images"
    BrowseTypeFilter.VIDEOS -> "Videos"
    BrowseTypeFilter.AUDIO -> "Audio"
    BrowseTypeFilter.DOCUMENTS -> "Documents"
    BrowseTypeFilter.ARCHIVES_AND_APKS -> "Archives/APKs"
}

private fun kindLabel(kind: FileKind): String = when (kind) {
    FileKind.DIRECTORY -> "Folder"
    FileKind.IMAGE -> "Image"
    FileKind.VIDEO -> "Video"
    FileKind.AUDIO -> "Audio"
    FileKind.DOCUMENT -> "Document"
    FileKind.ARCHIVE -> "Archive"
    FileKind.APK -> "APK"
    FileKind.OTHER -> "File"
}

private fun storageCategoryTitle(category: StorageCategoryKey): String = when (category) {
    StorageCategoryKey.IMAGES -> "Images"
    StorageCategoryKey.VIDEOS -> "Videos"
    StorageCategoryKey.AUDIO -> "Audio"
    StorageCategoryKey.DOCUMENTS -> "Documents"
    StorageCategoryKey.ARCHIVES_AND_APKS -> "Archives & APKs"
    StorageCategoryKey.DOWNLOADS -> "Downloads"
}

private fun storageCategorySubtitle(category: StorageCategoryKey): String = when (category) {
    StorageCategoryKey.IMAGES -> "Photos, screenshots, edits"
    StorageCategoryKey.VIDEOS -> "Clips, recordings, reels"
    StorageCategoryKey.AUDIO -> "Voice notes and music"
    StorageCategoryKey.DOCUMENTS -> "PDFs and office files"
    StorageCategoryKey.ARCHIVES_AND_APKS -> "Packages and compressed files"
    StorageCategoryKey.DOWNLOADS -> "The Downloads folder itself"
}

private fun locationSummary(item: FileItem, rootDocumentId: String): String {
    val normalizedParent = item.parentDocumentId.replace('\\', '/')
    val normalizedRoot = rootDocumentId.replace('\\', '/')
    return if (normalizedParent.startsWith(normalizedRoot, ignoreCase = true)) {
        val relative = normalizedParent.removePrefix(normalizedRoot).trimStart('/')
        if (relative.isBlank()) {
            "Location: ${File(rootDocumentId).name.ifBlank { "Device storage" }}"
        } else {
            "Location: ${relative.replace("/", " > ")}"
        }
    } else {
        "Location: ${File(item.parentDocumentId).name.ifBlank { "Current folder" }}"
    }
}

private fun formatDate(value: Long?): String {
    if (value == null || value <= 0L) return "Unknown date"
    return DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(value))
}

