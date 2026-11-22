plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.maibrowser"
    compileSdk = 34

    java {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(17))
        }
    }

    defaultConfig {
        applicationId = "com.maibrowser"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "0.1.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk {
            abiFilters.addAll(listOf("armeabi-v7a", "arm64-v8a"))
        }
        buildTypes {
            release {
                isMinifyEnabled = false
                proguardFiles(
                    getDefaultProguardFile("proguard-android-optimize.txt"),
                    "proguard-rules.pro",
                )
            }
        }

        compileOptions {
            sourceCompatibility = JavaVersion.VERSION_17
            targetCompatibility = JavaVersion.VERSION_17
        }
        kotlinOptions {
            jvmTarget = "17"
        }

        // Default integrate assets from dist; switch to native assets when env is set
        val useNativeAssets =
            System.getenv("SPARKLING_USE_NATIVE_ASSETS")?.equals("true", ignoreCase = true) ?: false
        sourceSets {
            getByName("main").apply {
                if (useNativeAssets) {
                    // Use native assets directory (used in --copy mode)
                    assets.setSrcDirs(listOf("src/main/assets"))
                } else {
                    // Default: use dist directly; no copy required
                    assets.setSrcDirs(listOf("../../dist"))
                }
            }
        }
    }

    dependencies {
        implementation(libs.androidx.core.ktx)
        implementation(libs.androidx.appcompat)
        testImplementation(libs.junit)
        androidTestImplementation(libs.androidx.junit)
        androidTestImplementation(libs.androidx.espresso.core)

        implementation("com.tiktok.sparkling:sparkling:2.0.1")
        implementation("org.lynxsdk.lynx:lynx:4.2.0")
        implementation("org.lynxsdk.lynx:primjs:4.2.1")
        implementation("org.lynxsdk.lynx:lynx-service-devtool:4.2.0")
        implementation("org.lynxsdk.lynx:lynx-devtool:4.2.0")
        implementation("org.lynxsdk.lynx:xelement-webview:4.2.0")
        implementation("com.tiktok.sparkling:sparkling-method:2.0.1")
        implementation("com.squareup.okhttp3:okhttp:4.9.0")

        implementation(libs.fresco)
        implementation(libs.fresco.animated.gif)
        implementation(libs.fresco.animated.webp)
        implementation(libs.fresco.webp.support)
        implementation(libs.fresco.animated.base)

    kapt(libs.lynx.processor)

        // BEGIN SPARKLING AUTOLINK
        listOf(
            project(":sparkling-navigation")
        ).forEach { dep -> add("implementation", dep) }
        // END SPARKLING AUTOLINK
    }
}
