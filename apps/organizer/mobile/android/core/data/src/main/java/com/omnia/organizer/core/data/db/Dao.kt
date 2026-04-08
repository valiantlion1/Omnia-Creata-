package com.omnia.organizer.core.data.db

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface SelectedRootDao {
    @Query("SELECT * FROM selected_root WHERE singletonId = 1")
    fun observe(): Flow<SelectedRootEntity?>

    @Query("SELECT * FROM selected_root WHERE singletonId = 1")
    suspend fun get(): SelectedRootEntity?

    @Upsert
    suspend fun upsert(entity: SelectedRootEntity)

    @Query("DELETE FROM selected_root")
    suspend fun clear()
}

@Dao
interface TrashDao {
    @Query("SELECT * FROM trash_entries ORDER BY deletedAt DESC")
    fun observeAll(): Flow<List<TrashEntryEntity>>

    @Query("SELECT * FROM trash_entries WHERE id = :id")
    suspend fun getById(id: Long): TrashEntryEntity?

    @Upsert
    suspend fun upsert(entity: TrashEntryEntity): Long

    @Query("DELETE FROM trash_entries WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM trash_entries")
    suspend fun clear()
}
