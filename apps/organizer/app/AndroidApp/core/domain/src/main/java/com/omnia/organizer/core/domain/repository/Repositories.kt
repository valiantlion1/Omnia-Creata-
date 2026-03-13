package com.omnia.organizer.core.domain.repository

import com.omnia.organizer.core.domain.model.*

interface ItemRepository {
    suspend fun upsert(item: Item): Long
    suspend fun getById(id: Long): Item?
    suspend fun getAll(): List<Item>
    suspend fun delete(id: Long)
}

interface TagRepository {
    suspend fun upsert(tag: Tag): Long
    suspend fun getAll(): List<Tag>
}

interface FolderRepository {
    suspend fun upsert(folder: Folder): Long
    suspend fun getAll(): List<Folder>
}

interface TaskRepository {
    suspend fun upsert(task: Task): Long
    suspend fun getPending(): List<Task>
    suspend fun delete(id: Long)
}

interface SearchRepository {
    suspend fun search(query: String, limit: Int = 50): List<Item>
}
