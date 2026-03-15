package com.omniapixels.android.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF673AB7),
    secondary = Color(0xFF9C27B0),
    tertiary = Color(0xFF3F51B5)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF673AB7),
    secondary = Color(0xFF9C27B0),
    tertiary = Color(0xFF3F51B5)
)

@Composable
fun OmniaPixelsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
