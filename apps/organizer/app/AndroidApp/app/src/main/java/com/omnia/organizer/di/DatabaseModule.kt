package com.omnia.organizer.di

import android.content.Context
import com.omnia.organizer.core.data.db.OmniaDatabase
import com.omnia.organizer.core.data.repo.FolderRepositoryImpl
import com.omnia.organizer.core.data.repo.ItemRepositoryImpl
import com.omnia.organizer.core.data.repo.SearchRepositoryImpl
import com.omnia.organizer.core.data.repo.TagRepositoryImpl
import com.omnia.organizer.core.data.repo.TaskRepositoryImpl
import com.omnia.organizer.core.domain.repository.FolderRepository
import com.omnia.organizer.core.domain.repository.ItemRepository
import com.omnia.organizer.core.domain.repository.SearchRepository
import com.omnia.organizer.core.domain.repository.TagRepository
import com.omnia.organizer.core.domain.repository.TaskRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): OmniaDatabase = OmniaDatabase.get(context)

    @Provides
    @Singleton
    fun provideItemRepository(db: OmniaDatabase): ItemRepository = ItemRepositoryImpl(db)

    @Provides
    @Singleton
    fun provideTagRepository(db: OmniaDatabase): TagRepository = TagRepositoryImpl(db)

    @Provides
    @Singleton
    fun provideFolderRepository(db: OmniaDatabase): FolderRepository = FolderRepositoryImpl(db)

    @Provides
    @Singleton
    fun provideTaskRepository(db: OmniaDatabase): TaskRepository = TaskRepositoryImpl(db)

    @Provides
    @Singleton
    fun provideSearchRepository(db: OmniaDatabase): SearchRepository = SearchRepositoryImpl(db)
}