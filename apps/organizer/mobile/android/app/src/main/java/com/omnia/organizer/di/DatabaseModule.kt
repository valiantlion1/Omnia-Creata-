package com.omnia.organizer.di

import android.content.Context
import com.omnia.organizer.core.data.db.OmniaDatabase
import com.omnia.organizer.core.data.repo.SelectedRootRepositoryImpl
import com.omnia.organizer.core.data.repo.TrashRepositoryImpl
import com.omnia.organizer.core.domain.repository.SelectedRootRepository
import com.omnia.organizer.core.domain.repository.TrashRepository
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
    fun provideSelectedRootRepository(db: OmniaDatabase): SelectedRootRepository = SelectedRootRepositoryImpl(db)

    @Provides
    @Singleton
    fun provideTrashRepository(db: OmniaDatabase): TrashRepository = TrashRepositoryImpl(db)
}
