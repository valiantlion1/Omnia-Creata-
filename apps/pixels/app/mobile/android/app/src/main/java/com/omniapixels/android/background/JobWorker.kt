package com.omniapixels.android.background

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

class JobWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        // TODO: upload/job polling işleri
        return Result.success()
    }
}
