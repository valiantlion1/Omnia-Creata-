package com.omnia.organizer.core.data.repo

import com.omnia.organizer.core.data.db.*
import com.omnia.organizer.core.data.mapper.*
import com.omnia.organizer.core.domain.model.*
import com.omnia.organizer.core.domain.repository.*

class ItemRepositoryImpl(private val db: OmniaDatabase) : ItemRepository {
    override suspend fun upsert(item: Item): Long = db.itemDao().upsert(item.toEntity())
    override suspend fun getById(id: Long): Item? = db.itemDao().getById(id)?.toDomain()
    override suspend fun getAll(): List<Item> = db.itemDao().getAll().map { it.toDomain() }
    override suspend fun delete(id: Long) = db.itemDao().delete(id)
}

class TagRepositoryImpl(private val db: OmniaDatabase) : TagRepository {
    override suspend fun upsert(tag: Tag): Long = db.tagDao().upsert(tag.toEntity())
    override suspend fun getAll(): List<Tag> = db.tagDao().getAll().map { it.toDomain() }
}

class FolderRepositoryImpl(private val db: OmniaDatabase) : FolderRepository {
    override suspend fun upsert(folder: Folder): Long = db.folderDao().upsert(folder.toEntity())
    override suspend fun getAll(): List<Folder> = db.folderDao().getAll().map { it.toDomain() }
}

class TaskRepositoryImpl(private val db: OmniaDatabase) : TaskRepository {
    override suspend fun upsert(task: Task): Long = db.taskDao().upsert(task.toEntity())
    override suspend fun getPending(): List<Task> = db.taskDao().getPending().map { it.toDomain() }
    override suspend fun delete(id: Long) = db.taskDao().delete(id)
}

class SearchRepositoryImpl(private val db: OmniaDatabase) : SearchRepository {
    override suspend fun search(query: String, limit: Int): List<Item> {
        val built = buildFtsQuery(query)
        if (built.isBlank()) return emptyList()
        return db.itemDao().searchFts(built, limit).map { it.toDomain() }
    }
}

private fun buildFtsQuery(input: String): String {
    val tokens = input.trim()
        .split(Regex("\\s+"))
        .map { it.trim().lowercase() }
        .map { sanitizeFtsToken(it) }
        .filter { it.isNotEmpty() }
    if (tokens.isEmpty()) return ""
    // Prefix search for each token, require all tokens to appear
    return tokens.joinToString(separator = " AND ") { token -> "\"${token}*\"" }
}

private fun sanitizeFtsToken(token: String): String {
    // Remove/replace characters that have special meaning in FTS queries
    // e.g., quotes, wildcard, boolean operators/parentheses
    val removed = token.replace(Regex("[\"'`*^~()<>]"), "")
        .replace(Regex("OR|AND|NOT", RegexOption.IGNORE_CASE), "")
        .trim()
    // Limit token length to avoid pathological queries
    return if (removed.length > 64) removed.substring(0, 64) else removed
}