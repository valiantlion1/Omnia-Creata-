package com.omniapixels.android.data.repository

import com.omniapixels.android.data.api.JobsApi
import com.omniapixels.android.data.api.JobResponse
import javax.inject.Inject

class JobsRepository @Inject constructor(private val api: JobsApi) {
    suspend fun createJob(inputKey: String): Result<JobResponse> {
        return try {
            val resp = api.createJob(com.omniapixels.android.data.api.CreateJobRequest(inputKey))
            Result.success(resp)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    // Diğer metotlar: getJob, getResult
}
