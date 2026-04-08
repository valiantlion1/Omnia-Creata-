package com.omnia.organizer.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.omnia.organizer.BuildConfig
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.core.domain.model.FileKind
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
    onOpenFolder: (FileItem) -> Unit,
    onPickFolder: () -> Unit,
    onNavigateToBreadcrumb: (Int) -> Unit,
    onOpenFile: (FileItem) -> Unit,
    onShareFile: (FileItem) -> Unit,
    onRequestRename: (FileItem) -> Unit,
    onMoveToTrash: (FileItem) -> Unit,
    onCreateFolder: () -> Unit
) {
    if (state.root == null) {
        EmptyRootState(onPickFolder)
        return
    }

    Column(modifier = Modifier.fillMaxSize()) {
        WorkspaceContextStrip(
            title = state.root.displayName,
            subtitle = "Current storage root. Change it anytime from the top bar if you need wider phone access.",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
        )
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(state.breadcrumb.withIndex().toList(), key = { "${it.index}-${it.value.documentId}" }) { indexed ->
                AssistChip(
                    onClick = { onNavigateToBreadcrumb(indexed.index) },
                    label = { Text(indexed.value.name) }
                )
            }
            item {
                OutlinedButton(onClick = onCreateFolder) {
                    Text("New folder")
                }
            }
        }
        if (state.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (state.items.isEmpty()) {
                    item { SectionHint("This folder is empty.") }
                } else {
                    items(state.items, key = { it.documentId }) { item ->
                        FileRow(
                            item = item,
                            onClick = { if (item.isDirectory) onOpenFolder(item) else onOpenFile(item) },
                            onShare = if (item.isDirectory) null else { { onShareFile(item) } },
                            onRename = if (item.canRename) { { onRequestRename(item) } } else null,
                            onDelete = if (item.canDelete) { { onMoveToTrash(item) } } else null
                        )
                    }
                }
                item { Spacer(modifier = Modifier.height(12.dp)) }
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
            subtitle = "Search runs inside the active storage root so results stay fast and Android-safe.",
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
                LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
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

    LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
    LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
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
    LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Product", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("Omnia Organizer")
                    Text("Package ${BuildConfig.APPLICATION_ID}")
                    Text("Version ${BuildConfig.VERSION_NAME}")
                    Text(if (BuildConfig.ALPHA) "Channel Alpha" else "Channel Release")
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
                    Text(state.root?.displayName ?: "No storage root selected")
                    Text(
                        "Alpha access follows Android rules. Pick a broader internal storage root or SD card root if you want OOFM to see more of the phone.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = onPickFolder) { Text("Change storage root") }
                        if (state.root != null) {
                            OutlinedButton(onClick = onClearRoot) { Text("Clear root") }
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
private fun WorkspaceHeroCard(
    state: OrganizerUiState,
    modifier: Modifier = Modifier,
    onPickFolder: () -> Unit
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Current workspace",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                state.root?.displayName.orEmpty(),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                "OOFM is still alpha. It works inside the storage root you approve, and you can switch to a broader phone root anytime.",
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            if (state.isStorageRefreshing) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    trackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onPickFolder) {
                    Text("Change root")
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
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Storage overview", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(state.root?.displayName.orEmpty(), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Medium)
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
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ShortcutCard(title: String, subtitle: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun StatPill(label: String) {
    Surface(
        shape = MaterialTheme.shapes.extraLarge,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun FileRow(
    item: FileItem,
    onClick: () -> Unit,
    onOpenParent: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    onRename: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp),
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.28f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.8f)
            ) {
                Icon(
                    imageVector = if (item.kind == FileKind.DIRECTORY) Icons.Default.Folder else Icons.Default.UploadFile,
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
            if (onShare != null || onRename != null || onDelete != null || onOpenParent != null) {
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
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Choose a storage root", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    "Start with the phone storage root, Downloads, or an SD card root. You can switch later if you want OOFM to see more of the device.",
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                FilledTonalButton(onClick = onPickFolder) {
                    Text("Select storage root")
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
    }
}

@Composable
private fun SectionHint(text: String) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
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

private fun formatDate(value: Long?): String {
    if (value == null || value <= 0L) return "Unknown date"
    return DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(value))
}
