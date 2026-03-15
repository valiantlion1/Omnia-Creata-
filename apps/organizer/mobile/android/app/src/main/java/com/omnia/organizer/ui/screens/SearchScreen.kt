package com.omnia.organizer.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.omnia.organizer.ui.theme.OmniaTheme

@Composable
fun SearchScreen(modifier: Modifier = Modifier) {
    val (query, setQuery) = remember { mutableStateOf("") }
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        OutlinedTextField(value = query, onValueChange = setQuery, label = { Text("Ara") })
    }
}

@Preview(showBackground = true, name = "Search")
@Composable
private fun SearchScreenPreview() {
    OmniaTheme { SearchScreen(Modifier) }
}