package com.omnia.organizer.core.domain.model

enum class SourceType {
    TREE
}

enum class FileKind {
    DIRECTORY,
    IMAGE,
    VIDEO,
    AUDIO,
    DOCUMENT,
    ARCHIVE,
    APK,
    OTHER
}

enum class SearchDateFilter {
    ANYTIME,
    LAST_7_DAYS,
    LAST_30_DAYS
}

enum class SearchSizeFilter {
    ANY,
    LARGE_10_MB,
    HUGE_100_MB
}

data class SelectedRoot(
    val treeUri: String,
    val rootDocumentId: String,
    val displayName: String,
    val sourceType: SourceType = SourceType.TREE,
    val selectedAt: Long
)

data class FolderHandle(
    val documentId: String,
    val name: String
)

data class FileItem(
    val documentId: String,
    val parentDocumentId: String,
    val name: String,
    val mimeType: String,
    val sizeBytes: Long?,
    val lastModified: Long?,
    val kind: FileKind,
    val isDirectory: Boolean,
    val canWrite: Boolean,
    val canDelete: Boolean,
    val canRename: Boolean
)

data class SearchFilters(
    val kind: FileKind? = null,
    val dateFilter: SearchDateFilter = SearchDateFilter.ANYTIME,
    val sizeFilter: SearchSizeFilter = SearchSizeFilter.ANY
)

data class CategoryStat(
    val kind: FileKind,
    val bytes: Long,
    val count: Int
)

data class StorageSummary(
    val totalBytes: Long,
    val fileCount: Int,
    val folderCount: Int,
    val categories: List<CategoryStat>,
    val recentFiles: List<FileItem>,
    val largeFiles: List<FileItem>
)

data class TrashEntry(
    val id: Long = 0,
    val treeUri: String,
    val originalParentDocumentId: String,
    val trashedDocumentId: String,
    val displayName: String,
    val mimeType: String,
    val sizeBytes: Long?,
    val deletedAt: Long
)
