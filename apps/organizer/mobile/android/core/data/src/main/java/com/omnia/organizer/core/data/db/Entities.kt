package com.omnia.organizer.core.data.db

import androidx.room.*

@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val contentText: String?,
    val folderId: Long?,
    val isArchived: Boolean,
    val isPinned: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(
    tableName = "tags",
    indices = [Index(value = ["name"], unique = true)]
)
data class TagEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String
)

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val parentId: Long?
)

@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val itemId: Long?,
    val title: String,
    val notes: String?,
    val dueAt: Long?,
    val completed: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(primaryKeys = ["itemId", "tagId"], tableName = "item_tag")
data class ItemTagCrossRef(
    val itemId: Long,
    val tagId: Long
)