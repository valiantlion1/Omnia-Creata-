package com.omnia.organizer.files

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import com.omnia.organizer.core.domain.model.CategoryStat
import com.omnia.organizer.core.domain.model.FileItem
import com.omnia.organizer.core.domain.model.FileKind
import com.omnia.organizer.core.domain.model.FolderHandle
import com.omnia.organizer.core.domain.model.SearchDateFilter
import com.omnia.organizer.core.domain.model.SearchFilters
import com.omnia.organizer.core.domain.model.SearchSizeFilter
import com.omnia.organizer.core.domain.model.SelectedRoot
import com.omnia.organizer.core.domain.model.StorageSummary
import com.omnia.organizer.core.domain.model.TrashEntry
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class SafDocumentManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val resolver: ContentResolver = context.contentResolver
    private val projection = arrayOf(
        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
        DocumentsContract.Document.COLUMN_MIME_TYPE,
        DocumentsContract.Document.COLUMN_LAST_MODIFIED,
        DocumentsContract.Document.COLUMN_SIZE,
        DocumentsContract.Document.COLUMN_FLAGS
    )
    private val trashFolderName = ".oofm-trash"

    fun inspectTree(treeUri: Uri): SelectedRoot? {
        val rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri)
        val rootInfo = queryDocument(treeUri, rootDocumentId, rootDocumentId) ?: return null
        return SelectedRoot(
            treeUri = treeUri.toString(),
            rootDocumentId = rootDocumentId,
            displayName = rootInfo.name,
            selectedAt = System.currentTimeMillis()
        )
    }

    fun listChildren(root: SelectedRoot, parentDocumentId: String): List<FileItem> {
        val treeUri = Uri.parse(root.treeUri)
        val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentDocumentId)
        val items = mutableListOf<FileItem>()
        resolver.query(childrenUri, projection, null, null, null)?.use { cursor ->
            val documentIdIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
            val displayNameIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
            val mimeTypeIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
            val lastModifiedIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_LAST_MODIFIED)
            val sizeIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)
            val flagsIndex = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_FLAGS)
            while (cursor.moveToNext()) {
                val documentId = cursor.getString(documentIdIndex)
                val name = cursor.getString(displayNameIndex) ?: documentId
                val mimeType = cursor.getString(mimeTypeIndex) ?: ""
                val isDirectory = mimeType == DocumentsContract.Document.MIME_TYPE_DIR
                if (isDirectory && name == trashFolderName) continue
                val flags = cursor.getInt(flagsIndex)
                items += FileItem(
                    documentId = documentId,
                    parentDocumentId = parentDocumentId,
                    name = name,
                    mimeType = mimeType,
                    sizeBytes = cursor.getLongOrNull(sizeIndex),
                    lastModified = cursor.getLongOrNull(lastModifiedIndex),
                    kind = classifyKind(name, mimeType, isDirectory),
                    isDirectory = isDirectory,
                    canWrite = flags and DocumentsContract.Document.FLAG_SUPPORTS_WRITE != 0,
                    canDelete = flags and DocumentsContract.Document.FLAG_SUPPORTS_DELETE != 0,
                    canRename = flags and DocumentsContract.Document.FLAG_SUPPORTS_RENAME != 0
                )
            }
        }
        return items.sortedWith(compareByDescending<FileItem> { it.isDirectory }.thenBy { it.name.lowercase() })
    }

    fun getFolderHandle(root: SelectedRoot, documentId: String): FolderHandle? {
        val item = queryDocument(Uri.parse(root.treeUri), documentId, documentId) ?: return null
        return FolderHandle(documentId = item.documentId, name = item.name)
    }

    fun buildDocumentUri(root: SelectedRoot, documentId: String): Uri =
        DocumentsContract.buildDocumentUriUsingTree(Uri.parse(root.treeUri), documentId)

    fun createFolder(root: SelectedRoot, parentDocumentId: String, name: String): Boolean {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return false
        val parentUri = buildDocumentUri(root, parentDocumentId)
        return DocumentsContract.createDocument(
            resolver,
            parentUri,
            DocumentsContract.Document.MIME_TYPE_DIR,
            trimmed
        ) != null
    }

    fun rename(root: SelectedRoot, item: FileItem, newName: String): FileItem? {
        val trimmed = newName.trim()
        if (trimmed.isEmpty()) return null
        val renamedUri = DocumentsContract.renameDocument(
            resolver,
            buildDocumentUri(root, item.documentId),
            trimmed
        ) ?: return null
        return queryDocument(Uri.parse(root.treeUri), DocumentsContract.getDocumentId(renamedUri), item.parentDocumentId)
    }

    fun moveToTrash(root: SelectedRoot, item: FileItem): TrashEntry {
        val trashDocumentId = ensureTrashFolder(root)
        val movedUri = DocumentsContract.moveDocument(
            resolver,
            buildDocumentUri(root, item.documentId),
            buildDocumentUri(root, item.parentDocumentId),
            buildDocumentUri(root, trashDocumentId)
        ) ?: error("Move to Recycle Bin is not supported by this folder provider.")
        return TrashEntry(
            treeUri = root.treeUri,
            originalParentDocumentId = item.parentDocumentId,
            trashedDocumentId = DocumentsContract.getDocumentId(movedUri),
            displayName = item.name,
            mimeType = item.mimeType,
            sizeBytes = item.sizeBytes,
            deletedAt = System.currentTimeMillis()
        )
    }

    fun restoreTrash(entry: TrashEntry): Boolean {
        val treeUri = Uri.parse(entry.treeUri)
        val root = SelectedRoot(
            treeUri = entry.treeUri,
            rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri),
            displayName = "OOFM",
            selectedAt = System.currentTimeMillis()
        )
        val trashDocumentId = ensureTrashFolder(root)
        val restoredUri = DocumentsContract.moveDocument(
            resolver,
            buildDocumentUri(root, entry.trashedDocumentId),
            buildDocumentUri(root, trashDocumentId),
            buildDocumentUri(root, entry.originalParentDocumentId)
        )
        return restoredUri != null
    }

    fun permanentlyDeleteTrash(entry: TrashEntry): Boolean {
        val treeUri = Uri.parse(entry.treeUri)
        val root = SelectedRoot(
            treeUri = entry.treeUri,
            rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri),
            displayName = "OOFM",
            selectedAt = System.currentTimeMillis()
        )
        return DocumentsContract.deleteDocument(resolver, buildDocumentUri(root, entry.trashedDocumentId))
    }

    fun search(root: SelectedRoot, query: String, filters: SearchFilters, limit: Int = 200): List<FileItem> {
        val normalized = query.trim().lowercase()
        if (normalized.isBlank()) return emptyList()
        val results = mutableListOf<FileItem>()
        walkTree(root) { item ->
            if (matchesSearch(item, normalized, filters)) results += item
            results.size < limit
        }
        return results.sortedWith(compareByDescending<FileItem> { it.lastModified ?: 0L }.thenBy { it.name.lowercase() })
    }

    fun summarize(root: SelectedRoot): StorageSummary {
        var totalBytes = 0L
        var fileCount = 0
        var folderCount = 0
        val categoryMap = linkedMapOf<FileKind, Pair<Long, Int>>()
        val recentFiles = mutableListOf<FileItem>()
        val largeFiles = mutableListOf<FileItem>()

        walkTree(root) { item ->
            if (item.isDirectory) {
                folderCount++
            } else {
                fileCount++
                val bytes = item.sizeBytes ?: 0L
                totalBytes += bytes
                val previous = categoryMap[item.kind] ?: (0L to 0)
                categoryMap[item.kind] = (previous.first + bytes) to (previous.second + 1)
                recentFiles += item
                largeFiles += item
            }
            true
        }

        val categories = categoryMap.map { (kind, value) ->
            CategoryStat(kind = kind, bytes = value.first, count = value.second)
        }.sortedByDescending { it.bytes }

        return StorageSummary(
            totalBytes = totalBytes,
            fileCount = fileCount,
            folderCount = folderCount,
            categories = categories,
            recentFiles = recentFiles.sortedByDescending { it.lastModified ?: 0L }.take(6),
            largeFiles = largeFiles.sortedByDescending { it.sizeBytes ?: 0L }.take(6)
        )
    }

    private fun walkTree(root: SelectedRoot, visitor: (FileItem) -> Boolean) {
        val stack = ArrayDeque<String>()
        stack.add(root.rootDocumentId)
        while (stack.isNotEmpty()) {
            val parentId = stack.removeLast()
            val children = listChildren(root, parentId)
            for (child in children) {
                if (!visitor(child)) return
                if (child.isDirectory) stack.add(child.documentId)
            }
        }
    }

    private fun ensureTrashFolder(root: SelectedRoot): String {
        listChildren(root, root.rootDocumentId)
            .firstOrNull { it.isDirectory && it.name == trashFolderName }
            ?.let { return it.documentId }

        val createdUri = DocumentsContract.createDocument(
            resolver,
            buildDocumentUri(root, root.rootDocumentId),
            DocumentsContract.Document.MIME_TYPE_DIR,
            trashFolderName
        ) ?: error("Unable to create OOFM Recycle Bin folder.")

        return DocumentsContract.getDocumentId(createdUri)
    }

    private fun queryDocument(treeUri: Uri, documentId: String, parentDocumentId: String): FileItem? {
        val documentUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId)
        resolver.query(documentUri, projection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return null
            val name = cursor.getString(cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)) ?: documentId
            val mimeType = cursor.getString(cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)) ?: ""
            val isDirectory = mimeType == DocumentsContract.Document.MIME_TYPE_DIR
            val flags = cursor.getInt(cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_FLAGS))
            return FileItem(
                documentId = documentId,
                parentDocumentId = parentDocumentId,
                name = name,
                mimeType = mimeType,
                sizeBytes = cursor.getLongOrNull(cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_SIZE)),
                lastModified = cursor.getLongOrNull(cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_LAST_MODIFIED)),
                kind = classifyKind(name, mimeType, isDirectory),
                isDirectory = isDirectory,
                canWrite = flags and DocumentsContract.Document.FLAG_SUPPORTS_WRITE != 0,
                canDelete = flags and DocumentsContract.Document.FLAG_SUPPORTS_DELETE != 0,
                canRename = flags and DocumentsContract.Document.FLAG_SUPPORTS_RENAME != 0
            )
        }
        return null
    }

    private fun matchesSearch(item: FileItem, query: String, filters: SearchFilters): Boolean {
        if (!item.name.lowercase().contains(query)) return false
        if (filters.kind != null && item.kind != filters.kind) return false

        val now = System.currentTimeMillis()
        val threshold = when (filters.dateFilter) {
            SearchDateFilter.ANYTIME -> null
            SearchDateFilter.LAST_7_DAYS -> now - 7L * 24 * 60 * 60 * 1000
            SearchDateFilter.LAST_30_DAYS -> now - 30L * 24 * 60 * 60 * 1000
        }
        if (threshold != null && (item.lastModified ?: 0L) < threshold) return false

        val bytes = item.sizeBytes ?: 0L
        return when (filters.sizeFilter) {
            SearchSizeFilter.ANY -> true
            SearchSizeFilter.LARGE_10_MB -> bytes >= 10L * 1024 * 1024
            SearchSizeFilter.HUGE_100_MB -> bytes >= 100L * 1024 * 1024
        }
    }

    private fun classifyKind(name: String, mimeType: String, isDirectory: Boolean): FileKind {
        if (isDirectory) return FileKind.DIRECTORY
        val lowerName = name.lowercase()
        return when {
            lowerName.endsWith(".apk") || lowerName.endsWith(".xapk") || lowerName.endsWith(".apks") -> FileKind.APK
            mimeType.startsWith("image/") -> FileKind.IMAGE
            mimeType.startsWith("video/") -> FileKind.VIDEO
            mimeType.startsWith("audio/") -> FileKind.AUDIO
            lowerName.endsWith(".zip") || lowerName.endsWith(".rar") || lowerName.endsWith(".7z") || lowerName.endsWith(".tar") || lowerName.endsWith(".gz") -> FileKind.ARCHIVE
            mimeType.startsWith("text/") || mimeType.contains("pdf") || mimeType.contains("document") || mimeType.contains("sheet") || mimeType.contains("presentation") -> FileKind.DOCUMENT
            else -> FileKind.OTHER
        }
    }
}

private fun android.database.Cursor.getLongOrNull(index: Int): Long? =
    if (isNull(index)) null else getLong(index)
