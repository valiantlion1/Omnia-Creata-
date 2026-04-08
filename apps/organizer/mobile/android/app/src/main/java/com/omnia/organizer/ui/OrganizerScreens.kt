package com.omnia.organizer.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import java.text.DateFormat
import java.util.Date

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
                    "• Browse folders and files across phone storage\n• Search downloads, documents, screenshots, videos, and more\n• Move items to Recycle Bin and restore them later",
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
fun HomeScreen(
    state: OrganizerUiState,
    onOpenBrowse: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenStorage: () -> Unit,
    onOpenTrash: () -> Unit,
    onPickFolder: () -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onOpenParent: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
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
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ShortcutCard("Browse", "Open folders fast", onOpenBrowse, Modifier.weight(1f))
                ShortcutCard("Search", "Find by file name", onOpenSearch, Modifier.weight(1f))
            }
        }
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ShortcutCard("Storage", "See size and categories", onOpenStorage, Modifier.weight(1f))
                ShortcutCard("Recycle Bin", "Restore deleted items", onOpenTrash, Modifier.weight(1f))
            }
        }
        item { SectionTitle("Recent files", "Fast jump back into what you touched last.") }
        if (state.recentFiles.isEmpty()) {
            item { SectionHint("No recent files yet in the current storage root.") }
        } else {
            items(state.recentFiles, key = { "recent-${it.documentId}" }) { item ->
                FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
            }
        }
        item { SectionTitle("Large files", "Good first place to free up space without digging around.") }
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

    val folderCount = state.items.count { it.isDirectory }
    val fileCount = state.items.size - folderCount

    Column(modifier = Modifier.fillMaxSize()) {
        WorkspaceContextStrip(
            title = state.root.displayName,
            subtitle = "Explorer mode for the phone storage Android currently allows. Switch between list and grid depending on what feels clearer.",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
        )
        BrowseExplorerCard(
            state = state,
            folderCount = folderCount,
            fileCount = fileCount,
            modifier = Modifier.padding(horizontal = 16.dp),
            onBrowseLayoutChange = onBrowseLayoutChange
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
        BreadcrumbTrail(
            breadcrumb = state.breadcrumb,
            onNavigateToBreadcrumb = onNavigateToBreadcrumb,
            onCreateFolder = onCreateFolder,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        DestinationPickerDialog(
            state = state,
            onDismiss = onDismissDestinationPicker,
            onOpenFolder = onOpenDestinationFolder,
            onNavigateToBreadcrumb = onNavigateDestinationBreadcrumb,
            onConfirm = onConfirmDestinationOperation,
            onCreateFolder = onCreateFolderInDestination
        )
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            when {
                state.items.isEmpty() -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        SectionHint("This folder is empty.")
                    }
                }

                state.browseLayoutMode == BrowseLayoutMode.GRID -> {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 148.dp),
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 28.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        gridItems(state.items, key = { it.documentId }) { item ->
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
                                        onOpenFile(item)
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
                        contentPadding = PaddingValues(bottom = 28.dp, top = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(state.items, key = { it.documentId }) { item ->
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
                                        onOpenFile(item)
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

@Composable
fun SearchScreen(
    state: OrganizerUiState,
    onPickFolder: () -> Unit,
    onQueryChange: (String) -> Unit,
    onKindFilter: (FileKind?) -> Unit,
    onDateFilter: (SearchDateFilter) -> Unit,
    onSizeFilter: (SearchSizeFilter) -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onOpenParent: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    Column(modifier = Modifier.fillMaxSize()) {
        WorkspaceContextStrip(
            title = state.root.displayName,
            subtitle = "Search runs inside the storage access Android approved for OOFM, so results stay fast and reliable.",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
        )
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            label = { Text("Search files") },
            singleLine = true
        )
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item { FilterChip(selected = state.searchFilters.kind == null, onClick = { onKindFilter(null) }, label = { Text("All types") }) }
            item { FilterChip(selected = state.searchFilters.kind == FileKind.IMAGE, onClick = { onKindFilter(FileKind.IMAGE) }, label = { Text("Images") }) }
            item { FilterChip(selected = state.searchFilters.kind == FileKind.DOCUMENT, onClick = { onKindFilter(FileKind.DOCUMENT) }, label = { Text("Documents") }) }
            item { FilterChip(selected = state.searchFilters.kind == FileKind.VIDEO, onClick = { onKindFilter(FileKind.VIDEO) }, label = { Text("Videos") }) }
            item { FilterChip(selected = state.searchFilters.kind == FileKind.AUDIO, onClick = { onKindFilter(FileKind.AUDIO) }, label = { Text("Audio") }) }
        }
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.ANYTIME, onClick = { onDateFilter(SearchDateFilter.ANYTIME) }, label = { Text("Any time") }) }
            item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.LAST_7_DAYS, onClick = { onDateFilter(SearchDateFilter.LAST_7_DAYS) }, label = { Text("7 days") }) }
            item { FilterChip(selected = state.searchFilters.dateFilter == SearchDateFilter.LAST_30_DAYS, onClick = { onDateFilter(SearchDateFilter.LAST_30_DAYS) }, label = { Text("30 days") }) }
            item { FilterChip(selected = state.searchFilters.sizeFilter == SearchSizeFilter.LARGE_10_MB, onClick = { onSizeFilter(SearchSizeFilter.LARGE_10_MB) }, label = { Text("10 MB+") }) }
            item { FilterChip(selected = state.searchFilters.sizeFilter == SearchSizeFilter.HUGE_100_MB, onClick = { onSizeFilter(SearchSizeFilter.HUGE_100_MB) }, label = { Text("100 MB+") }) }
        }
        Spacer(modifier = Modifier.height(12.dp))
        when {
            state.searchQuery.isBlank() -> SectionHint("Type a file name to search inside the current storage root.")
            state.isSearchLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        CircularProgressIndicator()
                        Text("Scanning files...", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            state.searchResults.isEmpty() -> SectionHint("No results matched the current query and filters.")
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(state.searchResults, key = { "search-${it.documentId}" }) { item ->
                        FileRow(
                            item = item,
                            onClick = { if (item.isDirectory) onOpenParent(item) else onOpenFile(item) },
                            onOpenParent = { onOpenParent(item) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(12.dp)) }
                }
            }
        }
    }
}

@Composable
fun StorageScreen(
    state: OrganizerUiState,
    onPickFolder: () -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onOpenParent: (FileItem) -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }
    val summary = state.storageSummary
    if (summary == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CircularProgressIndicator()
                Text("Scanning storage root...", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
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
        item { SectionTitle("Categories", "Where the current storage root is spending most of its space.") }
        items(summary.categories, key = { it.kind.name }) { category ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(category.kind.name.lowercase().replaceFirstChar(Char::uppercase))
                    Text("${formatBytes(category.bytes)} | ${category.count} items")
                }
            }
        }
        item { SectionTitle("Largest files", "Open the file directly or jump back to its parent folder.") }
        items(summary.largeFiles, key = { "storage-${it.documentId}" }) { item ->
            FileRow(item = item, onClick = { onOpenFile(item) }, onOpenParent = { onOpenParent(item) })
        }
        item { Spacer(modifier = Modifier.height(16.dp)) }
    }
}

@Composable
fun TrashScreen(
    state: OrganizerUiState,
    onRestore: (TrashEntry) -> Unit,
    onDeletePermanently: (TrashEntry) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (state.trashEntries.isEmpty()) {
            item { SectionHint("Recycle Bin is empty.") }
        } else {
            items(state.trashEntries, key = { it.id }) { entry ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
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
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
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
                    Text("Channel Alpha", color = MaterialTheme.colorScheme.primary)
                    Text(
                        "Exact build version is tracked in GitHub releases and the release ledger during alpha.",
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
                        "Formal privacy policy, terms, and data transparency screens will be expanded before Play Store release.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
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
                    Text("Recycle Bin", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("${state.trashEntries.size} saved item(s)")
                    OutlinedButton(onClick = onClearTrash) { Text("Clear metadata list") }
                }
            }
        }
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
        shape = RoundedCornerShape(if (compact) 18.dp else 22.dp),
        color = MaterialTheme.colorScheme.secondary,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = if (compact) 10.dp else 12.dp,
                vertical = if (compact) 8.dp else 10.dp
            ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.omnia_creata_logo),
                contentDescription = "Omnia Creata",
                modifier = Modifier
                    .size(if (compact) 34.dp else 42.dp)
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
                    "Premium file clarity",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSecondary
                )
            }
        }
    }
}

@Composable
private fun BrandChecklist(points: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                        "•",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
                Text(
                    point,
                    modifier = Modifier.weight(1f),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondary)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BrandWordmarkBadge(compact = true)
            Text(
                "Omnia Organizer",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSecondary
            )
            Text(
                "Your premium mobile file manager for everyday control.",
                color = MaterialTheme.colorScheme.primary
            )
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.06f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "Connected storage",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        state.root?.displayName.orEmpty(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSecondary
                    )
                    Text(
                        "OOFM is still alpha. This connected storage becomes the main phone-wide entry point for browse, search, and storage insight.",
                        color = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.82f)
                    )
                }
            }
            if (state.isStorageRefreshing) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.onSecondary.copy(alpha = 0.18f)
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
            state.storageSummary?.let { summary ->
                CategoryPills(summary = summary)
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
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Storage overview", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                state.root?.displayName.orEmpty(),
                color = MaterialTheme.colorScheme.tertiary,
                fontWeight = FontWeight.Medium
            )
            Text("${summary.fileCount} files and ${summary.folderCount} folders")
            Text("Total size ${formatBytes(summary.totalBytes)}")
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
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f),
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
                style = MaterialTheme.typography.bodySmall,
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
    folderCount: Int,
    fileCount: Int,
    onBrowseLayoutChange: (BrowseLayoutMode) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "File Explorer",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Current folder: ${state.breadcrumb.lastOrNull()?.name ?: state.root?.displayName.orEmpty()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                StatPill(label = "${state.items.size} items")
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatPill(label = "$folderCount folders")
                StatPill(label = "$fileCount files")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = state.browseLayoutMode == BrowseLayoutMode.LIST,
                    onClick = { onBrowseLayoutChange(BrowseLayoutMode.LIST) },
                    label = { Text("List view") }
                )
                FilterChip(
                    selected = state.browseLayoutMode == BrowseLayoutMode.GRID,
                    onClick = { onBrowseLayoutChange(BrowseLayoutMode.GRID) },
                    label = { Text("Grid view") }
                )
            }
        }
    }
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
                    text = formatBytes(item.sizeBytes ?: 0L),
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
private fun ShortcutCard(title: String, subtitle: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        onClick = onClick,
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f))
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "Open",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.tertiary
            )
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
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongPress
            ),
        border = if (selected) {
            BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
        } else {
            null
        },
        colors = CardDefaults.cardColors(
            containerColor = if (selected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f)
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
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
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(item.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                Text(
                    "${item.kind.name.lowercase().replaceFirstChar(Char::uppercase)} | ${formatBytes(item.sizeBytes ?: 0L)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    formatDate(item.lastModified),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
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
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Surface(
            modifier = Modifier
                .padding(top = 8.dp)
                .fillMaxWidth(0.18f)
                .height(3.dp),
            shape = RoundedCornerShape(999.dp),
            color = MaterialTheme.colorScheme.primary
        ) {}
    }
}

@Composable
private fun SectionHint(text: String) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
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

private fun formatDate(value: Long?): String {
    if (value == null || value <= 0L) return "Unknown date"
    return DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(value))
}
