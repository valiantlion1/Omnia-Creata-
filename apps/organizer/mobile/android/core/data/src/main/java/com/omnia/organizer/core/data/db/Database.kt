package com.omnia.organizer.core.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [SelectedRootEntity::class, TrashEntryEntity::class],
    version = 3,
    exportSchema = false
)
abstract class OmniaDatabase : RoomDatabase() {
    abstract fun selectedRootDao(): SelectedRootDao
    abstract fun trashDao(): TrashDao

    companion object {
        @Volatile
        private var INSTANCE: OmniaDatabase? = null

        fun get(context: Context): OmniaDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                OmniaDatabase::class.java,
                "oofm.db"
            ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
        }
    }
}
