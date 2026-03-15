package com.omniapixels.android.presentation

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class UploadViewModel : ViewModel() {
    var selectedImage: String? = null
    var isUploading by mutableStateOf(false)
    var uploadProgress by mutableStateOf(0f)
    var errorMessage by mutableStateOf<String?>(null)

    fun selectImage() {
        // TODO: Storage Access Framework ile resim seç
    }
    fun uploadImage() {
        isUploading = true
        uploadProgress = 0.1f
        // TODO: /v1/uploads/init → presigned PUT → job create
        // Dummy progress
        CoroutineScope(Dispatchers.IO).launch {
            for (i in 1..10) {
                kotlinx.coroutines.delay(200)
                uploadProgress = i / 10f
            }
            isUploading = false
        }
    }
}
