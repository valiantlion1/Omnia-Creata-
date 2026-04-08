package com.omnia.organizer.ui

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
import com.omnia.organizer.core.domain.repository.SelectedRootRepository
import com.omnia.organizer.core.domain.repository.TrashRepository
import com.omnia.organizer.files.SafDocumentManager
import dagger.hilt.android.lifecycle.HiltViewModel
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

data class PendingFileOperation(
    val type: FileOperationType,
    val items: List<FileItem>
)

data class DestinationPickerState(
    val breadcrumb: List<FolderHandle>,
    val items: List<FileItem>,
    val targetDocumentId: String
)

data class OrganizerUiState(
    val root: SelectedRoot? = null,
    val breadcrumb: List<FolderHandle> = emptyList(),
    val items: List<FileItem> = emptyList(),
    val searchQuery: String = "",
    val searchFilters: SearchFilters = SearchFilters(),
    val searchResults: List<FileItem> = emptyList(),
    val storageSummary: StorageSummary? = null,
    val recentFiles: List<FileItem> = emptyList(),
    val largeFiles: List<FileItem> = emptyList(),
    val trashEntries: List<TrashEntry> = emptyList(),
    val renameTarget: FileItem? = null,
    val showCreateFolderDialog: Boolean = false,
    val createFolderTargetDocumentId: String? = null,
    val createFolderForDestination: Boolean = false,
    val isSelectionMode: Boolean = false,
    val selectedDocumentIds: Set<String> = emptySet(),
    val pendingFileOperation: PendingFileOperation? = null,
    val destinationPickerState: DestinationPickerState? = null,
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
    private val documentManager: SafDocumentManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrganizerUiState())
    val uiState: StateFlow<OrganizerUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var summaryJob: Job? = null

    init {
        selectedRootRepository.observe()
            .onEach { root ->
                searchJob?.cancel()
                summaryJob?.cancel()
                if (root == null) {
                    _uiState.update { previous ->
                        OrganizerUiState(
                            searchFilters = previous.searchFilters,
                            trashEntries = previous.trashEntries
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
                "home", "storage" -> refreshStorageSummary(root, showLoading = true)
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
                        items = children
                    ).clearSelectionState()
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
                        items = children
                    ).clearSelectionState()
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
                        items = children
                    ).clearSelectionState()
                }
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

    fun enterSelectionMode(item: FileItem) {
        _uiState.update {
            it.copy(
                isSelectionMode = true,
                selectedDocumentIds = setOf(item.documentId),
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
        val items = _uiState.value.items
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
        _uiState.update { it.copy(renameTarget = item, errorMessage = null) }
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
                refreshStorageSummary(root, showLoading = false)
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
                    refreshStorageSummary(root, showLoading = false)
                }

                summarizeBatchResult(
                    operation = if (pending.type == FileOperationType.COPY) "Copied" else "Moved",
                    total = pending.items.size,
                    result = result
                )
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
                    refreshStorageSummary(root, showLoading = false)
                }
                summarizeBatchResult(
                    operation = "Moved to Recycle Bin",
                    total = selected.size,
                    result = result.toFileBatchOperationResult()
                )
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
                refreshStorageSummary(root, showLoading = false)
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
                    errorMessage = if (skippedCount > 0) {
                        "$skippedCount folder item(s) were skipped because Android share only supports files here."
                    } else {
                        null
                    }
                )
            }
        }
    }

    fun restoreFromTrash(entry: TrashEntry) {
        val root = _uiState.value.root
        viewModelScope.launch {
            runTask("Restore failed.") {
                val restored = withContext(Dispatchers.IO) { documentManager.restoreTrash(entry) }
                if (!restored) error("The item could not be restored.")
                trashRepository.delete(entry.id)
                if (root != null) {
                    refreshCurrentFolder(root, keepSearchResults = true)
                    refreshStorageSummary(root, showLoading = false)
                }
            }
        }
    }

    fun deletePermanentlyFromTrash(entry: TrashEntry) {
        viewModelScope.launch {
            runTask("Delete forever failed.") {
                val deleted = withContext(Dispatchers.IO) { documentManager.permanentlyDeleteTrash(entry) }
                if (!deleted) error("The item could not be deleted permanently.")
                trashRepository.delete(entry.id)
            }
        }
    }

    fun clearTrash() {
        viewModelScope.launch {
            trashRepository.clear()
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
                refreshStorageSummary(root, showLoading = false)
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
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
                        recentFiles = emptyList(),
                        largeFiles = emptyList(),
                        searchResults = emptyList(),
                        isStorageRefreshing = true
                    ).clearSelectionState()
                }
                refreshStorageSummary(root, showLoading = false)
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
                searchResults = if (keepSearchResults) it.searchResults else emptyList()
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
                        recentFiles = summary.recentFiles,
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
    ): String? {
        if (result.failures.isEmpty()) return null
        val failureSummary = if (result.succeededDocumentIds.isEmpty()) {
            "$operation failed for all $total item(s). ${result.failures.first().reason}"
        } else {
            val failedCount = result.failures.size
            "$operation ${result.succeededDocumentIds.size} item(s). $failedCount item(s) failed."
        }
        return failureSummary
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

private fun OrganizerUiState.clearSelectionState(): OrganizerUiState = copy(
    isSelectionMode = false,
    selectedDocumentIds = emptySet(),
    pendingFileOperation = null,
    destinationPickerState = null
)
