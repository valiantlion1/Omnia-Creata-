package com.omniapixels.android.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

@Composable
fun OmniaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme(),
        typography = Typography(),
        content = content
    )
}
// TODO: spacing scale, custom typography
