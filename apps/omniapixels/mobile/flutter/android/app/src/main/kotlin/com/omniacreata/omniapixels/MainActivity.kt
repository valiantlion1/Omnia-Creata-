package com.omniacreata.omniapixels

import android.content.ContentUris
import android.content.ContentResolver
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Size
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.util.LinkedHashMap
import kotlin.concurrent.thread

class MainActivity : FlutterActivity() {
    private val channelName = "com.omniacreata.omniapixels/native_gallery"
    private val thumbnailCacheLock = Any()
    private val thumbnailCache =
        object : LinkedHashMap<String, ByteArray>(maxThumbnailCacheEntries, 0.75f, true) {
            override fun removeEldestEntry(
                eldest: MutableMap.MutableEntry<String, ByteArray>?,
            ): Boolean {
                return size > maxThumbnailCacheEntries
            }
        }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            channelName,
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "getLibrarySnapshot" -> {
                    val limit = call.argument<Int>("limit") ?: 90
                    thread(name = "omnia-native-gallery-snapshot") {
                        val response = getLibrarySnapshot(limit.coerceIn(1, 240))
                        runOnUiThread { result.success(response) }
                    }
                }

                "getRecentImagesPage" -> {
                    val page = call.argument<Int>("page") ?: 0
                    val size = call.argument<Int>("size") ?: 60
                    thread(name = "omnia-native-gallery-page") {
                        val response = getRecentImagesPage(
                            page = page.coerceAtLeast(0),
                            size = size.coerceIn(24, 120),
                        )
                        runOnUiThread { result.success(response) }
                    }
                }

                "loadThumbnail" -> {
                    val mediaId = call.argument<String>("mediaId")
                    val size = call.argument<Int>("size") ?: 192
                    val quality = call.argument<Int>("quality") ?: 72
                    if (mediaId.isNullOrBlank()) {
                        result.success(null)
                        return@setMethodCallHandler
                    }
                    thread(name = "omnia-native-thumbnail") {
                        val bytes = loadThumbnailBytes(
                            mediaId = mediaId,
                            size = size.coerceIn(96, 2048),
                            quality = quality.coerceIn(40, 90),
                        )
                        runOnUiThread { result.success(bytes) }
                    }
                }

                "prefetchThumbnails" -> {
                    val mediaIds = call.argument<List<String>>("mediaIds") ?: emptyList()
                    val size = call.argument<Int>("size") ?: 256
                    val quality = call.argument<Int>("quality") ?: 70
                    thread(name = "omnia-native-thumbnail-prefetch") {
                        val response = prefetchThumbnails(
                            mediaIds = mediaIds,
                            size = size.coerceIn(96, 512),
                            quality = quality.coerceIn(40, 90),
                        )
                        runOnUiThread { result.success(response) }
                    }
                }

                "clearThumbnailCache" -> {
                    val startedAt = System.nanoTime()
                    val cleared = clearThumbnailCache()
                    result.success(
                        mapOf(
                            "warmed" to cleared,
                            "cacheCount" to currentThumbnailCacheCount(),
                            "elapsedMs" to elapsedMs(startedAt),
                        )
                    )
                }

                "loadOriginalBytes" -> {
                    val mediaId = call.argument<String>("mediaId")
                    if (mediaId.isNullOrBlank()) {
                        result.success(null)
                        return@setMethodCallHandler
                    }
                    thread(name = "omnia-native-original") {
                        val bytes = loadOriginalBytes(mediaId)
                        runOnUiThread { result.success(bytes) }
                    }
                }

                else -> result.notImplemented()
            }
        }
    }

    private fun getLibrarySnapshot(limit: Int): Map<String, Any?> {
        val startedAt = System.nanoTime()
        return try {
            val sampleCount = queryRecentImageSample(limit)
            val totalCount = queryImageCount()
            mapOf(
                "available" to true,
                "totalCount" to totalCount,
                "sampleCount" to sampleCount,
                "elapsedMs" to elapsedMs(startedAt),
            )
        } catch (error: Throwable) {
            mapOf(
                "available" to false,
                "totalCount" to 0,
                "sampleCount" to 0,
                "elapsedMs" to elapsedMs(startedAt),
                "error" to (error.message ?: error.javaClass.simpleName),
            )
        }
    }

    private fun getRecentImagesPage(page: Int, size: Int): Map<String, Any?> {
        val startedAt = System.nanoTime()
        return try {
            val totalCount = queryImageCount()
            val assets = queryRecentImagesPage(page = page, size = size)
            mapOf(
                "available" to true,
                "totalCount" to totalCount,
                "page" to page,
                "pageSize" to size,
                "assets" to assets,
                "elapsedMs" to elapsedMs(startedAt),
            )
        } catch (error: Throwable) {
            mapOf(
                "available" to false,
                "totalCount" to 0,
                "page" to page,
                "pageSize" to size,
                "assets" to emptyList<Map<String, Any?>>(),
                "elapsedMs" to elapsedMs(startedAt),
                "error" to (error.message ?: error.javaClass.simpleName),
            )
        }
    }

    private fun queryImageCount(): Int {
        val projection = arrayOf(MediaStore.Images.Media._ID)
        contentResolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection,
            null,
            null,
            null,
        ).use { cursor ->
            return cursor?.count ?: 0
        }
    }

    private fun queryRecentImageSample(limit: Int): Int {
        val projection = arrayOf(MediaStore.Images.Media._ID)
        val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val args = Bundle().apply {
                putStringArray(
                    ContentResolver.QUERY_ARG_SORT_COLUMNS,
                    arrayOf(MediaStore.Images.Media.DATE_ADDED),
                )
                putInt(
                    ContentResolver.QUERY_ARG_SORT_DIRECTION,
                    ContentResolver.QUERY_SORT_DIRECTION_DESCENDING,
                )
                putInt(ContentResolver.QUERY_ARG_LIMIT, limit)
            }
            contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                args,
                null,
            )
        } else {
            @Suppress("DEPRECATION")
            contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                "${MediaStore.Images.Media.DATE_ADDED} DESC LIMIT $limit",
            )
        }
        cursor.use {
            return it?.count ?: 0
        }
    }

    private fun queryRecentImagesPage(
        page: Int,
        size: Int,
    ): List<Map<String, Any?>> {
        val offset = page * size
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.MIME_TYPE,
        )
        val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val args = Bundle().apply {
                putStringArray(
                    ContentResolver.QUERY_ARG_SORT_COLUMNS,
                    arrayOf(MediaStore.Images.Media.DATE_ADDED),
                )
                putInt(
                    ContentResolver.QUERY_ARG_SORT_DIRECTION,
                    ContentResolver.QUERY_SORT_DIRECTION_DESCENDING,
                )
                putInt(ContentResolver.QUERY_ARG_LIMIT, size)
                putInt(ContentResolver.QUERY_ARG_OFFSET, offset)
            }
            contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                args,
                null,
            )
        } else {
            @Suppress("DEPRECATION")
            contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                "${MediaStore.Images.Media.DATE_ADDED} DESC LIMIT $size OFFSET $offset",
            )
        }

        cursor.use {
            if (it == null) {
                return emptyList()
            }
            val idColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
            val nameColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
            val widthColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
            val heightColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)
            val dateColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
            val mimeColumn = it.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
            val assets = ArrayList<Map<String, Any?>>(it.count)
            while (it.moveToNext()) {
                assets.add(
                    mapOf(
                        "id" to it.getLong(idColumn).toString(),
                        "displayName" to (it.getString(nameColumn) ?: "Photo"),
                        "width" to it.getInt(widthColumn),
                        "height" to it.getInt(heightColumn),
                        "dateAddedMs" to it.getLong(dateColumn) * 1000L,
                        "mimeType" to (it.getString(mimeColumn) ?: "image/*"),
                    )
                )
            }
            return assets
        }
    }

    private fun loadThumbnailBytes(
        mediaId: String,
        size: Int,
        quality: Int,
    ): ByteArray? {
        if (size > maxCacheableThumbnailSize) {
            return decodeThumbnailBytes(mediaId = mediaId, size = size, quality = quality)
        }
        val key = "$mediaId:$size:$quality"
        synchronized(thumbnailCacheLock) {
            thumbnailCache[key]?.let { return it }
        }
        val bytes = decodeThumbnailBytes(mediaId = mediaId, size = size, quality = quality)
            ?: return null
        synchronized(thumbnailCacheLock) {
            thumbnailCache[key] = bytes
        }
        return bytes
    }

    private fun decodeThumbnailBytes(
        mediaId: String,
        size: Int,
        quality: Int,
    ): ByteArray? {
        val id = mediaId.toLongOrNull() ?: return null
        val uri = ContentUris.withAppendedId(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            id,
        )
        return try {
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentResolver.loadThumbnail(uri, Size(size, size), null)
            } else {
                @Suppress("DEPRECATION")
                MediaStore.Images.Thumbnails.getThumbnail(
                    contentResolver,
                    id,
                    MediaStore.Images.Thumbnails.MINI_KIND,
                    null,
                )
            } ?: return null
            ByteArrayOutputStream().use { output ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
                output.toByteArray()
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun prefetchThumbnails(
        mediaIds: List<String>,
        size: Int,
        quality: Int,
    ): Map<String, Any?> {
        val startedAt = System.nanoTime()
        var warmed = 0
        for (mediaId in mediaIds.take(maxThumbnailPrefetchBatch)) {
            val bytes = loadThumbnailBytes(
                mediaId = mediaId,
                size = size,
                quality = quality,
            )
            if (bytes != null) {
                warmed += 1
            }
        }
        return mapOf(
            "warmed" to warmed,
            "cacheCount" to currentThumbnailCacheCount(),
            "elapsedMs" to elapsedMs(startedAt),
        )
    }

    private fun clearThumbnailCache(): Int {
        synchronized(thumbnailCacheLock) {
            val cleared = thumbnailCache.size
            thumbnailCache.clear()
            return cleared
        }
    }

    private fun currentThumbnailCacheCount(): Int {
        synchronized(thumbnailCacheLock) {
            return thumbnailCache.size
        }
    }

    private fun loadOriginalBytes(mediaId: String): ByteArray? {
        val id = mediaId.toLongOrNull() ?: return null
        val uri = ContentUris.withAppendedId(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            id,
        )
        return try {
            contentResolver.openInputStream(uri)?.use { input ->
                input.readBytes()
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun elapsedMs(startedAt: Long): Int {
        return ((System.nanoTime() - startedAt) / 1_000_000L).toInt()
    }

    companion object {
        private const val maxThumbnailCacheEntries = 240
        private const val maxCacheableThumbnailSize = 512
        private const val maxThumbnailPrefetchBatch = 90
    }
}
