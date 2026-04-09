package com.omnia.organizer.ui

import android.app.ActivityManager
import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.qualifiers.ApplicationContext
import com.omnia.organizer.core.domain.model.CategoryStat
import com.omnia.organizer.core.domain.model.FileActionFailure
import com.omnia.organizer.core.domain.model.FileBatchOperationResult
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.core.domain.model.FileKind
import com.omnia.organizer.core.domain.model.FolderHandle
import com.omnia.organizer.core.domain.model.SearchDateFilter
import com.omnia.organizer.core.domain.model.SearchFilters
import com.omnia.organizer.core.domain.model.SearchSizeFilter
import com.omnia.organizer.core.domain.model.SelectedRoot
import com.omnia.organizer.core.domain.model.StorageSummary
import com.omnia.organizer.core.domain.model.TrashEntry
import com.omnia.organizer.core.domain.model.SourceType
import com.omnia.organizer.core.domain.repository.SelectedRootRepository
import com.omnia.organizer.core.domain.repository.TrashRepository
import com.omnia.organizer.files.SafDocumentManager
import dagger.hilt.android.lifecycle.HiltViewModel
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

enum class FileOperationType {
    COPY,
    MOVE
}

enum class BrowseLayoutMode {
    LIST,
    GRID
}

enum class BrowseSortOption {
    NAME,
    DATE_MODIFIED,
    SIZE,
    TYPE
}

enum class BrowseSortDirection {
    ASCENDING,
    DESCENDING
}

enum class BrowseScopeFilter {
    ALL,
    FOLDERS_ONLY,
    FILES_ONLY
}

enum class BrowseTypeFilter {
    ALL,
    IMAGES,
    VIDEOS,
    AUDIO,
    DOCUMENTS,
    ARCHIVES_AND_APKS
}

enum class StorageCategoryKey {
    IMAGES,
    VIDEOS,
    AUDIO,
    DOCUMENTS,
    ARCHIVES_AND_APKS,
    DOWNLOADS
}

data class HomeSummary(
    val usedBytes: Long,
    val freeBytes: Long?,
    val fileCount: Int,
    val folderCount: Int,
    val topCategories: List<CategoryStat>
)

data class PendingFileOperation(
    val type: FileOperationType,
    val items: List<FileItem>
)

data class DestinationPickerState(
    val breadcrumb: List<FolderHandle>,
    val items: List<FileItem>,
    val targetDocumentId: String
)

data class StorageCategoryView(
    val key: StorageCategoryKey,
    val title: String,
    val subtitle: String,
    val items: List<FileItem>,
    val folderPath: List<FolderHandle>? = null
)

enum class DeviceTier {
    STANDARD,
    REDUCED
}

enum class NoticeTone {
    INFO,
    SUCCESS
}

data class UserNotice(
    val message: String,
    val tone: NoticeTone = NoticeTone.INFO
)

data class OrganizerUiState(
    val root: SelectedRoot? = null,
    val breadcrumb: List<FolderHandle> = emptyList(),
    val items: List<FileItem> = emptyList(),
    val searchQuery: String = "",
    val searchFilters: SearchFilters = SearchFilters(),
    val searchResults: List<FileItem> = emptyList(),
    val storageSummary: StorageSummary? = null,
    val homeSummary: HomeSummary? = null,
    val recentFiles: List<FileItem> = emptyList(),
    val newFiles: List<FileItem> = emptyList(),
    val largeFiles: List<FileItem> = emptyList(),
    val searchTargetFolder: FolderHandle? = null,
    val storageCategoryView: StorageCategoryView? = null,
    val trashEntries: List<TrashEntry> = emptyList(),
    val renameTarget: FileItem? = null,
    val showCreateFolderDialog: Boolean = false,
    val createFolderTargetDocumentId: String? = null,
    val createFolderForDestination: Boolean = false,
    val browseLayoutMode: BrowseLayoutMode = BrowseLayoutMode.LIST,
    val browseSortOption: BrowseSortOption = BrowseSortOption.NAME,
    val browseSortDirection: BrowseSortDirection = BrowseSortDirection.ASCENDING,
    val browseScopeFilter: BrowseScopeFilter = BrowseScopeFilter.ALL,
    val browseTypeFilter: BrowseTypeFilter = BrowseTypeFilter.ALL,
    val showBrowseControlsSheet: Boolean = false,
    val fileDetailTarget: FileItem? = null,
    val isSelectionMode: Boolean = false,
    val selectedDocumentIds: Set<String> = emptySet(),
    val pendingFileOperation: PendingFileOperation? = null,
    val destinationPickerState: DestinationPickerState? = null,
    val deviceTier: DeviceTier = DeviceTier.STANDARD,
    val reducedEffectsMode: Boolean = false,
    val notice: UserNotice? = null,
    val isLoading: Boolean = false,
    val isSearchLoading: Boolean = false,
    val isStorageRefreshing: Boolean = false,
    val lastStorageScanAt: Long? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class OrganizerViewModel @Inject constructor(
    private val selectedRootRepository: SelectedRootRepository,
    private val trashRepository: TrashRepository,
    private val documentManager: SafDocumentManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrganizerUiState())
    val uiState: StateFlow<OrganizerUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var summaryJob: Job? = null
    private var homeSummaryJob: Job? = null

    init {
        val deviceTier = detectDeviceTier(context)
        _uiState.update {
            it.copy(
                deviceTier = deviceTier,
                reducedEffectsMode = deviceTier == DeviceTier.REDUCED
            )
        }
        selectedRootRepository.observe()
            .onEach { root ->
                searchJob?.cancel()
                summaryJob?.cancel()
                homeSummaryJob?.cancel()
                if (root == null) {
                    _uiState.update { previous ->
                        OrganizerUiState(
                            searchFilters = previous.searchFilters,
                            trashEntries = previous.trashEntries,
                            deviceTier = previous.deviceTier,
                            reducedEffectsMode = previous.reducedEffectsMode
                        )
                    }
                } else {
                    loadRoot(root)
                }
            }
            .launchIn(viewModelScope)

        trashRepository.observeAll()
            .onEach { entries ->
                _uiState.update { it.copy(trashEntries = entries) }
            }
            .launchIn(viewModelScope)
    }

    fun enableDeviceStorageRoot() {
        viewModelScope.launch {
            runTask("Unable to connect device storage.") {
                val root = withContext(Dispatchers.IO) { documentManager.inspectDeviceStorage() }
                    ?: error("Android did not expose device storage to OOFM.")
                selectedRootRepository.save(root)
            }
        }
    }

    fun clearRoot() {
        viewModelScope.launch {
            selectedRootRepository.clear()
        }
    }

    fun refreshActiveRoute(route: String) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            when (route) {
                "home" -> refreshHomeOverview(root, force = true)
                "storage" -> refreshStorageSummary(root, showLoading = true)
                "search" -> queueSearch(immediate = true)
                else -> refreshCurrentFolder(root, keepSearchResults = false)
            }
        }
    }

    fun ensureStorageSummary() {
        val root = _uiState.value.root ?: return
        if (_uiState.value.storageSummary == null && !(_uiState.value.isStorageRefreshing)) {
            refreshStorageSummary(root, showLoading = true)
        }
    }

    fun openFolder(item: FileItem) {
        val root = _uiState.value.root ?: return
        if (!item.isDirectory) return
        viewModelScope.launch {
            runTask("Unable to open the folder.") {
                val handle = withContext(Dispatchers.IO) { documentManager.getFolderHandle(root, item.documentId) }
                    ?: FolderHandle(item.documentId, item.name)
                val children = withContext(Dispatchers.IO) { documentManager.listChildren(root, item.documentId) }
                _uiState.update {
                    it.copy(
                        breadcrumb = it.breadcrumb + handle,
                        items = children,
                        searchTargetFolder = handle,
                        storageCategoryView = null
                    ).clearSelectionState().resetBrowseExplorerControls()
                }
            }
        }
    }

    fun navigateToBreadcrumb(index: Int) {
        val root = _uiState.value.root ?: return
        val breadcrumb = _uiState.value.breadcrumb
        if (index !in breadcrumb.indices) return
        viewModelScope.launch {
            runTask("Unable to move to that folder.") {
                val nextBreadcrumb = breadcrumb.take(index + 1)
                val currentFolder = nextBreadcrumb.last()
                val children = withContext(Dispatchers.IO) { documentManager.listChildren(root, currentFolder.documentId) }
                _uiState.update {
                    it.copy(
                        breadcrumb = nextBreadcrumb,
                        items = children,
                        searchTargetFolder = nextBreadcrumb.lastOrNull(),
                        storageCategoryView = null
                    ).clearSelectionState().resetBrowseExplorerControls()
                }
            }
        }
    }

    fun openParentOf(item: FileItem) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            runTask("Unable to open the result location.") {
                val rootHandle = withContext(Dispatchers.IO) {
                    documentManager.getFolderHandle(root, root.rootDocumentId)
                } ?: FolderHandle(root.rootDocumentId, root.displayName)
                val parentHandle = if (item.parentDocumentId == root.rootDocumentId) {
                    null
                } else {
                    withContext(Dispatchers.IO) { documentManager.getFolderHandle(root, item.parentDocumentId) }
                }
                val children = withContext(Dispatchers.IO) {
                    documentManager.listChildren(root, item.parentDocumentId)
                }
                _uiState.update {
                    it.copy(
                        breadcrumb = listOfNotNull(rootHandle, parentHandle),
                        items = children,
                        searchTargetFolder = parentHandle ?: rootHandle,
                        storageCategoryView = null
                    ).clearSelectionState().resetBrowseExplorerControls()
                }
            }
        }
    }

    fun showInBrowse(item: FileItem) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            runTask("Unable to open this location in Browse.") {
                val path = when (root.sourceType) {
                    SourceType.FILE_SYSTEM -> buildFileSystemBrowsePath(root, if (item.isDirectory) item.documentId else item.parentDocumentId)
                    SourceType.TREE -> buildTreeBrowsePath(root, item)
                }
                if (path.isNullOrEmpty()) error("This location is not available in Browse right now.")
                openFolderPath(root, path)
            }
        }
    }

    fun openSmartFolder(targetNames: Set<String>, title: String) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            runTask("Unable to open $title right now.") {
                val path = withContext(Dispatchers.IO) {
                    documentManager.findFolderPath(root, targetNames)
                } ?: error("$title is not available in the current storage view yet.")
                openFolderPath(root, path)
            }
        }
    }

    fun openFolderPath(path: List<FolderHandle>) {
        val root = _uiState.value.root ?: return
        if (path.isEmpty()) return
        viewModelScope.launch {
            runTask("Unable to open that folder.") {
                openFolderPath(root, path)
            }
        }
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        queueSearch(immediate = false)
    }

    fun updateKindFilter(kind: FileKind?) {
        _uiState.update { it.copy(searchFilters = it.searchFilters.copy(kind = kind)) }
        queueSearch(immediate = true)
    }

    fun updateDateFilter(filter: SearchDateFilter) {
        _uiState.update { it.copy(searchFilters = it.searchFilters.copy(dateFilter = filter)) }
        queueSearch(immediate = true)
    }

    fun updateSizeFilter(filter: SearchSizeFilter) {
        _uiState.update { it.copy(searchFilters = it.searchFilters.copy(sizeFilter = filter)) }
        queueSearch(immediate = true)
    }

    fun clearBrowseActionMode() {
        _uiState.update { it.clearSelectionState() }
    }

    fun setBrowseLayoutMode(mode: BrowseLayoutMode) {
        _uiState.update { it.copy(browseLayoutMode = mode) }
    }

    fun showBrowseControlsSheet() {
        _uiState.update { it.copy(showBrowseControlsSheet = true, errorMessage = null) }
    }

    fun dismissBrowseControlsSheet() {
        _uiState.update { it.copy(showBrowseControlsSheet = false) }
    }

    fun setBrowseSortOption(option: BrowseSortOption) {
        _uiState.update { it.copy(browseSortOption = option, errorMessage = null) }
    }

    fun setBrowseSortDirection(direction: BrowseSortDirection) {
        _uiState.update { it.copy(browseSortDirection = direction, errorMessage = null) }
    }

    fun setBrowseScopeFilter(filter: BrowseScopeFilter) {
        _uiState.update { it.copy(browseScopeFilter = filter, errorMessage = null) }
    }

    fun setBrowseTypeFilter(filter: BrowseTypeFilter) {
        _uiState.update { it.copy(browseTypeFilter = filter, errorMessage = null) }
    }

    fun resetBrowseExplorerControls() {
        _uiState.update { it.resetBrowseExplorerControls() }
    }

    fun refreshHomeSummary() {
        val root = _uiState.value.root ?: return
        refreshHomeOverview(root, force = true)
    }

    fun openStorageCategory(key: StorageCategoryKey) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            runTask("Unable to open this storage category.") {
                val categoryView = withContext(Dispatchers.IO) {
                    when (key) {
                        StorageCategoryKey.IMAGES -> buildStorageCategoryView(
                            key = key,
                            title = "Images",
                            subtitle = "Photos, screenshots, and image exports in your connected storage.",
                            items = documentManager.listByKinds(root, setOf(FileKind.IMAGE))
                        )

                        StorageCategoryKey.VIDEOS -> buildStorageCategoryView(
                            key = key,
                            title = "Videos",
                            subtitle = "Clips, recordings, and video files across the current storage root.",
                            items = documentManager.listByKinds(root, setOf(FileKind.VIDEO))
                        )

                        StorageCategoryKey.AUDIO -> buildStorageCategoryView(
                            key = key,
                            title = "Audio",
                            subtitle = "Voice notes, music, and other audio stored on this device root.",
                            items = documentManager.listByKinds(root, setOf(FileKind.AUDIO))
                        )

                        StorageCategoryKey.DOCUMENTS -> buildStorageCategoryView(
                            key = key,
                            title = "Documents",
                            subtitle = "PDFs, text files, office files, and other document formats.",
                            items = documentManager.listByKinds(root, setOf(FileKind.DOCUMENT))
                        )

                        StorageCategoryKey.ARCHIVES_AND_APKS -> buildStorageCategoryView(
                            key = key,
                            title = "Archives & APKs",
                            subtitle = "Compressed files, installers, and package downloads.",
                            items = documentManager.listByKinds(root, setOf(FileKind.ARCHIVE, FileKind.APK))
                        )

                        StorageCategoryKey.DOWNLOADS -> {
                            val path = documentManager.findFolderPath(root, setOf("downloads", "download"))
                                ?: error("Downloads folder could not be found in the current storage view.")
                            buildStorageCategoryView(
                                key = key,
                                title = "Downloads",
                                subtitle = "Everything OOFM found inside the Downloads folder.",
                                items = documentManager.listDescendants(root, path.last().documentId),
                                folderPath = path
                            )
                        }
                    }
                }
                _uiState.update {
                    it.copy(
                        storageCategoryView = categoryView,
                        errorMessage = null
                    )
                }
            }
        }
    }

    fun clearStorageCategoryView() {
        _uiState.update { it.copy(storageCategoryView = null) }
    }

    fun openFileDetail(item: FileItem) {
        if (item.isDirectory) return
        _uiState.update { it.copy(fileDetailTarget = item, errorMessage = null) }
    }

    fun dismissFileDetail() {
        _uiState.update { it.copy(fileDetailTarget = null) }
    }

    fun enterSelectionMode(item: FileItem) {
        _uiState.update {
            it.copy(
                isSelectionMode = true,
                selectedDocumentIds = setOf(item.documentId),
                fileDetailTarget = null,
                errorMessage = null
            )
        }
    }

    fun toggleSelection(item: FileItem) {
        _uiState.update { state ->
            val nextSelected = state.selectedDocumentIds.toMutableSet().apply {
                if (!add(item.documentId)) remove(item.documentId)
            }
            state.copy(
                isSelectionMode = nextSelected.isNotEmpty(),
                selectedDocumentIds = nextSelected,
                errorMessage = null
            )
        }
    }

    fun selectAllCurrentFolder() {
        val items = _uiState.value.visibleBrowseItems()
        if (items.isEmpty()) return
        _uiState.update {
            it.copy(
                isSelectionMode = true,
                selectedDocumentIds = items.map(FileItem::documentId).toSet(),
                errorMessage = null
            )
        }
    }

    fun requestRename(item: FileItem) {
        _uiState.update { it.copy(renameTarget = item, errorMessage = null, notice = null) }
    }

    fun requestRenameSelection() {
        val selected = selectedItems()
        when {
            selected.size != 1 -> _uiState.update {
                it.copy(errorMessage = "Rename is available when exactly one item is selected.")
            }

            !selected.first().canRename -> _uiState.update {
                it.copy(errorMessage = "The selected item cannot be renamed.")
            }

            else -> requestRename(selected.first())
        }
    }

    fun dismissRename() {
        _uiState.update { it.copy(renameTarget = null) }
    }

    fun renameRequestedItem(newName: String) {
        val root = _uiState.value.root ?: return
        val target = _uiState.value.renameTarget ?: return
        viewModelScope.launch {
            runTask("Rename failed.") {
                val renamed = withContext(Dispatchers.IO) { documentManager.rename(root, target, newName) }
                if (renamed == null) error("This file could not be renamed.")
                _uiState.update {
                    it.copy(renameTarget = null).clearSelectionState()
                }
                refreshCurrentFolder(root, keepSearchResults = true)
                refreshLightSurfaces(root)
                postNotice("Renamed to ${renamed.name}.", NoticeTone.SUCCESS)
            }
        }
    }

    fun requestCopySelection() {
        prepareDestinationPicker(FileOperationType.COPY)
    }

    fun requestMoveSelection() {
        prepareDestinationPicker(FileOperationType.MOVE)
    }

    fun dismissDestinationPicker() {
        _uiState.update {
            it.copy(
                pendingFileOperation = null,
                destinationPickerState = null
            )
        }
    }

    fun openDestinationFolder(item: FileItem) {
        val root = _uiState.value.root ?: return
        if (!item.isDirectory) return
        val picker = _uiState.value.destinationPickerState ?: return
        viewModelScope.launch {
            runTask("Unable to open the destination folder.") {
                val handle = withContext(Dispatchers.IO) { documentManager.getFolderHandle(root, item.documentId) }
                    ?: FolderHandle(item.documentId, item.name)
                val children = withContext(Dispatchers.IO) { documentManager.listChildren(root, item.documentId) }
                    .filter(FileItem::isDirectory)
                _uiState.update {
                    it.copy(
                        destinationPickerState = picker.copy(
                            breadcrumb = picker.breadcrumb + handle,
                            items = children,
                            targetDocumentId = item.documentId
                        )
                    )
                }
            }
        }
    }

    fun navigateDestinationBreadcrumb(index: Int) {
        val root = _uiState.value.root ?: return
        val picker = _uiState.value.destinationPickerState ?: return
        if (index !in picker.breadcrumb.indices) return
        viewModelScope.launch {
            runTask("Unable to move to that destination folder.") {
                val nextBreadcrumb = picker.breadcrumb.take(index + 1)
                val target = nextBreadcrumb.last()
                val children = withContext(Dispatchers.IO) {
                    documentManager.listChildren(root, target.documentId)
                }.filter(FileItem::isDirectory)
                _uiState.update {
                    it.copy(
                        destinationPickerState = picker.copy(
                            breadcrumb = nextBreadcrumb,
                            items = children,
                            targetDocumentId = target.documentId
                        )
                    )
                }
            }
        }
    }

    fun confirmDestinationOperation() {
        val root = _uiState.value.root ?: return
        val pending = _uiState.value.pendingFileOperation ?: return
        val picker = _uiState.value.destinationPickerState ?: return
        viewModelScope.launch {
            runBusyTask("The file operation failed.") {
                val result = withContext(Dispatchers.IO) {
                    when (pending.type) {
                        FileOperationType.COPY -> documentManager.copyItems(root, pending.items, picker.targetDocumentId)
                        FileOperationType.MOVE -> documentManager.moveItems(root, pending.items, picker.targetDocumentId)
                    }
                }

                if (result.succeededDocumentIds.isNotEmpty()) {
                    _uiState.update {
                        it.clearSelectionState()
                    }
                    refreshCurrentFolder(root, keepSearchResults = true)
                    refreshLightSurfaces(root)
                }
                val feedback = summarizeBatchResult(
                    operation = if (pending.type == FileOperationType.COPY) "Copied" else "Moved",
                    total = pending.items.size,
                    result = result
                )
                feedback.notice?.let { postNotice(it.message, it.tone) }
                feedback.error
            }
        }
    }

    fun deleteSelection() {
        val root = _uiState.value.root ?: return
        val selected = selectedItems().filter { it.canDelete }
        if (selected.isEmpty()) {
            _uiState.update {
                it.copy(errorMessage = "Select one or more deletable items first.")
            }
            return
        }
        viewModelScope.launch {
            runBusyTask("Move to Recycle Bin failed.") {
                val result = withContext(Dispatchers.IO) { moveItemsToTrash(root, selected) }
                result.entries.forEach { entry -> trashRepository.upsert(entry) }
                if (result.succeededDocumentIds.isNotEmpty()) {
                    _uiState.update { it.clearSelectionState() }
                    refreshCurrentFolder(root, keepSearchResults = true)
                    refreshLightSurfaces(root)
                }
                val feedback = summarizeBatchResult(
                    operation = "Moved to Recycle Bin",
                    total = selected.size,
                    result = result.toFileBatchOperationResult()
                )
                feedback.notice?.let { postNotice(it.message, it.tone) }
                feedback.error
            }
        }
    }

    fun moveToTrash(item: FileItem) {
        val root = _uiState.value.root ?: return
        viewModelScope.launch {
            runTask("Move to Recycle Bin failed.") {
                val entry = withContext(Dispatchers.IO) { documentManager.moveToTrash(root, item) }
                trashRepository.upsert(entry)
                refreshCurrentFolder(root, keepSearchResults = true)
                refreshLightSurfaces(root)
                postNotice("${item.name} moved to Recycle Bin.", NoticeTone.SUCCESS)
            }
        }
    }

    fun selectedShareTargets(): List<FileItem> = selectedItems().filterNot(FileItem::isDirectory)

    fun documentUrisFor(items: List<FileItem>): List<Uri> {
        val root = _uiState.value.root ?: return emptyList()
        return items.mapNotNull { item ->
            runCatching { documentManager.buildDocumentUri(root, item.documentId) }.getOrNull()
        }
    }

    fun completeShareSelection(sharedCount: Int, skippedCount: Int) {
        when {
            sharedCount <= 0 -> _uiState.update {
                it.copy(errorMessage = "Only files can be shared right now. Folders were skipped.")
            }

            else -> _uiState.update {
                it.clearSelectionState().copy(
                    errorMessage = null,
                    notice = UserNotice(
                        message = if (skippedCount > 0) {
                            "Shared $sharedCount file(s). $skippedCount folder item(s) were skipped."
                        } else {
                            "Shared $sharedCount file(s)."
                        },
                        tone = NoticeTone.SUCCESS
                    )
                )
            }
        }
    }

    fun restoreFromTrash(entry: TrashEntry) {
        val root = _uiState.value.root
        viewModelScope.launch {
            runTask("Restore failed.") {
                val restored = withContext(Dispatchers.IO) { documentManager.restoreTrash(entry) }
                if (!restored) {
                    error("The item could not be restored. The original folder may be missing or the storage connection may have changed.")
                }
                trashRepository.delete(entry.id)
                if (root != null) {
                    refreshCurrentFolder(root, keepSearchResults = true)
                    refreshLightSurfaces(root)
                }
                postNotice("${entry.displayName} restored.", NoticeTone.SUCCESS)
            }
        }
    }

    fun deletePermanentlyFromTrash(entry: TrashEntry) {
        viewModelScope.launch {
            runTask("Delete forever failed.") {
                val deleted = withContext(Dispatchers.IO) { documentManager.permanentlyDeleteTrash(entry) }
                if (!deleted) {
                    error("The item could not be deleted forever. Refresh the Recycle Bin and try again.")
                }
                trashRepository.delete(entry.id)
                postNotice("${entry.displayName} deleted forever.", NoticeTone.INFO)
            }
        }
    }

    fun clearTrash() {
        viewModelScope.launch {
            if (_uiState.value.trashEntries.isEmpty()) {
                postNotice("Recycle Bin metadata is already clear.", NoticeTone.INFO)
                return@launch
            }
            trashRepository.clear()
            postNotice("Recycle Bin metadata cleared.", NoticeTone.INFO)
        }
    }

    fun requestCreateFolder(targetDocumentId: String? = null, forDestinationPicker: Boolean = false) {
        val defaultTarget = if (forDestinationPicker) {
            _uiState.value.destinationPickerState?.targetDocumentId
        } else {
            _uiState.value.breadcrumb.lastOrNull()?.documentId
        }
        _uiState.update {
            it.copy(
                showCreateFolderDialog = true,
                createFolderTargetDocumentId = targetDocumentId ?: defaultTarget,
                createFolderForDestination = forDestinationPicker
            )
        }
    }

    fun dismissCreateFolder() {
        _uiState.update {
            it.copy(
                showCreateFolderDialog = false,
                createFolderTargetDocumentId = null,
                createFolderForDestination = false
            )
        }
    }

    fun createFolder(name: String) {
        val root = _uiState.value.root ?: return
        val targetDocumentId = _uiState.value.createFolderTargetDocumentId
            ?: _uiState.value.breadcrumb.lastOrNull()?.documentId
            ?: return
        val forDestinationPicker = _uiState.value.createFolderForDestination
        viewModelScope.launch {
            runTask("Unable to create the folder.") {
                val created = withContext(Dispatchers.IO) {
                    documentManager.createFolder(root, targetDocumentId, name)
                }
                if (!created) error("Folder could not be created.")
                _uiState.update {
                    it.copy(
                        showCreateFolderDialog = false,
                        createFolderTargetDocumentId = null,
                        createFolderForDestination = false
                    )
                }
                if (forDestinationPicker) {
                    refreshDestinationPicker(root, targetDocumentId)
                } else {
                    refreshCurrentFolder(root, keepSearchResults = true)
                }
                refreshLightSurfaces(root)
                postNotice("Folder created.", NoticeTone.SUCCESS)
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun clearNotice() {
        _uiState.update { it.copy(notice = null) }
    }

    fun reportActionFailure(message: String) {
        _uiState.update { it.copy(errorMessage = message) }
    }

    fun documentUriFor(item: FileItem): Uri? {
        val root = _uiState.value.root ?: return null
        return documentManager.buildDocumentUri(root, item.documentId)
    }

    private fun loadRoot(root: SelectedRoot) {
        viewModelScope.launch {
            runTask("Unable to load the selected folder.") {
                val rootHandle = withContext(Dispatchers.IO) {
                    documentManager.getFolderHandle(root, root.rootDocumentId)
                } ?: FolderHandle(root.rootDocumentId, root.displayName)
                val items = withContext(Dispatchers.IO) {
                    documentManager.listChildren(root, root.rootDocumentId)
                }
                _uiState.update {
                    it.copy(
                        root = root,
                        breadcrumb = listOf(rootHandle),
                        items = items,
                        storageSummary = null,
                        homeSummary = null,
                        recentFiles = emptyList(),
                        newFiles = emptyList(),
                        largeFiles = emptyList(),
                        searchResults = emptyList(),
                        searchTargetFolder = rootHandle,
                        storageCategoryView = null,
                        isStorageRefreshing = false
                    ).clearSelectionState().resetBrowseExplorerControls(resetLayoutMode = true)
                }
                refreshHomeOverview(root, force = true)
                if (_uiState.value.searchQuery.isNotBlank()) {
                    queueSearch(immediate = true)
                }
            }
        }
    }

    private fun queueSearch(immediate: Boolean) {
        val root = _uiState.value.root ?: return
        val query = _uiState.value.searchQuery
        searchJob?.cancel()
        if (query.isBlank()) {
            _uiState.update { it.copy(searchResults = emptyList(), isSearchLoading = false) }
            return
        }

        searchJob = viewModelScope.launch {
            if (!immediate) delay(350)
            _uiState.update { it.copy(isSearchLoading = true) }
            val result = runCatching {
                withContext(Dispatchers.IO) {
                    documentManager.search(root, query, _uiState.value.searchFilters)
                }
            }
            result.onSuccess { results ->
                _uiState.update { it.copy(searchResults = results, isSearchLoading = false) }
            }.onFailure { failure ->
                if (failure is CancellationException) return@onFailure
                _uiState.update {
                    it.copy(
                        isSearchLoading = false,
                        errorMessage = failure.message ?: "Search failed."
                    )
                }
            }
        }
    }

    private suspend fun refreshCurrentFolder(root: SelectedRoot, keepSearchResults: Boolean) {
        val currentFolder = _uiState.value.breadcrumb.lastOrNull()
            ?: FolderHandle(root.rootDocumentId, root.displayName)
        val items = withContext(Dispatchers.IO) {
            documentManager.listChildren(root, currentFolder.documentId)
        }
        _uiState.update {
            it.copy(
                items = items,
                searchResults = if (keepSearchResults) it.searchResults else emptyList(),
                searchTargetFolder = currentFolder,
                storageCategoryView = null
            )
        }
        if (keepSearchResults && _uiState.value.searchQuery.isNotBlank()) {
            queueSearch(immediate = true)
        }
    }

    private suspend fun refreshDestinationPicker(root: SelectedRoot, targetDocumentId: String) {
        val picker = _uiState.value.destinationPickerState ?: return
        val children = withContext(Dispatchers.IO) {
            documentManager.listChildren(root, targetDocumentId)
        }.filter(FileItem::isDirectory)
        _uiState.update {
            it.copy(
                destinationPickerState = picker.copy(
                    items = children,
                    targetDocumentId = targetDocumentId
                )
            )
        }
    }

    private fun refreshHomeOverview(root: SelectedRoot, force: Boolean) {
        if (!force && _uiState.value.homeSummary != null) return
        homeSummaryJob?.cancel()
        homeSummaryJob = viewModelScope.launch {
            val sampleLimit = when (_uiState.value.deviceTier) {
                DeviceTier.REDUCED -> 120
                DeviceTier.STANDARD -> 220
            }
            val result = runCatching {
                withContext(Dispatchers.IO) {
                    documentManager.summarizeForHome(root, limit = sampleLimit)
                }
            }
            result.onSuccess { summary ->
                _uiState.update {
                    it.copy(
                        homeSummary = summary.toHomeSummary(),
                        recentFiles = summary.recentFiles,
                        newFiles = summary.deriveNewFiles(),
                        largeFiles = summary.largeFiles
                    )
                }
            }.onFailure { failure ->
                if (failure is CancellationException) return@onFailure
                _uiState.update {
                    it.copy(errorMessage = failure.message ?: "Home summary failed.")
                }
            }
        }
    }

    private fun refreshStorageSummary(root: SelectedRoot, showLoading: Boolean) {
        summaryJob?.cancel()
        summaryJob = viewModelScope.launch {
            if (showLoading) {
                _uiState.update { it.copy(isStorageRefreshing = true) }
            }
            val result = runCatching {
                withContext(Dispatchers.IO) { documentManager.summarize(root) }
            }
            result.onSuccess { summary ->
                _uiState.update {
                    it.copy(
                        storageSummary = summary,
                        homeSummary = summary.toHomeSummary(),
                        recentFiles = summary.recentFiles,
                        newFiles = summary.deriveNewFiles(),
                        largeFiles = summary.largeFiles,
                        isStorageRefreshing = false,
                        lastStorageScanAt = System.currentTimeMillis()
                    )
                }
            }.onFailure { failure ->
                if (failure is CancellationException) return@onFailure
                _uiState.update {
                    it.copy(
                        isStorageRefreshing = false,
                        errorMessage = failure.message ?: "Storage scan failed."
                    )
                }
            }
        }
    }

    private fun refreshLightSurfaces(root: SelectedRoot) {
        invalidateStorageSummary()
        refreshHomeOverview(root, force = true)
    }

    private fun invalidateStorageSummary() {
        _uiState.update {
            it.copy(
                storageSummary = null,
                lastStorageScanAt = null
            )
        }
    }

    private fun prepareDestinationPicker(type: FileOperationType) {
        val selected = selectedItems()
        if (selected.isEmpty()) {
            _uiState.update {
                it.copy(errorMessage = "Select one or more items first.")
            }
            return
        }

        val breadcrumb = _uiState.value.breadcrumb
        val targetFolder = breadcrumb.lastOrNull()
        if (targetFolder == null) {
            _uiState.update {
                it.copy(errorMessage = "Destination picking is not ready yet.")
            }
            return
        }

        _uiState.update {
            it.copy(
                pendingFileOperation = PendingFileOperation(type = type, items = selected),
                destinationPickerState = DestinationPickerState(
                    breadcrumb = breadcrumb,
                    items = it.items.filter(FileItem::isDirectory),
                    targetDocumentId = targetFolder.documentId
                ),
                errorMessage = null
            )
        }
    }

    private fun selectedItems(): List<FileItem> {
        val selectedIds = _uiState.value.selectedDocumentIds
        if (selectedIds.isEmpty()) return emptyList()
        return _uiState.value.items.filter { item -> selectedIds.contains(item.documentId) }
    }

    private suspend fun moveItemsToTrash(
        root: SelectedRoot,
        items: List<FileItem>
    ): TrashBatchResult {
        val movedEntries = mutableListOf<TrashEntry>()
        val failures = mutableListOf<FileActionFailure>()
        items.forEach { item ->
            runCatching { documentManager.moveToTrash(root, item) }
                .onSuccess { movedEntries += it }
                .onFailure { failure ->
                    failures += FileActionFailure(
                        documentId = item.documentId,
                        displayName = item.name,
                        reason = failure.message ?: "Move to Recycle Bin failed."
                    )
                }
        }
        return TrashBatchResult(
            entries = movedEntries,
            failures = failures
        )
    }

    private suspend fun runTask(errorMessage: String, block: suspend () -> Unit) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        val failure = runCatching { block() }.exceptionOrNull()
        _uiState.update {
            it.copy(
                isLoading = false,
                errorMessage = failure?.message ?: it.errorMessage ?: if (failure != null) errorMessage else null
            )
        }
    }

    private suspend fun runBusyTask(defaultError: String, block: suspend () -> String?) {
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
        try {
            val message = block()
            _uiState.update { it.copy(isLoading = false, errorMessage = message) }
        } catch (failure: CancellationException) {
            _uiState.update { it.copy(isLoading = false) }
            throw failure
        } catch (failure: Throwable) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    errorMessage = failure.message ?: defaultError
                )
            }
        }
    }

    private fun summarizeBatchResult(
        operation: String,
        total: Int,
        result: FileBatchOperationResult
    ): BatchFeedback {
        if (result.failures.isEmpty()) {
            return BatchFeedback(
                notice = UserNotice("$operation $total item(s).", NoticeTone.SUCCESS)
            )
        }
        if (result.succeededDocumentIds.isEmpty()) {
            val failureSummary = "$operation failed for all $total item(s). ${result.failures.first().reason}"
            return BatchFeedback(error = failureSummary)
        } else {
            val failedCount = result.failures.size
            return BatchFeedback(
                notice = UserNotice(
                    "$operation ${result.succeededDocumentIds.size} item(s). $failedCount item(s) failed.",
                    NoticeTone.INFO
                )
            )
        }
    }

    private fun buildFileSystemBrowsePath(root: SelectedRoot, targetDocumentId: String): List<FolderHandle>? {
        val rootFile = File(root.rootDocumentId)
        val targetFile = File(targetDocumentId)
        if (!targetFile.exists()) return null
        val rootPath = rootFile.canonicalFile
        val targetPath = targetFile.canonicalFile
        if (!targetPath.path.startsWith(rootPath.path, ignoreCase = true)) return null
        val relativeSegments = targetPath.path.removePrefix(rootPath.path).trimStart(File.separatorChar)
            .split(File.separatorChar)
            .filter { it.isNotBlank() }
        if (relativeSegments.isEmpty()) {
            return listOf(FolderHandle(root.rootDocumentId, root.displayName))
        }
        val path = mutableListOf(FolderHandle(root.rootDocumentId, root.displayName))
        var current = rootFile
        relativeSegments.forEach { segment ->
            current = File(current, segment)
            path += FolderHandle(current.absolutePath, current.name)
        }
        return path
    }

    private suspend fun buildTreeBrowsePath(root: SelectedRoot, item: FileItem): List<FolderHandle>? {
        val rootHandle = withContext(Dispatchers.IO) {
            documentManager.getFolderHandle(root, root.rootDocumentId)
        } ?: FolderHandle(root.rootDocumentId, root.displayName)
        val targetDocumentId = if (item.isDirectory) item.documentId else item.parentDocumentId
        val targetHandle = withContext(Dispatchers.IO) {
            documentManager.getFolderHandle(root, targetDocumentId)
        } ?: return listOf(rootHandle)
        return if (targetHandle.documentId == rootHandle.documentId) {
            listOf(rootHandle)
        } else {
            listOf(rootHandle, targetHandle)
        }
    }

    private suspend fun openFolderPath(root: SelectedRoot, path: List<FolderHandle>) {
        val target = path.last()
        val children = withContext(Dispatchers.IO) {
            documentManager.listChildren(root, target.documentId)
        }
        _uiState.update {
            it.copy(
                breadcrumb = path,
                items = children,
                searchTargetFolder = target,
                storageCategoryView = null
            ).clearSelectionState().resetBrowseExplorerControls(resetLayoutMode = true)
        }
    }

    private fun buildStorageCategoryView(
        key: StorageCategoryKey,
        title: String,
        subtitle: String,
        items: List<FileItem>,
        folderPath: List<FolderHandle>? = null
    ): StorageCategoryView = StorageCategoryView(
        key = key,
        title = title,
        subtitle = subtitle,
        items = items
            .distinctBy(FileItem::documentId)
            .sortedWith(compareByDescending<FileItem> { it.lastModified ?: 0L }.thenBy { it.name.lowercase() }),
        folderPath = folderPath
    )

    private fun detectDeviceTier(context: Context): DeviceTier {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        if (activityManager == null) return DeviceTier.STANDARD
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        val lowRam = activityManager.isLowRamDevice
        val memoryClass = activityManager.memoryClass
        val totalMemMb = memoryInfo.totalMem / (1024L * 1024L)
        return if (lowRam || memoryClass <= 192 || totalMemMb <= 4096L) {
            DeviceTier.REDUCED
        } else {
            DeviceTier.STANDARD
        }
    }

    private fun postNotice(message: String, tone: NoticeTone) {
        _uiState.update { it.copy(notice = UserNotice(message, tone)) }
    }
}

private data class TrashBatchResult(
    val entries: List<TrashEntry>,
    val failures: List<FileActionFailure>
) {
    val succeededDocumentIds: List<String> = entries.map(TrashEntry::trashedDocumentId)
}

private fun TrashBatchResult.toFileBatchOperationResult(): FileBatchOperationResult = FileBatchOperationResult(
    succeededDocumentIds = succeededDocumentIds,
    failures = failures
)

private data class BatchFeedback(
    val error: String? = null,
    val notice: UserNotice? = null
)

internal fun OrganizerUiState.visibleBrowseItems(): List<FileItem> {
    val scopedItems = items.filter { item ->
        when (browseScopeFilter) {
            BrowseScopeFilter.ALL -> true
            BrowseScopeFilter.FOLDERS_ONLY -> item.isDirectory
            BrowseScopeFilter.FILES_ONLY -> !item.isDirectory
        }
    }.filter { item ->
        item.isDirectory || matchesBrowseTypeFilter(item, browseTypeFilter)
    }

    val comparator = browseComparator(browseSortOption).let { base ->
        if (browseSortDirection == BrowseSortDirection.ASCENDING) base else base.reversed()
    }

    val folders = scopedItems.filter(FileItem::isDirectory).sortedWith(comparator)
    val files = scopedItems.filterNot(FileItem::isDirectory).sortedWith(comparator)
    return when (browseScopeFilter) {
        BrowseScopeFilter.FOLDERS_ONLY -> folders
        BrowseScopeFilter.FILES_ONLY -> files
        BrowseScopeFilter.ALL -> folders + files
    }
}

private fun OrganizerUiState.clearSelectionState(): OrganizerUiState = copy(
    isSelectionMode = false,
    selectedDocumentIds = emptySet(),
    pendingFileOperation = null,
    destinationPickerState = null,
    fileDetailTarget = null
)

private fun OrganizerUiState.resetBrowseExplorerControls(resetLayoutMode: Boolean = false): OrganizerUiState = copy(
    browseLayoutMode = if (resetLayoutMode) BrowseLayoutMode.LIST else browseLayoutMode,
    browseSortOption = BrowseSortOption.NAME,
    browseSortDirection = BrowseSortDirection.ASCENDING,
    browseScopeFilter = BrowseScopeFilter.ALL,
    browseTypeFilter = BrowseTypeFilter.ALL,
    showBrowseControlsSheet = false,
    fileDetailTarget = null
)

private fun matchesBrowseTypeFilter(item: FileItem, filter: BrowseTypeFilter): Boolean = when (filter) {
    BrowseTypeFilter.ALL -> true
    BrowseTypeFilter.IMAGES -> item.kind == FileKind.IMAGE
    BrowseTypeFilter.VIDEOS -> item.kind == FileKind.VIDEO
    BrowseTypeFilter.AUDIO -> item.kind == FileKind.AUDIO
    BrowseTypeFilter.DOCUMENTS -> item.kind == FileKind.DOCUMENT
    BrowseTypeFilter.ARCHIVES_AND_APKS -> item.kind == FileKind.ARCHIVE || item.kind == FileKind.APK
}

private fun browseComparator(option: BrowseSortOption): Comparator<FileItem> = when (option) {
    BrowseSortOption.NAME -> compareBy<FileItem>({ it.name.lowercase() }, { it.documentId })
    BrowseSortOption.DATE_MODIFIED -> compareBy<FileItem>({ it.lastModified ?: Long.MIN_VALUE }, { it.name.lowercase() })
    BrowseSortOption.SIZE -> compareBy<FileItem>({ it.sizeBytes ?: 0L }, { it.name.lowercase() })
    BrowseSortOption.TYPE -> compareBy<FileItem>({ browseTypeKey(it) }, { it.name.lowercase() })
}

private fun browseTypeKey(item: FileItem): String = when {
    item.isDirectory -> "directory"
    else -> item.kind.name.lowercase()
}

private fun StorageSummary.toHomeSummary(): HomeSummary = HomeSummary(
    usedBytes = totalBytes,
    freeBytes = freeBytes,
    fileCount = fileCount,
    folderCount = folderCount,
    topCategories = categories.take(4)
)

private fun StorageSummary.deriveNewFiles(): List<FileItem> {
    val cutoff = System.currentTimeMillis() - 3L * 24 * 60 * 60 * 1000
    val recentNew = recentFiles.filter { (it.lastModified ?: 0L) >= cutoff }
    return if (recentNew.isNotEmpty()) recentNew.take(6) else recentFiles.take(4)
}
