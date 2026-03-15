package com.omnia.organizer.core.data.db

import androidx.room.Entity
import androidx.room.Fts4

@Fts4(contentEntity = ItemEntity::class)
@Entity(tableName = "itemsFts")
data class ItemFts(
    val title: String,
    val contentText: String?
)