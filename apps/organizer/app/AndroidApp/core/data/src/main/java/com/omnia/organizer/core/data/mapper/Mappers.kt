package com.omnia.organizer.core.data.mapper

import com.omnia.organizer.core.data.db.*
import com.omnia.organizer.core.domain.model.*

fun ItemEntity.toDomain(tagIds: List<Long> = emptyList()) = Item(
    id = id,
    title = title,
    content = contentText?.let { Content(type = ContentType.PLAIN, text = it) },
    folderId = folderId,
    isArchived = isArchived,
    isPinned = isPinned,
    createdAt = createdAt,
    updatedAt = updatedAt,
    tagIds = tagIds
)

fun Item.toEntity() = ItemEntity(
    id = id ?: 0,
    title = title,
    contentText = content?.text,
    folderId = folderId,
    isArchived = isArchived,
    isPinned = isPinned,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun TagEntity.toDomain() = Tag(id = id, name = name)
fun Tag.toEntity() = TagEntity(id = id ?: 0, name = name)

fun FolderEntity.toDomain() = Folder(id = id, name = name, parentId = parentId)
fun Folder.toEntity() = FolderEntity(id = id ?: 0, name = name, parentId = parentId)

fun TaskEntity.toDomain() = Task(id = id, itemId = itemId, title = title, notes = notes, dueAt = dueAt, completed = completed, createdAt = createdAt, updatedAt = updatedAt)
fun Task.toEntity() = TaskEntity(id = id ?: 0, itemId = itemId, title = title, notes = notes, dueAt = dueAt, completed = completed, createdAt = createdAt, updatedAt = updatedAt)