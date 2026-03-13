package com.omnia.organizer.core.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [ItemEntity::class, TagEntity::class, FolderEntity::class, TaskEntity::class, ItemTagCrossRef::class, ItemFts::class],
    version = 2,
    exportSchema = false
)
abstract class OmniaDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun tagDao(): TagDao
    abstract fun folderDao(): FolderDao
    abstract fun taskDao(): TaskDao

    companion object {
        @Volatile private var INSTANCE: OmniaDatabase? = null
        fun get(context: Context): OmniaDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                OmniaDatabase::class.java,
                "omnia.db"
            ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
        }
    }
}