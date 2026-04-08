package com.omnia.organizer.core.domain.repository

import com.omnia.organizer.core.domain.model.SelectedRoot
import com.omnia.organizer.core.domain.model.TrashEntry
import kotlinx.coroutines.flow.Flow

interface SelectedRootRepository {
    fun observe(): Flow<SelectedRoot?>
    suspend fun get(): SelectedRoot?
    suspend fun save(root: SelectedRoot)
    suspend fun clear()
}

interface TrashRepository {
    fun observeAll(): Flow<List<TrashEntry>>
    suspend fun getById(id: Long): TrashEntry?
    suspend fun upsert(entry: TrashEntry): Long
    suspend fun delete(id: Long)
    suspend fun clear()
}
