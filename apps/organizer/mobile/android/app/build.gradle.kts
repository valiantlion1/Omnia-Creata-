plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("kotlin-parcelize")
}

android {
    namespace = "com.omnia.organizer"
    compileSdk = 34

    val versionMajor = project.findProperty("versionMajor")?.toString()?.toInt() ?: 1
    val versionMinor = project.findProperty("versionMinor")?.toString()?.toInt() ?: 0
    val versionPatch = project.findProperty("versionPatch")?.toString()?.toInt() ?: 0
    val preRelease = project.findProperty("preRelease")?.toString()
    val preReleaseNumber = project.findProperty("preReleaseNumber")?.toString()

    val baseVersionName = "$versionMajor.$versionMinor.$versionPatch"
    val isPreRelease = !preRelease.isNullOrBlank()
    val computedVersionName = if (isPreRelease && !preReleaseNumber.isNullOrBlank()) {
        "$baseVersionName-$preRelease$preReleaseNumber"
    } else if (isPreRelease) {
        "$baseVersionName-$preRelease"
    } else {
        baseVersionName
    }

    val preReleaseOrdinal = preReleaseNumber?.toIntOrNull() ?: 0
    val computedVersionCode = versionMajor * 1_000_000 + versionMinor * 10_000 + versionPatch * 100 + if (isPreRelease) {
        preReleaseOrdinal.coerceIn(0, 98)
    } else {
        99
    }

    defaultConfig {
        applicationId = "com.omnia.organizer"
        minSdk = 24
        targetSdk = 34
        versionCode = computedVersionCode
        versionName = computedVersionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        debug {
            buildConfigField("boolean", "ALPHA", "false")
        }
        create("alpha") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".alpha"
            versionNameSuffix = ""
            isDebuggable = true
            matchingFallbacks += listOf("debug")
            resValue("string", "app_name", "Omnia Organizer Alpha")
            buildConfigField("boolean", "ALPHA", "true")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("boolean", "ALPHA", "false")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-compiler:2.51.1")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    implementation(project(":core:ui"))
    implementation(project(":core:design"))
    implementation(project(":core:domain"))
    implementation(project(":core:data"))

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
