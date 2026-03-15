pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "OmniaOrganizer"
include(":app")
include(":core:domain")
include(":core:data")
include(":core:ui")
include(":core:design")
include(":feature:capture")
include(":feature:library")
include(":feature:search")
include(":feature:tasks")
include(":feature:settings")
