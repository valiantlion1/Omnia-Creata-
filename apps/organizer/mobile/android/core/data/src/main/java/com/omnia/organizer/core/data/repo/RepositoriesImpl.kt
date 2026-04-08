package com.omnia.organizer.core.data.repo

import com.omnia.organizer.core.data.db.OmniaDatabase
import com.omnia.organizer.core.data.db.SelectedRootEntity
import com.omnia.organizer.core.data.db.TrashEntryEntity
import com.omnia.organizer.core.domain.model.SourceType
import com.omnia.organizer.core.domain.model.SelectedRoot
import com.omnia.organizer.core.domain.model.TrashEntry
import com.omnia.organizer.core.domain.repository.SelectedRootRepository
import com.omnia.organizer.core.domain.repository.TrashRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SelectedRootRepositoryImpl(private val db: OmniaDatabase) : SelectedRootRepository {
    override fun observe(): Flow<SelectedRoot?> = db.selectedRootDao().observe().map { it?.toDomain() }

    override suspend fun get(): SelectedRoot? = db.selectedRootDao().get()?.toDomain()

    override suspend fun save(root: SelectedRoot) {
        db.selectedRootDao().upsert(root.toEntity())
    }

    override suspend fun clear() {
        db.selectedRootDao().clear()
    }
}

class TrashRepositoryImpl(private val db: OmniaDatabase) : TrashRepository {
    override fun observeAll(): Flow<List<TrashEntry>> = db.trashDao().observeAll().map { entries ->
        entries.map { it.toDomain() }
    }

    override suspend fun getById(id: Long): TrashEntry? = db.trashDao().getById(id)?.toDomain()

    override suspend fun upsert(entry: TrashEntry): Long = db.trashDao().upsert(entry.toEntity())

    override suspend fun delete(id: Long) {
        db.trashDao().delete(id)
    }

    override suspend fun clear() {
        db.trashDao().clear()
    }
}

private fun SelectedRootEntity.toDomain(): SelectedRoot = SelectedRoot(
    treeUri = treeUri,
    rootDocumentId = rootDocumentId,
    displayName = displayName,
    sourceType = SourceType.valueOf(sourceType),
    selectedAt = selectedAt
)

private fun SelectedRoot.toEntity(): SelectedRootEntity = SelectedRootEntity(
    treeUri = treeUri,
    rootDocumentId = rootDocumentId,
    displayName = displayName,
    sourceType = sourceType.name,
    selectedAt = selectedAt
)

private fun TrashEntryEntity.toDomain(): TrashEntry = TrashEntry(
    id = id,
    treeUri = treeUri,
    sourceType = SourceType.valueOf(sourceType),
    originalParentDocumentId = originalParentDocumentId,
    trashedDocumentId = trashedDocumentId,
    displayName = displayName,
    mimeType = mimeType,
    sizeBytes = sizeBytes,
    deletedAt = deletedAt
)

private fun TrashEntry.toEntity(): TrashEntryEntity = TrashEntryEntity(
    id = id,
    treeUri = treeUri,
    sourceType = sourceType.name,
    originalParentDocumentId = originalParentDocumentId,
    trashedDocumentId = trashedDocumentId,
    displayName = displayName,
    mimeType = mimeType,
    sizeBytes = sizeBytes,
    deletedAt = deletedAt
)
