package com.omnia.organizer.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddLink
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.NoteAdd
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.omnia.organizer.ui.theme.OmniaTheme

@Composable
fun CaptureScreen(modifier: Modifier = Modifier) {
    val actions = listOf(
        Triple("Metin Notu", "Hızlı not ekle", Icons.Default.NoteAdd),
        Triple("Fotoğraf", "Kamera veya galeriden", Icons.Default.CameraAlt),
        Triple("Ses Notu", "Mikrofonla kaydet", Icons.Default.Audiotrack),
        Triple("Bağlantı", "URL ekle", Icons.Default.AddLink)
    )

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Text("Yakalama", style = MaterialTheme.typography.titleLarge)
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(top = 8.dp),
            contentPadding = PaddingValues(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(actions) { (title, subtitle, icon) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    ListItem(
                        headlineContent = { Text(title) },
                        supportingContent = { Text(subtitle) },
                        leadingContent = { Icon(icon, contentDescription = title) }
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, name = "Capture")
@Composable
private fun CaptureScreenPreview() {
    OmniaTheme { CaptureScreen(Modifier) }
}