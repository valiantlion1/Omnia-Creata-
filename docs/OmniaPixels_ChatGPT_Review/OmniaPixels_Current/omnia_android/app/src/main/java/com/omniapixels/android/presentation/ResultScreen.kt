package com.omniapixels.android.presentation

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter

@Composable
fun ResultScreen(results: List<String>) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Sonuçlar", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        results.forEach { url ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Column(Modifier.padding(8.dp)) {
                    Image(
                        painter = rememberAsyncImagePainter(url),
                        contentDescription = null,
                        modifier = Modifier.height(120.dp).fillMaxWidth()
                    )
                    Button(onClick = { /* TODO: Tam boyut aç */ }) {
                        Text("Tam Boyut Aç")
                    }
                    Button(onClick = { /* TODO: Kaydet */ }) {
                        Text("Kaydet")
                    }
                    Button(onClick = { /* TODO: Paylaş */ }) {
                        Text("Paylaş")
                    }
                }
            }
        }
    }
}
