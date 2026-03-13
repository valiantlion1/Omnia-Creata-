package com.omnia.organizer.core.data.db

import androidx.room.*

@Dao
interface ItemDao {
    @Upsert
    suspend fun upsert(entity: ItemEntity): Long

    @Query("SELECT * FROM items WHERE id = :id")
    suspend fun getById(id: Long): ItemEntity?

    @Query("SELECT * FROM items ORDER BY updatedAt DESC")
    suspend fun getAll(): List<ItemEntity>

    @Query("DELETE FROM items WHERE id = :id")
    suspend fun delete(id: Long)

    @Query(
        "SELECT items.* FROM items JOIN itemsFts ON items.id = itemsFts.rowid " +
        "WHERE itemsFts MATCH :query ORDER BY items.updatedAt DESC LIMIT :limit"
    )
    suspend fun searchFts(query: String, limit: Int): List<ItemEntity>
}

@Dao
interface TagDao {
    @Upsert
    suspend fun upsert(tag: TagEntity): Long

    @Query("SELECT * FROM tags ORDER BY name ASC")
    suspend fun getAll(): List<TagEntity>
}

@Dao
interface FolderDao {
    @Upsert
    suspend fun upsert(folder: FolderEntity): Long

    @Query("SELECT * FROM folders ORDER BY name ASC")
    suspend fun getAll(): List<FolderEntity>
}

@Dao
interface TaskDao {
    @Upsert
    suspend fun upsert(task: TaskEntity): Long

    @Query("SELECT * FROM tasks WHERE completed = 0 ORDER BY dueAt IS NULL, dueAt ASC")
    suspend fun getPending(): List<TaskEntity>

    @Query("DELETE FROM tasks WHERE id = :id")
    suspend fun delete(id: Long)
}