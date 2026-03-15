package com.omniapixels.android.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PaywallScreen() {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Pro Özellikler", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        // TODO: Pro faydaları, satın alma akışı (Billing)
        Button(onClick = { /* TODO: Satın Al */ }) {
            Text("Pro Satın Al")
        }
    }
}
