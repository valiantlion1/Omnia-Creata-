package com.omnia.organizer.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview
import com.omnia.organizer.ui.theme.OmniaTheme

@Composable
fun SettingsScreen(modifier: Modifier = Modifier) {
    val (dynamicColors, setDynamicColors) = remember { mutableStateOf(true) }
    Column(modifier = modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Ayarlar", style = MaterialTheme.typography.titleLarge)
        Text("Dinamik Renkler (Android 12+)")
        Switch(checked = dynamicColors, onCheckedChange = setDynamicColors)
    }
}

@Preview(showBackground = true, name = "Settings")
@Composable
private fun SettingsScreenPreview() {
    OmniaTheme { SettingsScreen(Modifier) }
}