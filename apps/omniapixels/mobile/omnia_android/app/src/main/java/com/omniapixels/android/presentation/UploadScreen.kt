package com.omniapixels.android.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun UploadScreen(viewModel: UploadViewModel = viewModel()) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("Resim Seç ve Yükle", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        Button(onClick = { viewModel.selectImage() }) {
            Text("Resim Seç")
        }
        Spacer(Modifier.height(16.dp))
        Button(onClick = { viewModel.uploadImage() }, enabled = viewModel.selectedImage != null) {
            Text("Yükle")
        }
        Spacer(Modifier.height(16.dp))
        if (viewModel.isUploading) {
            LinearProgressIndicator(progress = viewModel.uploadProgress)
        }
        if (viewModel.errorMessage != null) {
            Text(viewModel.errorMessage!!, color = MaterialTheme.colorScheme.error)
        }
    }
}
