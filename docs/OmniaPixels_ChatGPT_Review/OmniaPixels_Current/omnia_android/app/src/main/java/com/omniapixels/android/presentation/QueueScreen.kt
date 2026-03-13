package com.omniapixels.android.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun QueueScreen(jobs: List<JobUiModel>) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Aktif İşler", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        jobs.forEach { job ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Column(Modifier.padding(8.dp)) {
                    Text("Durum: ${job.status}")
                    LinearProgressIndicator(progress = job.progress)
                    Text("ETA: ${job.etaSeconds}s")
                }
            }
        }
    }
}

// UI Model
 data class JobUiModel(val status: String, val progress: Float, val etaSeconds: Int)
