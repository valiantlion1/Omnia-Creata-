# Flutter ProGuard Rules for OmniaPixels

# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Dio / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Image Picker
-keep class io.flutter.plugins.imagepicker.** { *; }

# Share Plus
-keep class dev.fluttercommunity.plus.share.** { *; }

# Google Fonts
-keep class com.google.** { *; }

# Prevent obfuscation of model classes used with JSON
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# General Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
