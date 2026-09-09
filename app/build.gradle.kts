plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android { namespace = "nl.sebastiaanvogels.sonosmp3player"; compileSdk = 35
    defaultConfig { applicationId = "nl.sebastiaanvogels.sonosmp3player"; minSdk = 23; targetSdk = 35; versionCode = 1; versionName = "1.0" }
}

kotlin { jvmToolchain(17) }
