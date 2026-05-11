import 'package:flutter/services.dart';

class NativeGallerySnapshot {
  const NativeGallerySnapshot({
    required this.available,
    required this.totalCount,
    required this.sampleCount,
    required this.elapsedMs,
    this.error,
  });

  factory NativeGallerySnapshot.fromMap(Map<Object?, Object?> map) {
    return NativeGallerySnapshot(
      available: map['available'] == true,
      totalCount: (map['totalCount'] as num?)?.toInt() ?? 0,
      sampleCount: (map['sampleCount'] as num?)?.toInt() ?? 0,
      elapsedMs: (map['elapsedMs'] as num?)?.toInt() ?? 0,
      error: map['error'] as String?,
    );
  }

  final bool available;
  final int totalCount;
  final int sampleCount;
  final int elapsedMs;
  final String? error;

  String get label {
    if (!available) {
      return error == null ? 'Unavailable' : 'Fallback';
    }
    if (totalCount <= 0) {
      return '0 photos';
    }
    return '$totalCount photos - ${elapsedMs}ms';
  }
}

class NativeGalleryAsset {
  const NativeGalleryAsset({
    required this.id,
    required this.displayName,
    required this.width,
    required this.height,
    required this.dateAddedMs,
    required this.mimeType,
  });

  factory NativeGalleryAsset.fromMap(Map<Object?, Object?> map) {
    return NativeGalleryAsset(
      id: map['id'].toString(),
      displayName: (map['displayName'] as String?) ?? 'Photo',
      width: (map['width'] as num?)?.toInt() ?? 0,
      height: (map['height'] as num?)?.toInt() ?? 0,
      dateAddedMs: (map['dateAddedMs'] as num?)?.toInt() ?? 0,
      mimeType: (map['mimeType'] as String?) ?? 'image/*',
    );
  }

  final String id;
  final String displayName;
  final int width;
  final int height;
  final int dateAddedMs;
  final String mimeType;
}

class NativeGalleryPage {
  const NativeGalleryPage({
    required this.available,
    required this.totalCount,
    required this.page,
    required this.pageSize,
    required this.assets,
    required this.elapsedMs,
    this.error,
  });

  factory NativeGalleryPage.fromMap(Map<Object?, Object?> map) {
    final rawAssets = (map['assets'] as List<Object?>? ?? const [])
        .cast<Map<Object?, Object?>>();
    return NativeGalleryPage(
      available: map['available'] == true,
      totalCount: (map['totalCount'] as num?)?.toInt() ?? 0,
      page: (map['page'] as num?)?.toInt() ?? 0,
      pageSize: (map['pageSize'] as num?)?.toInt() ?? 0,
      assets: rawAssets.map(NativeGalleryAsset.fromMap).toList(growable: false),
      elapsedMs: (map['elapsedMs'] as num?)?.toInt() ?? 0,
      error: map['error'] as String?,
    );
  }

  final bool available;
  final int totalCount;
  final int page;
  final int pageSize;
  final List<NativeGalleryAsset> assets;
  final int elapsedMs;
  final String? error;

  bool get hasAssets => assets.isNotEmpty;
}

class NativeThumbnailCacheStats {
  const NativeThumbnailCacheStats({
    required this.warmed,
    required this.cacheCount,
    required this.elapsedMs,
  });

  factory NativeThumbnailCacheStats.fromMap(Map<Object?, Object?> map) {
    return NativeThumbnailCacheStats(
      warmed: (map['warmed'] as num?)?.toInt() ?? 0,
      cacheCount: (map['cacheCount'] as num?)?.toInt() ?? 0,
      elapsedMs: (map['elapsedMs'] as num?)?.toInt() ?? 0,
    );
  }

  static const empty = NativeThumbnailCacheStats(
    warmed: 0,
    cacheCount: 0,
    elapsedMs: 0,
  );

  final int warmed;
  final int cacheCount;
  final int elapsedMs;
}

class NativeGalleryBridge {
  const NativeGalleryBridge();

  static const NativeGalleryBridge instance = NativeGalleryBridge();
  static const MethodChannel _channel = MethodChannel(
    'com.omniacreata.omniapixels/native_gallery',
  );

  Future<NativeGallerySnapshot> snapshot({int limit = 90}) async {
    try {
      final result = await _channel.invokeMapMethod<Object?, Object?>(
        'getLibrarySnapshot',
        {'limit': limit},
      );
      if (result == null) {
        return const NativeGallerySnapshot(
          available: false,
          totalCount: 0,
          sampleCount: 0,
          elapsedMs: 0,
          error: 'No native response',
        );
      }
      return NativeGallerySnapshot.fromMap(result);
    } on PlatformException catch (error) {
      return NativeGallerySnapshot(
        available: false,
        totalCount: 0,
        sampleCount: 0,
        elapsedMs: 0,
        error: error.message ?? error.code,
      );
    } on MissingPluginException catch (error) {
      return NativeGallerySnapshot(
        available: false,
        totalCount: 0,
        sampleCount: 0,
        elapsedMs: 0,
        error: error.message,
      );
    }
  }

  Future<NativeGalleryPage> recentPage({
    required int page,
    required int size,
  }) async {
    try {
      final result = await _channel.invokeMapMethod<Object?, Object?>(
        'getRecentImagesPage',
        {'page': page, 'size': size},
      );
      if (result == null) {
        return const NativeGalleryPage(
          available: false,
          totalCount: 0,
          page: 0,
          pageSize: 0,
          assets: [],
          elapsedMs: 0,
          error: 'No native response',
        );
      }
      return NativeGalleryPage.fromMap(result);
    } on PlatformException catch (error) {
      return NativeGalleryPage(
        available: false,
        totalCount: 0,
        page: page,
        pageSize: size,
        assets: const [],
        elapsedMs: 0,
        error: error.message ?? error.code,
      );
    } on MissingPluginException catch (error) {
      return NativeGalleryPage(
        available: false,
        totalCount: 0,
        page: page,
        pageSize: size,
        assets: const [],
        elapsedMs: 0,
        error: error.message,
      );
    }
  }

  Future<Uint8List?> thumbnail({
    required String mediaId,
    int size = 192,
    int quality = 72,
  }) async {
    if (!_isAndroidMediaId(mediaId)) {
      return null;
    }
    try {
      return await _channel.invokeMethod<Uint8List>('loadThumbnail', {
        'mediaId': mediaId,
        'size': size,
        'quality': quality,
      });
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  Future<Uint8List?> originalBytes({required String mediaId}) async {
    if (!_isAndroidMediaId(mediaId)) {
      return null;
    }
    try {
      return await _channel.invokeMethod<Uint8List>('loadOriginalBytes', {
        'mediaId': mediaId,
      });
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  Future<NativeThumbnailCacheStats> prefetchThumbnails({
    required List<String> mediaIds,
    int size = 256,
    int quality = 70,
  }) async {
    final ids = mediaIds.where(_isAndroidMediaId).toList(growable: false);
    if (ids.isEmpty) {
      return NativeThumbnailCacheStats.empty;
    }
    try {
      final result = await _channel.invokeMapMethod<Object?, Object?>(
        'prefetchThumbnails',
        {'mediaIds': ids, 'size': size, 'quality': quality},
      );
      if (result == null) {
        return NativeThumbnailCacheStats.empty;
      }
      return NativeThumbnailCacheStats.fromMap(result);
    } on PlatformException {
      return NativeThumbnailCacheStats.empty;
    } on MissingPluginException {
      return NativeThumbnailCacheStats.empty;
    }
  }

  Future<NativeThumbnailCacheStats> clearThumbnailCache() async {
    try {
      final result = await _channel.invokeMapMethod<Object?, Object?>(
        'clearThumbnailCache',
      );
      if (result == null) {
        return NativeThumbnailCacheStats.empty;
      }
      return NativeThumbnailCacheStats.fromMap(result);
    } on PlatformException {
      return NativeThumbnailCacheStats.empty;
    } on MissingPluginException {
      return NativeThumbnailCacheStats.empty;
    }
  }

  bool _isAndroidMediaId(String value) {
    if (value.isEmpty) {
      return false;
    }
    for (var i = 0; i < value.length; i++) {
      final code = value.codeUnitAt(i);
      if (code < 48 || code > 57) {
        return false;
      }
    }
    return true;
  }
}
