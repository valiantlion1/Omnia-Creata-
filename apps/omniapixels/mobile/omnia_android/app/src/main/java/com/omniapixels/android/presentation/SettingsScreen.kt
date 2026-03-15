package com.omniapixels.android.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SettingsScreen() {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Ayarlar", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        // TODO: kalite/preset seçimi
        // TODO: telemetry opt-in/out
        // TODO: cache temizleme
    }
}
