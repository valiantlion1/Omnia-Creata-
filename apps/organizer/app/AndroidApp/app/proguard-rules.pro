# Hilt/Dagger keep
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.internal.componenttreedeps.ComponentTreeDeps
-keep class **_HiltModules.** { *; }
-keep class * extends android.app.Application { *; }

# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**