package com.omniapixels.android.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DebugScreen(rawJson: String) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Debug (DEV)", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        Text(rawJson, style = MaterialTheme.typography.bodySmall)
        Button(onClick = { /* TODO: cURL kopyala */ }) {
            Text("cURL Kopyala")
        }
    }
}
