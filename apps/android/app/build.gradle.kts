import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Read backend config from local.properties (git-ignored) and expose it via
// BuildConfig. Falls back to the shared project values when unset.
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun cfg(key: String, default: String): String =
    (localProps.getProperty(key) ?: System.getenv(key) ?: default)

android {
    namespace = "ai.plancore.mobile"
    compileSdk = 34

    defaultConfig {
        applicationId = "ai.plancore.mobile"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        buildConfigField("String", "SUPABASE_URL",
            "\"${cfg("SUPABASE_URL", "https://arvesrgqdpsbkxbhiquc.supabase.co")}\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY",
            "\"${cfg("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_GrJD8_3mOTAO3LNPmFfL7Q_DzhaBBhh")}\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)

    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.auth)
    implementation(libs.ktor.client.okhttp)

    testImplementation(libs.junit)
}
