package com.omnia.organizer.core.domain.model

enum class ContentType { PLAIN, MARKDOWN, HTML, URL }

data class Content(
    val type: ContentType = ContentType.PLAIN,
    val text: String = "",
    val extra: String? = null // optional: e.g., URL, path
)

data class Tag(
    val id: Long? = null,
    val name: String
)

data class Folder(
    val id: Long? = null,
    val name: String,
    val parentId: Long? = null
)

data class Attachment(
    val id: Long? = null,
    val itemId: Long,
    val name: String,
    val path: String,
    val mimeType: String? = null,
    val sizeBytes: Long? = null
)

data class Item(
    val id: Long? = null,
    val title: String,
    val content: Content? = null,
    val folderId: Long? = null,
    val isArchived: Boolean = false,
    val isPinned: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long,
    val tagIds: List<Long> = emptyList()
)

data class Task(
    val id: Long? = null,
    val itemId: Long? = null, // task may be linked to an item
    val title: String,
    val notes: String? = null,
    val dueAt: Long? = null,
    val completed: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long
)
