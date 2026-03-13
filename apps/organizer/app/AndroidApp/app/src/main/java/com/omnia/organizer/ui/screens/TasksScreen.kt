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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview
import com.omnia.organizer.ui.theme.OmniaTheme

@Composable
fun TasksScreen(modifier: Modifier = Modifier) {
    val tasks = remember { mutableStateListOf("Örnek görev 1", "Örnek görev 2") }
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { tasks.add("Yeni görev") }) { Icon(Icons.Default.Add, contentDescription = "Ekle") }
        }
    ) { padding ->
        Column(modifier = modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text("Görevler", style = MaterialTheme.typography.titleLarge)
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(top = 8.dp),
                contentPadding = PaddingValues(bottom = 88.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tasks) { t ->
                    ListItem(
                        headlineContent = { Text(t) },
                        supportingContent = { Text("Açıklama/son tarih yakında") }
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, name = "Tasks")
@Composable
private fun TasksScreenPreview() {
    OmniaTheme { TasksScreen(Modifier) }
}