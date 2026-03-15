package com.omniapixels.android.data.api

import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Body

interface JobsApi {
    @POST("v1/jobs")
    suspend fun createJob(@Body body: CreateJobRequest): JobResponse

    @GET("v1/jobs/{id}")
    suspend fun getJob(@Path("id") id: String): JobResponse

    @GET("v1/jobs/{id}/result")
    suspend fun getResult(@Path("id") id: String): ResultResponse
}

// DTO örnekleri
 data class CreateJobRequest(val inputKey: String)
 data class JobResponse(val jobId: String, val status: String, val progress: Float, val etaSeconds: Int, val logs: List<String>)
 data class ResultResponse(val outputs: List<String>)
