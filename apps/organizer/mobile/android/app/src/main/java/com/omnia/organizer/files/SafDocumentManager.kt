package com.omnia.organizer.files

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
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
import com.omnia.organizer.core.domain.model.SourceType
import com.omnia.organizer.core.domain.model.StorageSummary
import com.omnia.organizer.core.domain.model.TrashEntry
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.IOException
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
            sourceType = SourceType.TREE,
            selectedAt = System.currentTimeMillis()
        )
    }

    fun inspectDeviceStorage(): SelectedRoot? {
        val root = Environment.getExternalStorageDirectory() ?: return null
        if (!root.exists()) return null
        return SelectedRoot(
            treeUri = root.absolutePath,
            rootDocumentId = root.absolutePath,
            displayName = "Device storage",
            sourceType = SourceType.FILE_SYSTEM,
            selectedAt = System.currentTimeMillis()
        )
    }

    fun listChildren(root: SelectedRoot, parentDocumentId: String): List<FileItem> = when (root.sourceType) {
        SourceType.FILE_SYSTEM -> listFileChildren(File(parentDocumentId), root.rootDocumentId)
        SourceType.TREE -> listTreeChildren(root, parentDocumentId)
    }

    fun getFolderHandle(root: SelectedRoot, documentId: String): FolderHandle? {
        return when (root.sourceType) {
            SourceType.FILE_SYSTEM -> {
                val folder = File(documentId)
                if (!folder.exists() || !folder.isDirectory) {
                    null
                } else {
                    FolderHandle(
                        documentId = folder.absolutePath,
                        name = folder.name.ifBlank { root.displayName }
                    )
                }
            }

            SourceType.TREE -> {
                val item = queryDocument(Uri.parse(root.treeUri), documentId, documentId) ?: return null
                FolderHandle(documentId = item.documentId, name = item.name)
            }
        }
    }

    fun buildDocumentUri(root: SelectedRoot, documentId: String): Uri = when (root.sourceType) {
        SourceType.FILE_SYSTEM -> {
            val file = File(documentId)
            FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        }
        SourceType.TREE -> DocumentsContract.buildDocumentUriUsingTree(Uri.parse(root.treeUri), documentId)
    }

    fun createFolder(root: SelectedRoot, parentDocumentId: String, name: String): Boolean {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return false
        return when (root.sourceType) {
            SourceType.FILE_SYSTEM -> {
                val folder = File(parentDocumentId, trimmed)
                !folder.exists() && folder.mkdirs()
            }
            SourceType.TREE -> {
                val parentUri = buildDocumentUri(root, parentDocumentId)
                DocumentsContract.createDocument(
                    resolver,
                    parentUri,
                    DocumentsContract.Document.MIME_TYPE_DIR,
                    trimmed
                ) != null
            }
        }
    }

    fun rename(root: SelectedRoot, item: FileItem, newName: String): FileItem? {
        val trimmed = newName.trim()
        if (trimmed.isEmpty()) return null
        return when (root.sourceType) {
            SourceType.FILE_SYSTEM -> {
                val source = File(item.documentId)
                val parent = source.parentFile ?: return null
                val target = uniqueTarget(parent, trimmed)
                if (!moveFile(source, target)) return null
                fileToItem(target, parent.absolutePath)
            }
            SourceType.TREE -> {
                val renamedUri = DocumentsContract.renameDocument(
                    resolver,
                    buildDocumentUri(root, item.documentId),
                    trimmed
                ) ?: return null
                queryDocument(Uri.parse(root.treeUri), DocumentsContract.getDocumentId(renamedUri), item.parentDocumentId)
            }
        }
    }

    fun copyItems(
        root: SelectedRoot,
        items: List<FileItem>,
        destinationDocumentId: String
    ): FileBatchOperationResult = executeBatchOperation(items) { item ->
        when (root.sourceType) {
            SourceType.FILE_SYSTEM -> copyFileSystemItem(root, item, destinationDocumentId)
            SourceType.TREE -> copyTreeItem(root, item, destinationDocumentId)
        }
    }

    fun moveItems(
        root: SelectedRoot,
        items: List<FileItem>,
        destinationDocumentId: String
    ): FileBatchOperationResult = executeBatchOperation(items) { item ->
        when (root.sourceType) {
            SourceType.FILE_SYSTEM -> moveFileSystemItem(root, item, destinationDocumentId)
            SourceType.TREE -> moveTreeItem(root, item, destinationDocumentId)
        }
    }

    fun moveToTrash(root: SelectedRoot, item: FileItem): TrashEntry = when (root.sourceType) {
        SourceType.FILE_SYSTEM -> {
            val source = File(item.documentId)
            val trashDir = ensureTrashFolder(root)
            val target = uniqueTarget(File(trashDir), source.name)
            if (!moveFile(source, target)) error("Move to Recycle Bin is not supported by this folder provider.")
            TrashEntry(
                treeUri = root.treeUri,
                sourceType = root.sourceType,
                originalParentDocumentId = item.parentDocumentId,
                trashedDocumentId = target.absolutePath,
                displayName = item.name,
                mimeType = item.mimeType,
                sizeBytes = item.sizeBytes,
                deletedAt = System.currentTimeMillis()
            )
        }
        SourceType.TREE -> {
            val trashDocumentId = ensureTrashFolder(root)
            val movedUri = DocumentsContract.moveDocument(
                resolver,
                buildDocumentUri(root, item.documentId),
                buildDocumentUri(root, item.parentDocumentId),
                buildDocumentUri(root, trashDocumentId)
            ) ?: error("Move to Recycle Bin is not supported by this folder provider.")
            TrashEntry(
                treeUri = root.treeUri,
                sourceType = root.sourceType,
                originalParentDocumentId = item.parentDocumentId,
                trashedDocumentId = DocumentsContract.getDocumentId(movedUri),
                displayName = item.name,
                mimeType = item.mimeType,
                sizeBytes = item.sizeBytes,
                deletedAt = System.currentTimeMillis()
            )
        }
    }

    fun restoreTrash(entry: TrashEntry): Boolean {
        return when (entry.sourceType) {
            SourceType.FILE_SYSTEM -> {
                val source = File(entry.trashedDocumentId)
                val targetParent = File(entry.originalParentDocumentId)
                if (!source.exists() || !targetParent.exists()) {
                    false
                } else {
                    val target = uniqueTarget(targetParent, entry.displayName)
                    moveFile(source, target)
                }
            }

            SourceType.TREE -> {
                val treeUri = Uri.parse(entry.treeUri)
                val root = SelectedRoot(
                    treeUri = entry.treeUri,
                    rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri),
                    displayName = "OOFM",
                    sourceType = SourceType.TREE,
                    selectedAt = System.currentTimeMillis()
                )
                val trashDocumentId = ensureTrashFolder(root)
                val restoredUri = DocumentsContract.moveDocument(
                    resolver,
                    buildDocumentUri(root, entry.trashedDocumentId),
                    buildDocumentUri(root, trashDocumentId),
                    buildDocumentUri(root, entry.originalParentDocumentId)
                )
                restoredUri != null
            }
        }
    }

    fun permanentlyDeleteTrash(entry: TrashEntry): Boolean = when (entry.sourceType) {
        SourceType.FILE_SYSTEM -> File(entry.trashedDocumentId).deleteRecursively()
        SourceType.TREE -> {
            val treeUri = Uri.parse(entry.treeUri)
            val root = SelectedRoot(
                treeUri = entry.treeUri,
                rootDocumentId = DocumentsContract.getTreeDocumentId(treeUri),
                displayName = "OOFM",
                sourceType = SourceType.TREE,
                selectedAt = System.currentTimeMillis()
            )
            DocumentsContract.deleteDocument(resolver, buildDocumentUri(root, entry.trashedDocumentId))
        }
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

    fun listByKinds(root: SelectedRoot, kinds: Set<FileKind>, limit: Int = 240): List<FileItem> {
        if (kinds.isEmpty()) return emptyList()
        val results = mutableListOf<FileItem>()
        walkTree(root) { item ->
            if (!item.isDirectory && kinds.contains(item.kind)) {
                results += item
            }
            results.size < limit
        }
        return results.sortedWith(compareByDescending<FileItem> { it.lastModified ?: 0L }.thenBy { it.name.lowercase() })
    }

    fun listDescendants(
        root: SelectedRoot,
        parentDocumentId: String,
        limit: Int = 240,
        kinds: Set<FileKind>? = null
    ): List<FileItem> {
        val results = mutableListOf<FileItem>()
        walkTree(root, parentDocumentId) { item ->
            if (!item.isDirectory && (kinds == null || kinds.contains(item.kind))) {
                results += item
            }
            results.size < limit
        }
        return results.sortedWith(compareByDescending<FileItem> { it.lastModified ?: 0L }.thenBy { it.name.lowercase() })
    }

    fun findFolderPath(root: SelectedRoot, targetNames: Set<String>): List<FolderHandle>? {
        if (targetNames.isEmpty()) return null
        val normalizedTargets = targetNames.map { it.trim().lowercase() }.filter { it.isNotBlank() }.toSet()
        if (normalizedTargets.isEmpty()) return null
        return when (root.sourceType) {
            SourceType.FILE_SYSTEM -> findFileSystemFolderPath(File(root.rootDocumentId), normalizedTargets)
            SourceType.TREE -> findTreeFolderPath(root, normalizedTargets)
        }
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
            freeBytes = resolveFreeBytes(root),
            fileCount = fileCount,
            folderCount = folderCount,
            categories = categories,
            recentFiles = recentFiles.sortedByDescending { it.lastModified ?: 0L }.take(6),
            largeFiles = largeFiles.sortedByDescending { it.sizeBytes ?: 0L }.take(6)
        )
    }

    private fun listTreeChildren(root: SelectedRoot, parentDocumentId: String): List<FileItem> {
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

    private fun listFileChildren(parent: File, rootPath: String): List<FileItem> {
        val children = parent.listFiles().orEmpty()
            .filterNot { it.isDirectory && it.name == trashFolderName && parent.absolutePath == rootPath }
            .mapNotNull { fileToItem(it, parent.absolutePath) }
        return children.sortedWith(compareByDescending<FileItem> { it.isDirectory }.thenBy { it.name.lowercase() })
    }

    private fun walkTree(root: SelectedRoot, visitor: (FileItem) -> Boolean) {
        walkTree(root, root.rootDocumentId, visitor)
    }

    private fun walkTree(root: SelectedRoot, startDocumentId: String, visitor: (FileItem) -> Boolean) {
        val stack = ArrayDeque<String>()
        stack.add(startDocumentId)
        while (stack.isNotEmpty()) {
            val parentId = stack.removeLast()
            val children = listChildren(root, parentId)
            for (child in children) {
                if (!visitor(child)) return
                if (child.isDirectory && shouldTraverseDirectory(root, child)) {
                    stack.add(child.documentId)
                }
            }
        }
    }

    private fun shouldTraverseDirectory(root: SelectedRoot, item: FileItem): Boolean {
        if (!item.isDirectory) return false
        if (item.name == trashFolderName) return false
        if (root.sourceType != SourceType.FILE_SYSTEM) return true

        val normalizedPath = item.documentId.replace('\\', '/')
        if (normalizedPath.contains("/Android/data", ignoreCase = true)) return false
        if (normalizedPath.contains("/Android/obb", ignoreCase = true)) return false
        if (item.name.equals(".thumbnails", ignoreCase = true)) return false
        return true
    }

    private fun ensureTrashFolder(root: SelectedRoot): String = when (root.sourceType) {
        SourceType.FILE_SYSTEM -> {
            val trashDir = File(root.rootDocumentId, trashFolderName)
            if (!trashDir.exists()) trashDir.mkdirs()
            trashDir.absolutePath
        }
        SourceType.TREE -> {
            listTreeChildren(root, root.rootDocumentId)
                .firstOrNull { it.isDirectory && it.name == trashFolderName }
                ?.let { return it.documentId }

            val createdUri = DocumentsContract.createDocument(
                resolver,
                buildDocumentUri(root, root.rootDocumentId),
                DocumentsContract.Document.MIME_TYPE_DIR,
                trashFolderName
            ) ?: error("Unable to create OOFM Recycle Bin folder.")

            DocumentsContract.getDocumentId(createdUri)
        }
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

    private fun fileToItem(file: File, parentPath: String): FileItem? {
        if (!file.exists()) return null
        return FileItem(
            documentId = file.absolutePath,
            parentDocumentId = parentPath,
            name = file.name.ifBlank { file.absolutePath },
            mimeType = detectMimeType(file),
            sizeBytes = if (file.isDirectory) null else file.length(),
            lastModified = file.lastModified(),
            kind = classifyKind(file.name, detectMimeType(file), file.isDirectory),
            isDirectory = file.isDirectory,
            canWrite = file.canWrite(),
            canDelete = file.parentFile?.canWrite() ?: file.canWrite(),
            canRename = file.parentFile?.canWrite() ?: file.canWrite()
        )
    }

    private fun moveFile(source: File, target: File): Boolean {
        target.parentFile?.mkdirs()
        if (source.absolutePath == target.absolutePath) return true
        if (source.renameTo(target)) return true
        return runCatching {
            if (source.isDirectory) {
                source.copyRecursively(target, overwrite = true)
                source.deleteRecursively()
            } else {
                source.copyTo(target, overwrite = true)
                source.delete()
            }
        }.isSuccess
    }

    private fun executeBatchOperation(
        items: List<FileItem>,
        operation: (FileItem) -> Unit
    ): FileBatchOperationResult {
        val succeeded = mutableListOf<String>()
        val failures = mutableListOf<FileActionFailure>()
        items.forEach { item ->
            runCatching { operation(item) }
                .onSuccess { succeeded += item.documentId }
                .onFailure { failure ->
                    failures += FileActionFailure(
                        documentId = item.documentId,
                        displayName = item.name,
                        reason = failure.message ?: "Operation failed."
                    )
                }
        }
        return FileBatchOperationResult(
            succeededDocumentIds = succeeded,
            failures = failures
        )
    }

    private fun copyFileSystemItem(root: SelectedRoot, item: FileItem, destinationDocumentId: String) {
        val source = File(item.documentId)
        val destinationParent = File(destinationDocumentId)
        ensureSameStorageRoot(root, source, destinationParent)
        requireDestinationFolder(destinationParent)
        if (item.isDirectory && isSameOrDescendant(source, destinationParent)) {
            throw IOException("A folder cannot be copied into itself.")
        }
        val target = uniqueTarget(destinationParent, source.name)
        runCatching {
            if (source.isDirectory) {
                source.copyRecursively(target, overwrite = true)
            } else {
                source.copyTo(target, overwrite = true)
            }
        }.getOrElse { throw IOException("Copy failed for ${item.name}.") }
    }

    private fun moveFileSystemItem(root: SelectedRoot, item: FileItem, destinationDocumentId: String) {
        val source = File(item.documentId)
        val destinationParent = File(destinationDocumentId)
        ensureSameStorageRoot(root, source, destinationParent)
        requireDestinationFolder(destinationParent)
        val sourceParent = source.parentFile ?: throw IOException("The source parent folder is unavailable.")
        if (sourceParent.absolutePath == destinationParent.absolutePath) {
            throw IOException("The item is already inside this folder.")
        }
        if (item.isDirectory && isSameOrDescendant(source, destinationParent)) {
            throw IOException("A folder cannot be moved into itself.")
        }
        val target = uniqueTarget(destinationParent, source.name)
        if (!moveFile(source, target)) {
            throw IOException("Move failed for ${item.name}.")
        }
    }

    private fun copyTreeItem(root: SelectedRoot, item: FileItem, destinationDocumentId: String) {
        val destinationChildren = listTreeChildren(root, destinationDocumentId)
        val uniqueName = uniqueName(item.name, destinationChildren.map { it.name }.toSet())
        val copiedUri = DocumentsContract.copyDocument(
            resolver,
            buildDocumentUri(root, item.documentId),
            buildDocumentUri(root, destinationDocumentId)
        ) ?: throw IOException("Copy is not supported by this storage provider.")
        if (uniqueName != item.name) {
            DocumentsContract.renameDocument(resolver, copiedUri, uniqueName)
                ?: throw IOException("The copied item could not be renamed.")
        }
    }

    private fun moveTreeItem(root: SelectedRoot, item: FileItem, destinationDocumentId: String) {
        if (item.parentDocumentId == destinationDocumentId) {
            throw IOException("The item is already inside this folder.")
        }
        val movedUri = DocumentsContract.moveDocument(
            resolver,
            buildDocumentUri(root, item.documentId),
            buildDocumentUri(root, item.parentDocumentId),
            buildDocumentUri(root, destinationDocumentId)
        ) ?: throw IOException("Move is not supported by this storage provider.")

        val destinationChildren = listTreeChildren(root, destinationDocumentId)
        val uniqueName = uniqueName(item.name, destinationChildren.map { it.name }.toSet() - item.name)
        if (uniqueName != item.name) {
            DocumentsContract.renameDocument(resolver, movedUri, uniqueName)
                ?: throw IOException("The moved item could not be renamed.")
        }
    }

    private fun ensureSameStorageRoot(root: SelectedRoot, source: File, destinationParent: File) {
        val rootPath = File(root.rootDocumentId).canonicalPath
        val sourcePath = source.canonicalPath
        val destinationPath = destinationParent.canonicalPath
        if (!sourcePath.startsWith(rootPath, ignoreCase = true) || !destinationPath.startsWith(rootPath, ignoreCase = true)) {
            throw IOException("This action is only supported inside the current storage root.")
        }
    }

    private fun requireDestinationFolder(destinationParent: File) {
        if (!destinationParent.exists() || !destinationParent.isDirectory) {
            throw IOException("The destination folder is not available.")
        }
    }

    private fun isSameOrDescendant(sourceDirectory: File, destinationParent: File): Boolean {
        val sourcePath = sourceDirectory.canonicalPath
        val destinationPath = destinationParent.canonicalPath
        return destinationPath == sourcePath || destinationPath.startsWith("$sourcePath${File.separator}", ignoreCase = true)
    }

    private fun uniqueTarget(parent: File, desiredName: String): File {
        if (!parent.exists()) parent.mkdirs()
        var candidate = File(parent, desiredName)
        if (!candidate.exists()) return candidate

        val dotIndex = desiredName.lastIndexOf('.')
        val baseName = if (dotIndex > 0) desiredName.substring(0, dotIndex) else desiredName
        val extension = if (dotIndex > 0) desiredName.substring(dotIndex) else ""
        var index = 2
        while (candidate.exists()) {
            candidate = File(parent, "$baseName ($index)$extension")
            index++
        }
        return candidate
    }

    private fun uniqueName(desiredName: String, existingNames: Set<String>): String {
        if (!existingNames.contains(desiredName)) return desiredName
        val dotIndex = desiredName.lastIndexOf('.')
        val baseName = if (dotIndex > 0) desiredName.substring(0, dotIndex) else desiredName
        val extension = if (dotIndex > 0) desiredName.substring(dotIndex) else ""
        var index = 2
        var candidate = "$baseName ($index)$extension"
        while (existingNames.contains(candidate)) {
            index++
            candidate = "$baseName ($index)$extension"
        }
        return candidate
    }

    private fun detectMimeType(file: File): String {
        if (file.isDirectory) return DocumentsContract.Document.MIME_TYPE_DIR
        val extension = file.extension.lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            ?: "application/octet-stream"
    }

    private fun resolveFreeBytes(root: SelectedRoot): Long? = when (root.sourceType) {
        SourceType.FILE_SYSTEM -> runCatching { File(root.rootDocumentId).usableSpace }.getOrNull()
        SourceType.TREE -> null
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

    private fun findFileSystemFolderPath(rootFolder: File, targetNames: Set<String>): List<FolderHandle>? {
        if (!rootFolder.exists() || !rootFolder.isDirectory) return null
        val rootHandle = FolderHandle(
            documentId = rootFolder.absolutePath,
            name = rootFolder.name.ifBlank { "Device storage" }
        )
        val stack = ArrayDeque<Pair<File, List<FolderHandle>>>()
        stack.add(rootFolder to listOf(rootHandle))
        while (stack.isNotEmpty()) {
            val (folder, path) = stack.removeLast()
            val children = folder.listFiles().orEmpty()
                .filter { it.isDirectory && it.name != trashFolderName }
                .sortedBy { it.name.lowercase() }
            for (child in children) {
                val childPath = path + FolderHandle(child.absolutePath, child.name)
                if (targetNames.contains(child.name.lowercase())) {
                    return childPath
                }
                if (shouldTraverseDirectory(
                        root = SelectedRoot(
                            treeUri = rootFolder.absolutePath,
                            rootDocumentId = rootFolder.absolutePath,
                            displayName = rootFolder.name.ifBlank { "Device storage" },
                            sourceType = SourceType.FILE_SYSTEM,
                            selectedAt = 0L
                        ),
                        item = FileItem(
                            documentId = child.absolutePath,
                            parentDocumentId = folder.absolutePath,
                            name = child.name,
                            mimeType = DocumentsContract.Document.MIME_TYPE_DIR,
                            sizeBytes = null,
                            lastModified = child.lastModified(),
                            kind = FileKind.DIRECTORY,
                            isDirectory = true,
                            canWrite = child.canWrite(),
                            canDelete = child.parentFile?.canWrite() ?: child.canWrite(),
                            canRename = child.parentFile?.canWrite() ?: child.canWrite()
                        )
                    )
                ) {
                    stack.add(child to childPath)
                }
            }
        }
        return null
    }

    private fun findTreeFolderPath(root: SelectedRoot, targetNames: Set<String>): List<FolderHandle>? {
        val rootHandle = getFolderHandle(root, root.rootDocumentId)
            ?: FolderHandle(root.rootDocumentId, root.displayName)
        val stack = ArrayDeque<Pair<FolderHandle, List<FolderHandle>>>()
        stack.add(rootHandle to listOf(rootHandle))
        while (stack.isNotEmpty()) {
            val (folder, path) = stack.removeLast()
            val children = listTreeChildren(root, folder.documentId).filter(FileItem::isDirectory)
            for (child in children) {
                val childHandle = FolderHandle(child.documentId, child.name)
                val childPath = path + childHandle
                if (targetNames.contains(child.name.lowercase())) {
                    return childPath
                }
                stack.add(childHandle to childPath)
            }
        }
        return null
    }
}

private fun android.database.Cursor.getLongOrNull(index: Int): Long? =
    if (isNull(index)) null else getLong(index)
