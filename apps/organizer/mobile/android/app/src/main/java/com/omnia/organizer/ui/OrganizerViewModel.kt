package com.omnia.organizer.ui

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
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
                    _uiState.update { OrganizerUiState(trashEntries = it.trashEntries) }
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

    fun onTreePicked(uri: Uri) {
        viewModelScope.launch {
            runTask("Unable to open the selected folder.") {
                val root = withContext(Dispatchers.IO) { documentManager.inspectTree(uri) }
                    ?: error("Invalid document tree.")
                selectedRootRepository.save(root)
            }
        }
    }

    fun enableDeviceStorageRoot() {
        viewModelScope.launch {
            runTask("Unable to enable device storage access.") {
                val root = withContext(Dispatchers.IO) { documentManager.inspectDeviceStorage() }
                    ?: error("Device storage is not available on this phone.")
                val currentRoot = _uiState.value.root
                val needsSave = currentRoot == null ||
                    currentRoot.sourceType != root.sourceType ||
                    currentRoot.treeUri != root.treeUri ||
                    currentRoot.rootDocumentId != root.rootDocumentId
                if (needsSave) {
                    selectedRootRepository.save(root)
                }
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

    fun openFolder(item: FileItem) {
        val root = _uiState.value.root ?: return
        if (!item.isDirectory) return
        viewModelScope.launch {
            runTask("Unable to open the folder.") {
                val handle = withContext(Dispatchers.IO) { documentManager.getFolderHandle(root, item.documentId) }
                    ?: FolderHandle(item.documentId, item.name)
                val children = withContext(Dispatchers.IO) { documentManager.listChildren(root, item.documentId) }
                _uiState.update { it.copy(breadcrumb = it.breadcrumb + handle, items = children) }
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
                _uiState.update { it.copy(breadcrumb = nextBreadcrumb, items = children) }
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
                _uiState.update { it.copy(breadcrumb = listOfNotNull(rootHandle, parentHandle), items = children) }
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

    fun requestRename(item: FileItem) {
        _uiState.update { it.copy(renameTarget = item) }
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
                _uiState.update { it.copy(renameTarget = null) }
                refreshCurrentFolder(root, keepSearchResults = true)
                refreshStorageSummary(root, showLoading = false)
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

    fun requestCreateFolder() {
        _uiState.update { it.copy(showCreateFolderDialog = true) }
    }

    fun dismissCreateFolder() {
        _uiState.update { it.copy(showCreateFolderDialog = false) }
    }

    fun createFolder(name: String) {
        val root = _uiState.value.root ?: return
        val currentFolder = _uiState.value.breadcrumb.lastOrNull() ?: return
        viewModelScope.launch {
            runTask("Unable to create the folder.") {
                val created = withContext(Dispatchers.IO) { documentManager.createFolder(root, currentFolder.documentId, name) }
                if (!created) error("Folder could not be created.")
                _uiState.update { it.copy(showCreateFolderDialog = false) }
                refreshCurrentFolder(root, keepSearchResults = true)
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
                val items = withContext(Dispatchers.IO) { documentManager.listChildren(root, root.rootDocumentId) }
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
                    )
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
        val currentFolder = _uiState.value.breadcrumb.lastOrNull() ?: FolderHandle(root.rootDocumentId, root.displayName)
        val items = withContext(Dispatchers.IO) { documentManager.listChildren(root, currentFolder.documentId) }
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
}
