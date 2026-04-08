package com.omnia.organizer.core.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "selected_root")
data class SelectedRootEntity(
    @PrimaryKey val singletonId: Int = 1,
    val treeUri: String,
    val rootDocumentId: String,
    val displayName: String,
    val selectedAt: Long
)

@Entity(tableName = "trash_entries")
data class TrashEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val treeUri: String,
    val originalParentDocumentId: String,
    val trashedDocumentId: String,
    val displayName: String,
    val mimeType: String,
    val sizeBytes: Long?,
    val deletedAt: Long
)
