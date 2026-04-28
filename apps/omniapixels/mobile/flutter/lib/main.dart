import 'dart:collection';
import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart' as picker;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:share_plus/share_plus.dart';

import 'editor/edit_models.dart';
import 'editor/diagnostics.dart';
import 'editor/image_renderer.dart';
import 'editor/markup_models.dart';
import 'editor/upscale_engine.dart';

void main() {
  runApp(const OmniaPixelsApp());
}

const _accent = Color(0xFF5EEAD4);
const _bg = Color(0xFF090A0F);
const _surface = Color(0xFF101116);
const _versionLabel = '0.3.6+14';
const _galleryPageSize = 60;
const _galleryPrecacheCount = 90;
const _maxThumbnailCacheEntries = 180;
const _maxDiagnosticsEntries = 24;
const _maxFrameDiagnosticsSamples = 180;
const _previewLongEdge = 1600;
const _previewDecodeWidth = 1400;
const _galleryThumbnailOption = ThumbnailOption(
  size: ThumbnailSize.square(192),
  quality: 64,
);
const _editorPreviewOption = ThumbnailOption(
  size: ThumbnailSize(1600, 1600),
  quality: 88,
);

class OmniaPixelsApp extends StatelessWidget {
  const OmniaPixelsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'OmniaPixels',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _accent,
          brightness: Brightness.dark,
          surface: _surface,
        ),
        scaffoldBackgroundColor: _bg,
        sliderTheme: const SliderThemeData(
          showValueIndicator: ShowValueIndicator.never,
        ),
      ),
      home: const OmniaPixelsShell(),
    );
  }
}

class OmniaPixelsShell extends StatefulWidget {
  const OmniaPixelsShell({super.key});

  @override
  State<OmniaPixelsShell> createState() => _OmniaPixelsShellState();
}

class _EditorSnapshot {
  const _EditorSnapshot({required this.edit, required this.markups});

  final EditValues edit;
  final List<MarkupLayer> markups;
}

class _OmniaPixelsShellState extends State<OmniaPixelsShell> {
  bool _entered = false;
  int _tab = 0;
  bool _busy = false;
  String _status = 'Ready';
  List<AssetPathEntity> _albums = const [];
  List<AssetEntity> _assets = const [];
  AssetPathEntity? _selectedAlbum;
  AssetEntity? _selectedAsset;
  Uint8List? _pickedOriginalBytes;
  Uint8List? _sourceBytes;
  Uint8List? _previewBytes;
  Uint8List? _upscaledBytes;
  int _galleryPage = 0;
  int _selectedAlbumTotal = 0;
  bool _hasMoreAssets = false;
  bool _loadingMoreAssets = false;
  final LinkedHashMap<String, Future<Uint8List?>> _thumbnailFutures =
      LinkedHashMap();
  EditValues _edit = const EditValues();
  EditorTool _tool = EditorTool.light;
  UpscaleMode _upscaleMode = UpscaleMode.fastLocal;
  List<MarkupLayer> _markups = const [];
  MarkupLayer? _draftMarkup;
  int _markupColorValue = 0xFFFFFFFF;
  double _brushSize = 0.026;
  String _textTemplate = 'Omnia';
  String _stickerTemplate = 'WOW';
  Timer? _previewDebounce;
  Timer? _busyTicker;
  DateTime? _busyStartedAt;
  final List<_EditorSnapshot> _undoStack = [];
  final List<_EditorSnapshot> _redoStack = [];
  EditValues? _gestureStartEdit;
  bool _showOriginal = false;
  final List<DiagnosticsEntry> _diagnostics = [];
  final List<Duration> _frameDiagnostics = [];
  DateTime _lastFrameDiagnosticsUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  PackageInfo? _packageInfo;
  String? _packageInfoError;
  String? _latestError;

  Uint8List? get _currentBytes =>
      _upscaledBytes ?? _previewBytes ?? _sourceBytes;
  bool get _canUndo => _undoStack.isNotEmpty;
  bool get _canRedo => _redoStack.isNotEmpty;
  int get _loadedGalleryPages => _assets.isEmpty ? 0 : _galleryPage + 1;
  String get _apkBuildLabel {
    final info = _packageInfo;
    if (info == null) {
      return _packageInfoError == null ? 'Loading' : 'Unavailable';
    }
    return '${info.version}+${info.buildNumber}';
  }

  String get _buildCheckLabel {
    final info = _packageInfo;
    if (info == null) {
      return _packageInfoError == null ? 'Loading' : 'Check failed';
    }
    return _apkBuildLabel == _versionLabel ? 'Match' : 'Mismatch';
  }

  FrameDiagnosticsSnapshot get _frameSnapshot =>
      FrameDiagnosticsSnapshot.fromSamples(_frameDiagnostics);

  @override
  void initState() {
    super.initState();
    SchedulerBinding.instance.addTimingsCallback(_handleFrameTimings);
    unawaited(_loadPackageInfo());
  }

  @override
  void dispose() {
    SchedulerBinding.instance.removeTimingsCallback(_handleFrameTimings);
    unawaited(PhotoCachingManager().cancelCacheRequest());
    _previewDebounce?.cancel();
    _busyTicker?.cancel();
    super.dispose();
  }

  void _handleFrameTimings(List<FrameTiming> timings) {
    if (timings.isEmpty) {
      return;
    }

    for (final timing in timings) {
      _frameDiagnostics.add(timing.totalSpan);
    }
    if (_frameDiagnostics.length > _maxFrameDiagnosticsSamples) {
      _frameDiagnostics.removeRange(
        0,
        _frameDiagnostics.length - _maxFrameDiagnosticsSamples,
      );
    }

    final now = DateTime.now();
    if (mounted &&
        now.difference(_lastFrameDiagnosticsUpdate) >
            const Duration(seconds: 1)) {
      _lastFrameDiagnosticsUpdate = now;
      setState(() {});
    }
  }

  Future<T> _measure<T>(String label, Future<T> Function() action) async {
    final watch = Stopwatch()..start();
    try {
      final result = await action();
      watch.stop();
      _recordDiagnostic(label, watch.elapsed, succeeded: true);
      return result;
    } catch (error) {
      watch.stop();
      _recordDiagnostic(label, watch.elapsed, succeeded: false, error: error);
      rethrow;
    }
  }

  void _recordDiagnostic(
    String label,
    Duration elapsed, {
    required bool succeeded,
    Object? error,
  }) {
    if (!mounted) {
      return;
    }
    setState(() {
      if (!succeeded) {
        _latestError = error.toString();
      }
      _diagnostics.insert(
        0,
        DiagnosticsEntry(
          label: label,
          elapsed: elapsed,
          recordedAt: DateTime.now(),
          succeeded: succeeded,
          error: error?.toString(),
        ),
      );
      if (_diagnostics.length > _maxDiagnosticsEntries) {
        _diagnostics.removeRange(_maxDiagnosticsEntries, _diagnostics.length);
      }
    });
  }

  void _clearDiagnostics() {
    setState(() {
      _diagnostics.clear();
      _frameDiagnostics.clear();
      _latestError = null;
      _status = 'Diagnostics cleared';
    });
  }

  Future<void> _loadPackageInfo() async {
    try {
      final info = await _measure(
        'Read APK metadata',
        PackageInfo.fromPlatform,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _packageInfo = info;
        _packageInfoError = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _packageInfoError = error.toString());
    }
  }

  void _clearThumbnailCaches() {
    _thumbnailFutures.clear();
    unawaited(PhotoCachingManager().cancelCacheRequest());
  }

  Future<void> _warmThumbnailCache(
    List<AssetEntity> assets,
    String label,
  ) async {
    if (assets.isEmpty) {
      return;
    }
    try {
      await _measure(
        label,
        () => PhotoCachingManager().requestCacheAssets(
          assets: assets,
          option: _galleryThumbnailOption,
        ),
      );
    } catch (_) {
      // Native thumbnail caching is a best-effort scroll aid.
    }
  }

  void _warmGalleryWindow(List<AssetEntity> assets, String label) {
    if (assets.isEmpty) {
      return;
    }
    unawaited(
      _warmThumbnailCache(
        assets.take(_galleryPrecacheCount).toList(growable: false),
        label,
      ),
    );
  }

  Future<void> _enter({required bool requestPhotos}) async {
    setState(() => _entered = true);
    if (requestPhotos) {
      await _pickSinglePhoto();
    }
  }

  Future<void> _loadGallery() async {
    await _runBusy('Loading gallery...', () async {
      final permission = await PhotoManager.requestPermissionExtend();
      if (!permission.hasAccess) {
        setState(() => _status = 'Photo access needed');
        return;
      }
      final paths = await PhotoManager.getAssetPathList(
        type: RequestType.image,
        hasAll: true,
      );
      if (paths.isEmpty) {
        setState(() => _status = 'No photos found');
        return;
      }
      final album = paths.first;
      final total = await album.assetCountAsync;
      final assets = await album.getAssetListPaged(
        page: 0,
        size: _galleryPageSize,
      );
      setState(() {
        _clearThumbnailCaches();
        _albums = paths;
        _selectedAlbum = album;
        _assets = assets;
        _galleryPage = 0;
        _selectedAlbumTotal = total;
        _hasMoreAssets = assets.length < total;
        _status = '${album.name}: ${assets.length} / $total';
      });
      _warmGalleryWindow(assets, 'Prime gallery thumbnails');
    });
  }

  Future<void> _loadAlbum(
    AssetPathEntity album, {
    List<AssetPathEntity>? albums,
  }) async {
    await _runBusy('Loading ${album.name}...', () async {
      final total = await album.assetCountAsync;
      final assets = await album.getAssetListPaged(
        page: 0,
        size: _galleryPageSize,
      );
      setState(() {
        _clearThumbnailCaches();
        _albums = albums ?? _albums;
        _selectedAlbum = album;
        _assets = assets;
        _galleryPage = 0;
        _selectedAlbumTotal = total;
        _hasMoreAssets = assets.length < total;
        _status = '${album.name}: ${assets.length} / $total';
      });
      _warmGalleryWindow(assets, 'Prime album thumbnails');
    });
  }

  Future<void> _loadMoreAssets() async {
    final album = _selectedAlbum;
    if (album == null || !_hasMoreAssets || _loadingMoreAssets) {
      return;
    }
    setState(() {
      _loadingMoreAssets = true;
      _status = 'Loading more...';
    });
    try {
      await _measure('Load more assets', () async {
        final nextPage = _galleryPage + 1;
        final total = await album.assetCountAsync;
        final nextAssets = await album.getAssetListPaged(
          page: nextPage,
          size: _galleryPageSize,
        );
        setState(() {
          _galleryPage = nextPage;
          _selectedAlbumTotal = total;
          _assets = [..._assets, ...nextAssets];
          _hasMoreAssets = _assets.length < total;
          _status = '${album.name}: ${_assets.length} / $total';
        });
        _warmGalleryWindow(nextAssets, 'Prime next thumbnails');
      });
    } catch (error) {
      setState(() => _status = 'Could not load more photos');
      _showSnack(error.toString());
    } finally {
      if (mounted) {
        setState(() => _loadingMoreAssets = false);
      }
    }
  }

  Future<Uint8List?> _thumbnailFor(AssetEntity asset) {
    final cached = _thumbnailFutures.remove(asset.id);
    if (cached != null) {
      _thumbnailFutures[asset.id] = cached;
      return cached;
    }

    final future = asset.thumbnailDataWithOption(_galleryThumbnailOption);
    _thumbnailFutures[asset.id] = future;
    if (_thumbnailFutures.length > _maxThumbnailCacheEntries) {
      _thumbnailFutures.remove(_thumbnailFutures.keys.first);
    }
    return future;
  }

  Future<void> _pickSinglePhoto() async {
    await _runBusy('Opening picker...', () async {
      final picked = await picker.ImagePicker().pickImage(
        source: picker.ImageSource.gallery,
        requestFullMetadata: false,
      );
      if (picked == null) {
        setState(() => _status = 'Picker dismissed');
        return;
      }
      final original = await picked.readAsBytes();
      final preview = await _measure(
        'Picker preview render',
        () => _render(
          bytes: original,
          edit: const EditValues(),
          maxLongEdge: _previewLongEdge,
        ),
      );
      setState(() {
        _selectedAsset = null;
        _pickedOriginalBytes = original;
        _sourceBytes = preview;
        _previewBytes = preview;
        _upscaledBytes = null;
        _edit = const EditValues();
        _markups = const [];
        _draftMarkup = null;
        _undoStack.clear();
        _redoStack.clear();
        _gestureStartEdit = null;
        _showOriginal = false;
        _tool = EditorTool.light;
        _upscaleMode = UpscaleMode.fastLocal;
        _tab = 1;
        _status = 'Picked photo ready';
      });
    });
  }

  Future<void> _selectAsset(AssetEntity asset) async {
    await _runBusy('Opening photo...', () async {
      final bytes = await asset.thumbnailDataWithOption(_editorPreviewOption);
      if (bytes == null) {
        setState(() => _status = 'Could not read selected photo');
        return;
      }
      final preview = await _measure(
        'Gallery preview render',
        () => _render(
          bytes: bytes,
          edit: const EditValues(),
          maxLongEdge: _previewLongEdge,
        ),
      );
      setState(() {
        _selectedAsset = asset;
        _pickedOriginalBytes = null;
        _sourceBytes = bytes;
        _previewBytes = preview;
        _upscaledBytes = null;
        _edit = const EditValues();
        _markups = const [];
        _draftMarkup = null;
        _undoStack.clear();
        _redoStack.clear();
        _gestureStartEdit = null;
        _showOriginal = false;
        _tool = EditorTool.light;
        _upscaleMode = UpscaleMode.fastLocal;
        _tab = 1;
        _status = 'Photo ready';
      });
    });
  }

  void _changeTool(EditorTool tool) {
    unawaited(HapticFeedback.selectionClick());
    setState(() => _tool = tool);
  }

  void _beginEditGesture() {
    _gestureStartEdit ??= _edit;
  }

  void _endEditGesture() {
    final startEdit = _gestureStartEdit;
    _gestureStartEdit = null;
    if (startEdit != null && startEdit != _edit) {
      _pushUndo(_snapshot(edit: startEdit));
      _redoStack.clear();
      unawaited(HapticFeedback.selectionClick());
      if (mounted) {
        setState(() {});
      }
    }
  }

  void _commitEdit(EditValues edit, {bool immediate = false, String? status}) {
    if (edit != _edit) {
      _pushUndo(_snapshot());
      _redoStack.clear();
      unawaited(HapticFeedback.selectionClick());
    }
    _updateEdit(edit, immediate: immediate, status: status);
  }

  void _applyPreset(EditPreset preset) {
    final next = preset.values.copyWith(
      rotationTurns: _edit.rotationTurns,
      cropMode: _edit.cropMode,
    );
    _commitEdit(next, status: '${preset.label} preset');
  }

  void _resetTool(EditorTool tool) {
    if (tool == EditorTool.brush) {
      _removeMarkupType(MarkupLayerType.brush, status: 'Brush reset');
      return;
    }
    if (tool == EditorTool.text) {
      _removeMarkupType(MarkupLayerType.text, status: 'Text reset');
      return;
    }
    if (tool == EditorTool.sticker) {
      _removeMarkupType(MarkupLayerType.sticker, status: 'Sticker reset');
      return;
    }

    final next = switch (tool) {
      EditorTool.crop => _edit.copyWith(cropMode: CropMode.original),
      EditorTool.rotate => _edit.copyWith(rotationTurns: 0),
      EditorTool.light => _edit.copyWith(
        exposure: 0,
        brightness: 1,
        contrast: 1,
      ),
      EditorTool.color => _edit.copyWith(saturation: 1, warmth: 0, tint: 0),
      EditorTool.detail => _edit.copyWith(detail: 0.35, clarity: 0),
      EditorTool.fx => _edit.copyWith(fade: 0, vignette: 0),
      EditorTool.brush || EditorTool.text || EditorTool.sticker => _edit,
    };
    _commitEdit(
      next,
      immediate: tool == EditorTool.crop || tool == EditorTool.rotate,
      status: '${tool.label} reset',
    );
  }

  void _resetAllEdits() {
    if (_edit.isDefault && _markups.isEmpty) {
      return;
    }
    _pushUndo(_snapshot());
    _redoStack.clear();
    setState(() {
      _edit = const EditValues();
      _markups = const [];
      _draftMarkup = null;
      _upscaledBytes = null;
      _status = 'All edits reset';
    });
    unawaited(_refreshPreview());
  }

  _EditorSnapshot _snapshot({EditValues? edit, List<MarkupLayer>? markups}) {
    return _EditorSnapshot(
      edit: edit ?? _edit,
      markups: List.unmodifiable(markups ?? _markups),
    );
  }

  void _pushUndo(_EditorSnapshot snapshot) {
    if (_undoStack.isNotEmpty && _sameSnapshot(_undoStack.last, snapshot)) {
      return;
    }
    _undoStack.add(snapshot);
    if (_undoStack.length > 30) {
      _undoStack.removeAt(0);
    }
  }

  bool _sameSnapshot(_EditorSnapshot a, _EditorSnapshot b) {
    return a.edit == b.edit && _sameMarkupList(a.markups, b.markups);
  }

  bool _sameMarkupList(List<MarkupLayer> a, List<MarkupLayer> b) {
    if (a.length != b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return false;
      }
    }
    return true;
  }

  void _undoEdit() {
    if (!_canUndo) {
      return;
    }
    final previous = _undoStack.removeLast();
    _redoStack.add(_snapshot());
    unawaited(HapticFeedback.selectionClick());
    _restoreSnapshot(previous, status: 'Undo');
  }

  void _redoEdit() {
    if (!_canRedo) {
      return;
    }
    final next = _redoStack.removeLast();
    _undoStack.add(_snapshot());
    unawaited(HapticFeedback.selectionClick());
    _restoreSnapshot(next, status: 'Redo');
  }

  void _restoreSnapshot(_EditorSnapshot snapshot, {required String status}) {
    setState(() {
      _edit = snapshot.edit;
      _markups = List.unmodifiable(snapshot.markups);
      _draftMarkup = null;
      _upscaledBytes = null;
      _status = status;
    });
    unawaited(_refreshPreview());
  }

  void _updateEdit(EditValues edit, {bool immediate = false, String? status}) {
    final geometryChanged =
        edit.rotationTurns != _edit.rotationTurns ||
        edit.cropMode != _edit.cropMode;
    setState(() {
      _edit = edit;
      _draftMarkup = null;
      _upscaledBytes = null;
      _status =
          status ?? (geometryChanged ? 'Preview updating...' : 'Live preview');
    });
    _previewDebounce?.cancel();
    if (immediate || geometryChanged) {
      unawaited(_refreshPreview());
    }
  }

  void _setMarkupColor(int colorValue) {
    setState(() => _markupColorValue = colorValue);
    unawaited(HapticFeedback.selectionClick());
  }

  void _setBrushSize(double value) {
    setState(() => _brushSize = value.clamp(0.012, 0.07).toDouble());
  }

  void _setTextTemplate(String value) {
    setState(() => _textTemplate = value);
    unawaited(HapticFeedback.selectionClick());
  }

  void _setStickerTemplate(String value) {
    setState(() => _stickerTemplate = value);
    unawaited(HapticFeedback.selectionClick());
  }

  void _beginBrushStroke(MarkupPoint point) {
    if (_sourceBytes == null) {
      return;
    }
    setState(() {
      _draftMarkup = MarkupLayer.brush(
        points: [point],
        colorValue: _markupColorValue,
        size: _brushSize,
      );
      _status = 'Brush drawing';
    });
  }

  void _appendBrushStroke(MarkupPoint point) {
    final draft = _draftMarkup;
    if (draft == null || draft.type != MarkupLayerType.brush) {
      _beginBrushStroke(point);
      return;
    }
    final last = draft.points.last;
    if ((last.x - point.x).abs() + (last.y - point.y).abs() < 0.004) {
      return;
    }
    setState(() {
      _draftMarkup = MarkupLayer.brush(
        points: [...draft.points, point],
        colorValue: draft.colorValue,
        size: draft.size,
      );
    });
  }

  void _endBrushStroke() {
    final draft = _draftMarkup;
    if (draft == null || draft.type != MarkupLayerType.brush) {
      return;
    }
    _pushUndo(_snapshot());
    _redoStack.clear();
    setState(() {
      _markups = List.unmodifiable([..._markups, draft]);
      _draftMarkup = null;
      _upscaledBytes = null;
      _status = 'Brush added';
    });
    unawaited(HapticFeedback.selectionClick());
  }

  void _addTextMarkup(MarkupPoint point) {
    _addPlacedMarkup(
      MarkupLayer.text(
        text: _textTemplate.trim().isEmpty ? 'Text' : _textTemplate.trim(),
        x: point.x,
        y: point.y,
        colorValue: _markupColorValue,
        size: 0.12,
      ),
      status: 'Text added',
    );
  }

  void _addStickerMarkup(MarkupPoint point) {
    _addPlacedMarkup(
      MarkupLayer.sticker(
        text: _stickerTemplate.trim().isEmpty ? 'WOW' : _stickerTemplate.trim(),
        x: point.x,
        y: point.y,
        colorValue: _markupColorValue,
        size: 0.14,
      ),
      status: 'Sticker added',
    );
  }

  void _addCenteredTextMarkup() {
    _addTextMarkup(const MarkupPoint(x: 0.5, y: 0.5));
  }

  void _addCenteredStickerMarkup() {
    _addStickerMarkup(const MarkupPoint(x: 0.5, y: 0.5));
  }

  void _addPlacedMarkup(MarkupLayer markup, {required String status}) {
    if (_sourceBytes == null) {
      _showSnack('Choose a photo first.');
      return;
    }
    _pushUndo(_snapshot());
    _redoStack.clear();
    setState(() {
      _markups = List.unmodifiable([..._markups, markup]);
      _draftMarkup = null;
      _upscaledBytes = null;
      _status = status;
    });
    unawaited(HapticFeedback.selectionClick());
  }

  void _removeMarkupType(MarkupLayerType type, {required String status}) {
    final next = _markups
        .where((markup) => markup.type != type)
        .toList(growable: false);
    if (next.length == _markups.length) {
      return;
    }
    _pushUndo(_snapshot());
    _redoStack.clear();
    setState(() {
      _markups = List.unmodifiable(next);
      _draftMarkup = null;
      _upscaledBytes = null;
      _status = status;
    });
    unawaited(HapticFeedback.selectionClick());
  }

  Future<void> _refreshPreview() async {
    final bytes = _sourceBytes;
    if (bytes == null) {
      return;
    }
    final edit = _edit;
    final preview = await _measure(
      'Preview render',
      () => _render(bytes: bytes, edit: edit, maxLongEdge: _previewLongEdge),
    );
    if (!mounted || edit != _edit) {
      return;
    }
    setState(() {
      _previewBytes = preview;
      _status = 'Preview ready';
    });
  }

  Future<void> _runUpscale() async {
    if (_sourceBytes == null &&
        _pickedOriginalBytes == null &&
        _selectedAsset == null) {
      _showSnack('Choose a photo first.');
      return;
    }
    await _runBusy(_upscaleMode.runningLabel, () async {
      final bytes = await _bestAvailableSourceBytes();
      if (bytes == null) {
        setState(() => _status = 'Could not read source photo');
        return;
      }
      final result = await _measure(
        '${_upscaleMode.label} engine',
        () => const UpscaleEngine().run(
          bytes: bytes,
          edit: _edit,
          mode: _upscaleMode,
          markups: _markups,
        ),
      );
      setState(() {
        _upscaledBytes = result.bytes;
        _status = result.status;
      });
    });
  }

  Future<Uint8List?> _bestAvailableSourceBytes() async {
    final picked = _pickedOriginalBytes;
    if (picked != null) {
      return picked;
    }
    final asset = _selectedAsset;
    if (asset != null) {
      final original = await asset.originBytes;
      return original ?? _sourceBytes;
    }
    return _sourceBytes;
  }

  Future<void> _saveToGallery() async {
    await _runBusy('Saving copy...', () async {
      final bytes = await _exportBytes();
      if (bytes == null) {
        setState(() => _status = 'Choose a photo first');
        _showSnack('Choose a photo first.');
        return;
      }
      final filename =
          'omniapixels_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await PhotoManager.editor.saveImage(
        bytes,
        filename: filename,
        title: filename,
        desc: 'Edited with OmniaPixels',
        relativePath: 'Pictures/OmniaPixels',
        creationDate: DateTime.now(),
      );
      setState(() => _status = 'Saved to OmniaPixels');
      _showSnack('Saved as a new copy.');
    });
  }

  Future<void> _shareImage() async {
    await _runBusy('Preparing share...', () async {
      final bytes = await _exportBytes();
      if (bytes == null) {
        setState(() => _status = 'Choose a photo first');
        _showSnack('Choose a photo first.');
        return;
      }
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/omniapixels-share-${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      await file.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'image/jpeg')],
          text: 'Edited with OmniaPixels',
        ),
      );
      setState(() => _status = 'Share sheet opened');
    });
  }

  Future<Uint8List?> _exportBytes() async {
    return _measure('Export bytes', () async {
      final bytes =
          _pickedOriginalBytes ??
          await _selectedAsset?.originBytes ??
          _sourceBytes;
      if (bytes == null) {
        return null;
      }
      return _upscaledBytes ??
          _render(
            bytes: bytes,
            edit: _edit,
            markups: _markups,
            maxLongEdge: 4096,
          );
    });
  }

  Future<Uint8List> _render({
    required Uint8List bytes,
    required EditValues edit,
    List<MarkupLayer> markups = const [],
    bool upscale = false,
    int? maxLongEdge,
  }) {
    return renderEditedImage(
      bytes: bytes,
      edit: edit,
      markups: markups,
      upscale: upscale,
      maxLongEdge: maxLongEdge,
    );
  }

  Future<void> _runBusy(String status, Future<void> Function() action) async {
    if (_busy) {
      return;
    }
    setState(() {
      _busy = true;
      _status = status;
      _busyStartedAt = DateTime.now();
    });
    _busyTicker?.cancel();
    _busyTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _busy) {
        setState(() {});
      }
    });
    try {
      await _measure(status.replaceAll('...', '').trim(), action);
    } catch (error) {
      setState(() => _status = 'Something went wrong');
      _showSnack(error.toString());
    } finally {
      _busyTicker?.cancel();
      _busyTicker = null;
      if (mounted) {
        setState(() {
          _busy = false;
          _busyStartedAt = null;
        });
      }
    }
  }

  void _showSnack(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    if (!_entered) {
      return SplashScreen(
        onChoosePhotos: () => _enter(requestPhotos: true),
        onContinue: () => _enter(requestPhotos: false),
      );
    }

    final screens = <Widget>[
      GalleryScreen(
        albums: _albums,
        assets: _assets,
        selectedAlbum: _selectedAlbum,
        selectedAsset: _selectedAsset,
        hasMoreAssets: _hasMoreAssets,
        isBusy: _busy,
        isLoadingMore: _loadingMoreAssets,
        status: _status,
        onLoadGallery: _loadGallery,
        onLoadMore: _loadMoreAssets,
        onPickSingle: _pickSinglePhoto,
        thumbnailFor: _thumbnailFor,
        onSelectAlbum: _loadAlbum,
        onSelectAsset: _selectAsset,
      ),
      EditorScreen(
        bytes: _previewBytes ?? _sourceBytes,
        originalBytes: _sourceBytes,
        edit: _edit,
        markups: _markups,
        draftMarkup: _draftMarkup,
        tool: _tool,
        status: _status,
        isBusy: _busy,
        canUndo: _canUndo,
        canRedo: _canRedo,
        canResetAll: !_edit.isDefault || _markups.isNotEmpty,
        showOriginal: _showOriginal,
        markupColorValue: _markupColorValue,
        brushSize: _brushSize,
        textTemplate: _textTemplate,
        stickerTemplate: _stickerTemplate,
        onLiveEditChanged: _updateEdit,
        onCommittedEditChanged: _commitEdit,
        onEditGestureStart: _beginEditGesture,
        onEditGestureEnd: _endEditGesture,
        onUndo: _undoEdit,
        onRedo: _redoEdit,
        onResetAll: _resetAllEdits,
        onPresetSelected: _applyPreset,
        onResetTool: _resetTool,
        onMarkupColorChanged: _setMarkupColor,
        onBrushSizeChanged: _setBrushSize,
        onTextTemplateChanged: _setTextTemplate,
        onStickerTemplateChanged: _setStickerTemplate,
        onBrushStart: _beginBrushStroke,
        onBrushUpdate: _appendBrushStroke,
        onBrushEnd: _endBrushStroke,
        onTextTap: _addTextMarkup,
        onStickerTap: _addStickerMarkup,
        onAddCenteredText: _addCenteredTextMarkup,
        onAddCenteredSticker: _addCenteredStickerMarkup,
        onCompareChanged: (value) => setState(() => _showOriginal = value),
        onToolSelected: _changeTool,
        onOpenGallery: () => setState(() => _tab = 0),
        onSave: _saveToGallery,
      ),
      UpscaleScreen(
        beforeBytes: _previewBytes ?? _sourceBytes,
        afterBytes: _upscaledBytes,
        isBusy: _busy,
        status: _status,
        detail: _edit.detail,
        mode: _upscaleMode,
        onDetailChanged: (value) => _updateEdit(_edit.copyWith(detail: value)),
        onModeChanged: (mode) => setState(() {
          _upscaleMode = mode;
          _upscaledBytes = null;
          _status = '${mode.label} selected';
        }),
        onRunUpscale: _runUpscale,
        onApply: () => setState(() => _tab = 3),
      ),
      ExportScreen(
        bytes: _currentBytes,
        edit: _upscaledBytes == null ? _edit : const EditValues(),
        markups: _upscaledBytes == null ? _markups : const [],
        isBusy: _busy,
        status: _status,
        onSave: _saveToGallery,
        onShare: _shareImage,
      ),
      SettingsScreen(
        status: _status,
        assetCount: _assets.length,
        totalAssetCount: _selectedAlbumTotal,
        loadedPages: _loadedGalleryPages,
        thumbnailCacheCount: _thumbnailFutures.length,
        uiBuildLabel: _versionLabel,
        apkBuildLabel: _apkBuildLabel,
        buildCheckLabel: _buildCheckLabel,
        hasSelection: _sourceBytes != null,
        diagnostics: _diagnostics,
        frameSnapshot: _frameSnapshot,
        latestError: _latestError,
        onClearDiagnostics: _clearDiagnostics,
      ),
    ];

    return Scaffold(
      body: Stack(
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: screens[_tab],
          ),
          if (_busy)
            Positioned.fill(
              child: IgnorePointer(
                child: _ProcessingOverlay(
                  status: _status,
                  startedAt: _busyStartedAt,
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() => _tab = index),
        backgroundColor: const Color(0xF20F1016),
        indicatorColor: _accent.withValues(alpha: 0.18),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.photo_library_outlined),
            selectedIcon: Icon(Icons.photo_library),
            label: 'Gallery',
          ),
          NavigationDestination(
            icon: Icon(Icons.tune_outlined),
            selectedIcon: Icon(Icons.tune),
            label: 'Edit',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome),
            label: 'Upscale',
          ),
          NavigationDestination(
            icon: Icon(Icons.ios_share_outlined),
            selectedIcon: Icon(Icons.ios_share),
            label: 'Export',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({
    super.key,
    required this.onChoosePhotos,
    required this.onContinue,
  });

  final VoidCallback onChoosePhotos;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.25,
            colors: [Color(0xFF1B2230), _bg],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                Image.asset(
                  'assets/brand/omnia-creata-logo-transparent.png',
                  width: 230,
                ),
                const SizedBox(height: 28),
                const Text(
                  'OmniaPixels',
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Photo editor & upscaler',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.68),
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                _PrimaryButton(
                  label: 'Choose Photos',
                  icon: Icons.add_photo_alternate_outlined,
                  onPressed: onChoosePhotos,
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: onContinue,
                  child: const Text('Continue without access'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class GalleryScreen extends StatelessWidget {
  const GalleryScreen({
    super.key,
    required this.albums,
    required this.assets,
    required this.selectedAlbum,
    required this.selectedAsset,
    required this.hasMoreAssets,
    required this.isBusy,
    required this.isLoadingMore,
    required this.status,
    required this.onLoadGallery,
    required this.onLoadMore,
    required this.onPickSingle,
    required this.thumbnailFor,
    required this.onSelectAlbum,
    required this.onSelectAsset,
  });

  final List<AssetPathEntity> albums;
  final List<AssetEntity> assets;
  final AssetPathEntity? selectedAlbum;
  final AssetEntity? selectedAsset;
  final bool hasMoreAssets;
  final bool isBusy;
  final bool isLoadingMore;
  final String status;
  final VoidCallback onLoadGallery;
  final VoidCallback onLoadMore;
  final VoidCallback onPickSingle;
  final Future<Uint8List?> Function(AssetEntity asset) thumbnailFor;
  final ValueChanged<AssetPathEntity> onSelectAlbum;
  final ValueChanged<AssetEntity> onSelectAsset;

  @override
  Widget build(BuildContext context) {
    return AppSurface(
      title: 'OmniaPixels',
      trailing: IconButton(
        onPressed: onLoadGallery,
        icon: const Icon(Icons.refresh),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'Recent', action: '${assets.length} photos'),
          const SizedBox(height: 8),
          _StatusLine(status: status),
          if (albums.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: albums.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final album = albums[index];
                  final selected = album.id == selectedAlbum?.id;
                  return ChoiceChip(
                    selected: selected,
                    label: Text(album.name, overflow: TextOverflow.ellipsis),
                    onSelected: (_) => onSelectAlbum(album),
                    selectedColor: _accent.withValues(alpha: 0.24),
                    labelStyle: TextStyle(
                      color: selected ? _accent : Colors.white70,
                      fontWeight: FontWeight.w700,
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 12),
          Expanded(
            child: assets.isEmpty
                ? EmptyGallery(
                    onLoadGallery: onLoadGallery,
                    onPickSingle: onPickSingle,
                  )
                : NotificationListener<ScrollNotification>(
                    onNotification: (notification) {
                      if (notification.metrics.extentAfter < 900 &&
                          hasMoreAssets &&
                          !isBusy &&
                          !isLoadingMore) {
                        onLoadMore();
                      }
                      return false;
                    },
                    child: GridView.builder(
                      cacheExtent: 900,
                      itemCount:
                          assets.length +
                          (hasMoreAssets || isLoadingMore ? 1 : 0),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                          ),
                      itemBuilder: (context, index) {
                        if (index >= assets.length) {
                          return LoadMoreTile(
                            isLoading: isLoadingMore,
                            onLoadMore: onLoadMore,
                          );
                        }
                        final asset = assets[index];
                        return GestureDetector(
                          onTap: () => onSelectAsset(asset),
                          child: AssetThumbnail(
                            thumbnail: thumbnailFor(asset),
                            selected: asset.id == selectedAsset?.id,
                          ),
                        );
                      },
                    ),
                  ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _PrimaryButton(
                  label: 'Pick One',
                  icon: Icons.add_photo_alternate_outlined,
                  onPressed: onPickSingle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SecondaryButton(
                  label: assets.isEmpty ? 'Load Gallery' : 'Refresh',
                  onPressed: onLoadGallery,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class EmptyGallery extends StatelessWidget {
  const EmptyGallery({
    super.key,
    required this.onLoadGallery,
    required this.onPickSingle,
  });

  final VoidCallback onLoadGallery;
  final VoidCallback onPickSingle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.photo_library_outlined,
            size: 54,
            color: Colors.white.withValues(alpha: 0.42),
          ),
          const SizedBox(height: 14),
          const Text(
            'No photos loaded',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'Use Android picker for fastest access.',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.62)),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 230,
            child: _PrimaryButton(
              label: 'Pick One Photo',
              icon: Icons.add_photo_alternate_outlined,
              onPressed: onPickSingle,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: 230,
            child: _SecondaryButton(
              label: 'Load Albums',
              onPressed: onLoadGallery,
            ),
          ),
        ],
      ),
    );
  }
}

class LoadMoreTile extends StatelessWidget {
  const LoadMoreTile({
    super.key,
    required this.isLoading,
    required this.onLoadMore,
  });

  final bool isLoading;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: isLoading ? null : onLoadMore,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          color: Colors.white.withValues(alpha: 0.06),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  color: _accent,
                  strokeWidth: 2,
                ),
              )
            else
              const Icon(Icons.expand_more, color: _accent),
            const SizedBox(height: 6),
            Text(
              isLoading ? 'Loading' : 'More',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

class AssetThumbnail extends StatelessWidget {
  const AssetThumbnail({
    super.key,
    required this.thumbnail,
    required this.selected,
  });

  final Future<Uint8List?> thumbnail;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List?>(
      future: thumbnail,
      builder: (context, snapshot) {
        final bytes = snapshot.data;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? _accent : Colors.white.withValues(alpha: 0.08),
              width: selected ? 2 : 1,
            ),
            color: Colors.white.withValues(alpha: 0.06),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(selected ? 14 : 15),
            child: bytes == null
                ? const Center(child: Icon(Icons.image_outlined))
                : Image.memory(
                    bytes,
                    fit: BoxFit.cover,
                    gaplessPlayback: true,
                    cacheWidth: 192,
                    cacheHeight: 192,
                    filterQuality: FilterQuality.low,
                  ),
          ),
        );
      },
    );
  }
}

class EditorScreen extends StatelessWidget {
  const EditorScreen({
    super.key,
    required this.bytes,
    required this.originalBytes,
    required this.edit,
    required this.markups,
    required this.draftMarkup,
    required this.tool,
    required this.status,
    required this.isBusy,
    required this.canUndo,
    required this.canRedo,
    required this.canResetAll,
    required this.showOriginal,
    required this.markupColorValue,
    required this.brushSize,
    required this.textTemplate,
    required this.stickerTemplate,
    required this.onLiveEditChanged,
    required this.onCommittedEditChanged,
    required this.onEditGestureStart,
    required this.onEditGestureEnd,
    required this.onUndo,
    required this.onRedo,
    required this.onResetAll,
    required this.onPresetSelected,
    required this.onResetTool,
    required this.onMarkupColorChanged,
    required this.onBrushSizeChanged,
    required this.onTextTemplateChanged,
    required this.onStickerTemplateChanged,
    required this.onBrushStart,
    required this.onBrushUpdate,
    required this.onBrushEnd,
    required this.onTextTap,
    required this.onStickerTap,
    required this.onAddCenteredText,
    required this.onAddCenteredSticker,
    required this.onCompareChanged,
    required this.onToolSelected,
    required this.onOpenGallery,
    required this.onSave,
  });

  final Uint8List? bytes;
  final Uint8List? originalBytes;
  final EditValues edit;
  final List<MarkupLayer> markups;
  final MarkupLayer? draftMarkup;
  final EditorTool tool;
  final String status;
  final bool isBusy;
  final bool canUndo;
  final bool canRedo;
  final bool canResetAll;
  final bool showOriginal;
  final int markupColorValue;
  final double brushSize;
  final String textTemplate;
  final String stickerTemplate;
  final ValueChanged<EditValues> onLiveEditChanged;
  final ValueChanged<EditValues> onCommittedEditChanged;
  final VoidCallback onEditGestureStart;
  final VoidCallback onEditGestureEnd;
  final VoidCallback onUndo;
  final VoidCallback onRedo;
  final VoidCallback onResetAll;
  final ValueChanged<EditPreset> onPresetSelected;
  final ValueChanged<EditorTool> onResetTool;
  final ValueChanged<int> onMarkupColorChanged;
  final ValueChanged<double> onBrushSizeChanged;
  final ValueChanged<String> onTextTemplateChanged;
  final ValueChanged<String> onStickerTemplateChanged;
  final ValueChanged<MarkupPoint> onBrushStart;
  final ValueChanged<MarkupPoint> onBrushUpdate;
  final VoidCallback onBrushEnd;
  final ValueChanged<MarkupPoint> onTextTap;
  final ValueChanged<MarkupPoint> onStickerTap;
  final VoidCallback onAddCenteredText;
  final VoidCallback onAddCenteredSticker;
  final ValueChanged<bool> onCompareChanged;
  final ValueChanged<EditorTool> onToolSelected;
  final VoidCallback onOpenGallery;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final displayBytes = showOriginal ? originalBytes ?? bytes : bytes;
    return AppSurface(
      title: 'Edit',
      leading: IconButton(
        onPressed: onOpenGallery,
        icon: const Icon(Icons.photo_library_outlined),
      ),
      trailing: IconButton(onPressed: onSave, icon: const Icon(Icons.save_alt)),
      child: Column(
        children: [
          Expanded(
            child: PhotoPreview(
              bytes: displayBytes,
              edit: showOriginal ? const EditValues() : edit,
              markups: showOriginal ? const [] : markups,
              draftMarkup: showOriginal ? null : draftMarkup,
              activeTool: showOriginal ? null : tool,
              label: displayBytes == null
                  ? 'Choose a photo'
                  : showOriginal
                  ? 'Original'
                  : 'Edited preview',
              compareEnabled: bytes != null,
              showOriginal: showOriginal,
              onBrushStart: onBrushStart,
              onBrushUpdate: onBrushUpdate,
              onBrushEnd: onBrushEnd,
              onTextTap: onTextTap,
              onStickerTap: onStickerTap,
              onCompareChanged: onCompareChanged,
            ),
          ),
          const SizedBox(height: 12),
          _EditorQuickActions(
            status: status,
            canUndo: canUndo,
            canRedo: canRedo,
            canResetAll: canResetAll,
            onUndo: onUndo,
            onRedo: onRedo,
            onResetAll: onResetAll,
          ),
          const SizedBox(height: 12),
          PresetStrip(edit: edit, onPresetSelected: onPresetSelected),
          const SizedBox(height: 10),
          ToolRail(
            active: tool,
            edit: edit,
            markups: markups,
            onSelect: onToolSelected,
          ),
          const SizedBox(height: 8),
          EditorControlDock(
            tool: tool,
            edit: edit,
            markups: markups,
            markupColorValue: markupColorValue,
            brushSize: brushSize,
            textTemplate: textTemplate,
            stickerTemplate: stickerTemplate,
            onLiveChanged: onLiveEditChanged,
            onCommittedChanged: onCommittedEditChanged,
            onGestureStart: onEditGestureStart,
            onGestureEnd: onEditGestureEnd,
            onResetTool: () => onResetTool(tool),
            onMarkupColorChanged: onMarkupColorChanged,
            onBrushSizeChanged: onBrushSizeChanged,
            onTextTemplateChanged: onTextTemplateChanged,
            onStickerTemplateChanged: onStickerTemplateChanged,
            onAddCenteredText: onAddCenteredText,
            onAddCenteredSticker: onAddCenteredSticker,
          ),
        ],
      ),
    );
  }
}

class _EditorQuickActions extends StatelessWidget {
  const _EditorQuickActions({
    required this.status,
    required this.canUndo,
    required this.canRedo,
    required this.canResetAll,
    required this.onUndo,
    required this.onRedo,
    required this.onResetAll,
  });

  final String status;
  final bool canUndo;
  final bool canRedo;
  final bool canResetAll;
  final VoidCallback onUndo;
  final VoidCallback onRedo;
  final VoidCallback onResetAll;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatusLine(status: status)),
        const SizedBox(width: 8),
        _TinyIconButton(
          icon: Icons.undo,
          tooltip: 'Undo',
          enabled: canUndo,
          onTap: onUndo,
        ),
        const SizedBox(width: 8),
        _TinyIconButton(
          icon: Icons.redo,
          tooltip: 'Redo',
          enabled: canRedo,
          onTap: onRedo,
        ),
        const SizedBox(width: 8),
        _TinyIconButton(
          icon: Icons.restart_alt,
          tooltip: 'Reset all',
          enabled: canResetAll,
          onTap: onResetAll,
        ),
      ],
    );
  }
}

class PresetStrip extends StatelessWidget {
  const PresetStrip({
    super.key,
    required this.edit,
    required this.onPresetSelected,
  });

  final EditValues edit;
  final ValueChanged<EditPreset> onPresetSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: editPresets.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final preset = editPresets[index];
          return _ModeChip(
            label: preset.label,
            selected: edit.sameAdjustmentsAs(preset.values),
            onTap: () => onPresetSelected(preset),
          );
        },
      ),
    );
  }
}

class EditorControlDock extends StatelessWidget {
  const EditorControlDock({
    super.key,
    required this.tool,
    required this.edit,
    required this.markups,
    required this.markupColorValue,
    required this.brushSize,
    required this.textTemplate,
    required this.stickerTemplate,
    required this.onLiveChanged,
    required this.onCommittedChanged,
    required this.onGestureStart,
    required this.onGestureEnd,
    required this.onResetTool,
    required this.onMarkupColorChanged,
    required this.onBrushSizeChanged,
    required this.onTextTemplateChanged,
    required this.onStickerTemplateChanged,
    required this.onAddCenteredText,
    required this.onAddCenteredSticker,
  });

  final EditorTool tool;
  final EditValues edit;
  final List<MarkupLayer> markups;
  final int markupColorValue;
  final double brushSize;
  final String textTemplate;
  final String stickerTemplate;
  final ValueChanged<EditValues> onLiveChanged;
  final ValueChanged<EditValues> onCommittedChanged;
  final VoidCallback onGestureStart;
  final VoidCallback onGestureEnd;
  final VoidCallback onResetTool;
  final ValueChanged<int> onMarkupColorChanged;
  final ValueChanged<double> onBrushSizeChanged;
  final ValueChanged<String> onTextTemplateChanged;
  final ValueChanged<String> onStickerTemplateChanged;
  final VoidCallback onAddCenteredText;
  final VoidCallback onAddCenteredSticker;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 178,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 160),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: SingleChildScrollView(
          key: ValueKey(tool),
          physics: const BouncingScrollPhysics(),
          child: switch (tool) {
            EditorTool.crop => _ControlPanel(
              children: [
                _CropModePicker(
                  value: edit.cropMode,
                  onChanged: (mode) =>
                      onCommittedChanged(edit.copyWith(cropMode: mode)),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.rotate_left,
                        label: 'Left',
                        onTap: () => onCommittedChanged(
                          edit.copyWith(
                            rotationTurns: (edit.rotationTurns + 3) % 4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.rotate_right,
                        label: 'Right',
                        onTap: () => onCommittedChanged(
                          edit.copyWith(
                            rotationTurns: (edit.rotationTurns + 1) % 4,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _CompactActionButton(
                  icon: Icons.refresh,
                  label: 'Reset crop',
                  onTap: onResetTool,
                ),
              ],
            ),
            EditorTool.rotate => _ControlPanel(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.rotate_left,
                        label: 'Left',
                        onTap: () => onCommittedChanged(
                          edit.copyWith(
                            rotationTurns: (edit.rotationTurns + 3) % 4,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.rotate_right,
                        label: 'Right',
                        onTap: () => onCommittedChanged(
                          edit.copyWith(
                            rotationTurns: (edit.rotationTurns + 1) % 4,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _MiniPill(label: '${edit.rotationTurns * 90} deg'),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.refresh,
                        label: 'Reset',
                        onTap: onResetTool,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            EditorTool.light => _ControlPanel(
              children: [
                _SliderRow(
                  label: 'Exposure',
                  value: edit.exposure,
                  min: -0.8,
                  max: 0.8,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(exposure: v)),
                ),
                _SliderRow(
                  label: 'Bright',
                  value: edit.brightness,
                  min: 0.72,
                  max: 1.28,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(brightness: v)),
                ),
                _SliderRow(
                  label: 'Contrast',
                  value: edit.contrast,
                  min: 0.55,
                  max: 1.65,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(contrast: v)),
                ),
                _ResetControlButton(onTap: onResetTool),
              ],
            ),
            EditorTool.color => _ControlPanel(
              children: [
                _SliderRow(
                  label: 'Saturation',
                  value: edit.saturation,
                  min: 0,
                  max: 1.85,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(saturation: v)),
                ),
                _SliderRow(
                  label: 'Warmth',
                  value: edit.warmth,
                  min: -1,
                  max: 1,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(warmth: v)),
                ),
                _SliderRow(
                  label: 'Tint',
                  value: edit.tint,
                  min: -1,
                  max: 1,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(tint: v)),
                ),
                _ResetControlButton(onTap: onResetTool),
              ],
            ),
            EditorTool.detail => _ControlPanel(
              children: [
                _SliderRow(
                  label: 'Detail',
                  value: edit.detail,
                  min: 0,
                  max: 1,
                  neutral: 0.35,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(detail: v)),
                ),
                _SliderRow(
                  label: 'Clarity',
                  value: edit.clarity,
                  min: -1,
                  max: 1,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(clarity: v)),
                ),
                _ResetControlButton(onTap: onResetTool),
              ],
            ),
            EditorTool.fx => _ControlPanel(
              children: [
                _SliderRow(
                  label: 'Fade',
                  value: edit.fade,
                  min: 0,
                  max: 1,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(fade: v)),
                ),
                _SliderRow(
                  label: 'Vignette',
                  value: edit.vignette,
                  min: 0,
                  max: 1,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: (v) => onLiveChanged(edit.copyWith(vignette: v)),
                ),
                _ResetControlButton(onTap: onResetTool),
              ],
            ),
            EditorTool.brush => _ControlPanel(
              children: [
                _MarkupColorSwatches(
                  selected: markupColorValue,
                  onChanged: onMarkupColorChanged,
                ),
                _SliderRow(
                  label: 'Size',
                  value: brushSize,
                  min: 0.012,
                  max: 0.07,
                  onChangeStart: onGestureStart,
                  onChangeEnd: onGestureEnd,
                  onChanged: onBrushSizeChanged,
                ),
                Row(
                  children: [
                    Expanded(
                      child: _MiniPill(
                        label: _markupCountLabel(
                          markups,
                          MarkupLayerType.brush,
                          'stroke',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.cleaning_services_outlined,
                        label: 'Clear',
                        onTap: onResetTool,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            EditorTool.text => _ControlPanel(
              children: [
                _TemplatePicker(
                  values: const ['Omnia', 'Glow', 'Clean', 'Shot'],
                  selected: textTemplate,
                  onChanged: onTextTemplateChanged,
                ),
                const SizedBox(height: 10),
                _MarkupColorSwatches(
                  selected: markupColorValue,
                  onChanged: onMarkupColorChanged,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.add,
                        label: 'Add',
                        onTap: onAddCenteredText,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.cleaning_services_outlined,
                        label: 'Clear',
                        onTap: onResetTool,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            EditorTool.sticker => _ControlPanel(
              children: [
                _TemplatePicker(
                  values: const ['WOW', 'NEW', 'VIBE', 'SALE'],
                  selected: stickerTemplate,
                  onChanged: onStickerTemplateChanged,
                ),
                const SizedBox(height: 10),
                _MarkupColorSwatches(
                  selected: markupColorValue,
                  onChanged: onMarkupColorChanged,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.add_reaction_outlined,
                        label: 'Add',
                        onTap: onAddCenteredSticker,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _CompactActionButton(
                        icon: Icons.cleaning_services_outlined,
                        label: 'Clear',
                        onTap: onResetTool,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          },
        ),
      ),
    );
  }
}

String _markupCountLabel(
  List<MarkupLayer> markups,
  MarkupLayerType type,
  String singular,
) {
  final count = markups.where((markup) => markup.type == type).length;
  return count == 1 ? '1 $singular' : '$count ${singular}s';
}

class _ControlPanel extends StatelessWidget {
  const _ControlPanel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.045),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: Column(mainAxisSize: MainAxisSize.min, children: children),
      ),
    );
  }
}

class _CropModePicker extends StatelessWidget {
  const _CropModePicker({required this.value, required this.onChanged});

  final CropMode value;
  final ValueChanged<CropMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final mode in CropMode.values)
          _ModeChip(
            label: mode.label,
            selected: mode == value,
            onTap: () => onChanged(mode),
          ),
      ],
    );
  }
}

class _MarkupColorSwatches extends StatelessWidget {
  const _MarkupColorSwatches({required this.selected, required this.onChanged});

  final int selected;
  final ValueChanged<int> onChanged;

  static const _colors = [
    0xFFFFFFFF,
    0xFF5EEAD4,
    0xFFFDE047,
    0xFFFF6B6B,
    0xFF93C5FD,
    0xFF111827,
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _colors.length,
        separatorBuilder: (_, __) => const SizedBox(width: 9),
        itemBuilder: (context, index) {
          final colorValue = _colors[index];
          final isSelected = colorValue == selected;
          return Tooltip(
            message: 'Color ${index + 1}',
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: () => onChanged(colorValue),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 140),
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(colorValue),
                  border: Border.all(
                    color: isSelected ? _accent : Colors.white24,
                    width: isSelected ? 3 : 1,
                  ),
                  boxShadow: isSelected
                      ? const [
                          BoxShadow(color: Color(0x445EEAD4), blurRadius: 14),
                        ]
                      : null,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TemplatePicker extends StatelessWidget {
  const _TemplatePicker({
    required this.values,
    required this.selected,
    required this.onChanged,
  });

  final List<String> values;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final value = values[index];
          return _ModeChip(
            label: value,
            selected: value == selected,
            onTap: () => onChanged(value),
          );
        },
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: () {
        unawaited(HapticFeedback.selectionClick());
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? _accent.withValues(alpha: 0.18)
              : Colors.white.withValues(alpha: 0.055),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? _accent : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? _accent : Colors.white70,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _TinyIconButton extends StatelessWidget {
  const _TinyIconButton({
    required this.icon,
    required this.tooltip,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: enabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOutCubic,
          width: 40,
          height: 36,
          decoration: BoxDecoration(
            color: enabled
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.white.withValues(alpha: 0.035),
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
          ),
          child: Icon(
            icon,
            size: 18,
            color: enabled ? _accent : Colors.white.withValues(alpha: 0.28),
          ),
        ),
      ),
    );
  }
}

class _ResetControlButton extends StatelessWidget {
  const _ResetControlButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: SizedBox(
        width: 132,
        child: _CompactActionButton(
          icon: Icons.refresh,
          label: 'Reset',
          onTap: onTap,
        ),
      ),
    );
  }
}

class _CompactActionButton extends StatelessWidget {
  const _CompactActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () {
        unawaited(HapticFeedback.selectionClick());
        onTap();
      },
      child: Ink(
        height: 44,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: _accent),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class EditorControls extends StatelessWidget {
  const EditorControls({
    super.key,
    required this.tool,
    required this.edit,
    required this.onChanged,
  });

  final EditorTool tool;
  final EditValues edit;
  final ValueChanged<EditValues> onChanged;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 160),
      child: switch (tool) {
        EditorTool.crop => _TogglePanel(
          key: const ValueKey('crop'),
          icon: Icons.crop,
          label: 'Square crop',
          value: edit.cropMode == CropMode.square,
          onChanged: (value) => onChanged(
            edit.copyWith(
              cropMode: value ? CropMode.square : CropMode.original,
            ),
          ),
        ),
        EditorTool.rotate => _TogglePanel(
          key: const ValueKey('rotate'),
          icon: Icons.rotate_90_degrees_ccw,
          label: 'Rotation: ${edit.rotationTurns * 90}°',
          value: edit.rotationTurns != 0,
          onChanged: (_) => onChanged(
            edit.copyWith(rotationTurns: (edit.rotationTurns + 1) % 4),
          ),
        ),
        EditorTool.light => Column(
          key: const ValueKey('light'),
          children: [
            _SliderRow(
              label: 'Exposure',
              value: edit.exposure,
              min: -0.8,
              max: 0.8,
              onChanged: (v) => onChanged(edit.copyWith(exposure: v)),
            ),
            _SliderRow(
              label: 'Contrast',
              value: edit.contrast,
              min: 0.55,
              max: 1.65,
              onChanged: (v) => onChanged(edit.copyWith(contrast: v)),
            ),
            _SliderRow(
              label: 'Warmth',
              value: edit.warmth,
              min: -1,
              max: 1,
              onChanged: (v) => onChanged(edit.copyWith(warmth: v)),
            ),
          ],
        ),
        EditorTool.color => Column(
          key: const ValueKey('color'),
          children: [
            _SliderRow(
              label: 'Saturation',
              value: edit.saturation,
              min: 0,
              max: 1.85,
              onChanged: (v) => onChanged(edit.copyWith(saturation: v)),
            ),
            _SliderRow(
              label: 'Warmth',
              value: edit.warmth,
              min: -1,
              max: 1,
              onChanged: (v) => onChanged(edit.copyWith(warmth: v)),
            ),
          ],
        ),
        EditorTool.detail => Column(
          key: const ValueKey('detail'),
          children: [
            _SliderRow(
              label: 'Detail',
              value: edit.detail,
              min: 0,
              max: 1,
              neutral: 0.35,
              onChanged: (v) => onChanged(edit.copyWith(detail: v)),
            ),
          ],
        ),
        EditorTool.fx => const SizedBox.shrink(),
        EditorTool.brush => const SizedBox.shrink(),
        EditorTool.text => const SizedBox.shrink(),
        EditorTool.sticker => const SizedBox.shrink(),
      },
    );
  }
}

class UpscaleScreen extends StatelessWidget {
  const UpscaleScreen({
    super.key,
    required this.beforeBytes,
    required this.afterBytes,
    required this.isBusy,
    required this.status,
    required this.detail,
    required this.mode,
    required this.onDetailChanged,
    required this.onModeChanged,
    required this.onRunUpscale,
    required this.onApply,
  });

  final Uint8List? beforeBytes;
  final Uint8List? afterBytes;
  final bool isBusy;
  final String status;
  final double detail;
  final UpscaleMode mode;
  final ValueChanged<double> onDetailChanged;
  final ValueChanged<UpscaleMode> onModeChanged;
  final VoidCallback onRunUpscale;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    return AppSurface(
      title: 'Upscale 2x',
      trailing: IconButton(
        onPressed: afterBytes == null ? onRunUpscale : onApply,
        icon: Icon(
          afterBytes == null ? Icons.auto_awesome : Icons.check_circle_outline,
        ),
      ),
      child: Column(
        children: [
          Expanded(
            child: ComparePreview(
              beforeBytes: beforeBytes,
              afterBytes: afterBytes,
            ),
          ),
          const SizedBox(height: 12),
          _StatusLine(status: status),
          const SizedBox(height: 12),
          _UpscaleModeSwitch(value: mode, onChanged: onModeChanged),
          const SizedBox(height: 12),
          const Row(
            children: [
              Expanded(
                child: _StatusPill(
                  icon: Icons.phone_iphone,
                  label: 'On-device',
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _StatusPill(
                  icon: Icons.high_quality_outlined,
                  label: '2x output',
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _StatusPill(icon: Icons.memory, label: 'Safe memory'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _SliderRow(
            label: 'Detail',
            value: detail,
            min: 0,
            max: 1,
            neutral: 0.35,
            onChanged: onDetailChanged,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _SecondaryButton(
                  label: 'Run 2x',
                  onPressed: isBusy ? null : onRunUpscale,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _PrimaryButton(
                  label: 'Use Result',
                  icon: Icons.check,
                  onPressed: afterBytes == null ? null : onApply,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _UpscaleModeSwitch extends StatelessWidget {
  const _UpscaleModeSwitch({required this.value, required this.onChanged});

  final UpscaleMode value;
  final ValueChanged<UpscaleMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final mode in UpscaleMode.values) ...[
          Expanded(
            child: _ModeChip(
              label: mode.label,
              selected: mode == value,
              onTap: () => onChanged(mode),
            ),
          ),
          if (mode != UpscaleMode.values.last) const SizedBox(width: 8),
        ],
      ],
    );
  }
}

class ExportScreen extends StatelessWidget {
  const ExportScreen({
    super.key,
    required this.bytes,
    required this.edit,
    required this.markups,
    required this.isBusy,
    required this.status,
    required this.onSave,
    required this.onShare,
  });

  final Uint8List? bytes;
  final EditValues edit;
  final List<MarkupLayer> markups;
  final bool isBusy;
  final String status;
  final VoidCallback onSave;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return AppSurface(
      title: 'Export',
      trailing: IconButton(
        onPressed: bytes == null ? null : onShare,
        icon: const Icon(Icons.ios_share),
      ),
      child: Column(
        children: [
          Expanded(
            child: PhotoPreview(
              bytes: bytes,
              edit: edit,
              markups: markups,
              label: bytes == null ? 'No export yet' : 'Final image',
            ),
          ),
          const SizedBox(height: 12),
          _StatusLine(status: status),
          const SizedBox(height: 12),
          const _Segmented(
            labels: ['JPG', 'PNG soon', 'HEIC soon'],
            selected: 0,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _PrimaryButton(
                  label: 'Save',
                  icon: Icons.save_alt,
                  onPressed: bytes == null || isBusy ? null : onSave,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SecondaryButton(
                  label: 'Share',
                  onPressed: bytes == null || isBusy ? null : onShare,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Saves a new copy. Originals stay untouched.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.58),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    super.key,
    required this.status,
    required this.assetCount,
    required this.totalAssetCount,
    required this.loadedPages,
    required this.thumbnailCacheCount,
    required this.uiBuildLabel,
    required this.apkBuildLabel,
    required this.buildCheckLabel,
    required this.hasSelection,
    required this.diagnostics,
    required this.frameSnapshot,
    required this.latestError,
    required this.onClearDiagnostics,
  });

  final String status;
  final int assetCount;
  final int totalAssetCount;
  final int loadedPages;
  final int thumbnailCacheCount;
  final String uiBuildLabel;
  final String apkBuildLabel;
  final String buildCheckLabel;
  final bool hasSelection;
  final List<DiagnosticsEntry> diagnostics;
  final FrameDiagnosticsSnapshot frameSnapshot;
  final String? latestError;
  final VoidCallback onClearDiagnostics;

  @override
  Widget build(BuildContext context) {
    return AppSurface(
      title: 'Settings',
      child: ListView(
        children: [
          const SizedBox(height: 8),
          const _SettingsLogo(),
          const SizedBox(height: 22),
          const _SettingsSectionLabel(label: 'Device'),
          const _SettingsRow(
            icon: Icons.phone_iphone,
            label: 'Photo access',
            value: 'System picker + albums',
          ),
          const _SettingsRow(
            icon: Icons.memory_outlined,
            label: 'Preview budget',
            value: '1600 px',
          ),
          const _SettingsRow(
            icon: Icons.high_quality_outlined,
            label: 'Upscale engine',
            value: 'Local 2x',
          ),
          const _SettingsRow(
            icon: Icons.copy_all_outlined,
            label: 'Export rule',
            value: 'New copy',
          ),
          const SizedBox(height: 10),
          const _SettingsSectionLabel(label: 'Library'),
          _SettingsRow(
            icon: Icons.photo_library_outlined,
            label: 'Loaded photos',
            value: totalAssetCount > 0
                ? '$assetCount / $totalAssetCount'
                : '$assetCount',
          ),
          _SettingsRow(
            icon: Icons.view_module_outlined,
            label: 'Loaded pages',
            value: '$loadedPages',
          ),
          _SettingsRow(
            icon: Icons.memory_outlined,
            label: 'Thumbnail cache',
            value: '$thumbnailCacheCount / $_maxThumbnailCacheEntries',
          ),
          _SettingsRow(
            icon: Icons.task_alt,
            label: 'Current photo',
            value: hasSelection ? 'Ready' : 'None',
          ),
          const SizedBox(height: 10),
          const _SettingsSectionLabel(label: 'Build'),
          _SettingsRow(
            icon: Icons.info_outline,
            label: 'UI build',
            value: uiBuildLabel,
          ),
          _SettingsRow(
            icon: Icons.inventory_2_outlined,
            label: 'APK build',
            value: apkBuildLabel,
          ),
          _SettingsRow(
            icon: Icons.verified_outlined,
            label: 'Build check',
            value: buildCheckLabel,
          ),
          const SizedBox(height: 14),
          const _SettingsSectionLabel(label: 'Performance'),
          const SizedBox(height: 6),
          DiagnosticsPanel(
            entries: diagnostics,
            frameSnapshot: frameSnapshot,
            latestError: latestError,
            onClear: onClearDiagnostics,
          ),
          const SizedBox(height: 14),
          _StatusLine(status: status),
          const SizedBox(height: 18),
        ],
      ),
    );
  }
}

class AppSurface extends StatelessWidget {
  const AppSurface({
    super.key,
    required this.title,
    required this.child,
    this.leading,
    this.trailing,
  });

  final String title;
  final Widget child;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
        child: Column(
          children: [
            Row(
              children: [
                leading ??
                    Image.asset(
                      'assets/brand/omnia-creata-logo-transparent.png',
                      width: 46,
                    ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                trailing ?? const SizedBox(width: 48),
              ],
            ),
            const SizedBox(height: 18),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

class _ProcessingOverlay extends StatelessWidget {
  const _ProcessingOverlay({required this.status, required this.startedAt});

  final String status;
  final DateTime? startedAt;

  @override
  Widget build(BuildContext context) {
    final elapsed = startedAt == null
        ? 0
        : DateTime.now().difference(startedAt!).inSeconds;

    return ColoredBox(
      color: const Color(0x99000000),
      child: Center(
        child: Container(
          width: 310,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xF20D1017),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  color: _accent,
                  strokeWidth: 3,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                status,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Local render - ${elapsed}s',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.62),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: const LinearProgressIndicator(
                  minHeight: 4,
                  color: _accent,
                  backgroundColor: Color(0x33FFFFFF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PhotoPreview extends StatelessWidget {
  const PhotoPreview({
    super.key,
    required this.bytes,
    required this.label,
    this.edit = const EditValues(),
    this.markups = const [],
    this.draftMarkup,
    this.activeTool,
    this.compareEnabled = false,
    this.showOriginal = false,
    this.onBrushStart,
    this.onBrushUpdate,
    this.onBrushEnd,
    this.onTextTap,
    this.onStickerTap,
    this.onCompareChanged,
  });

  final Uint8List? bytes;
  final String label;
  final EditValues edit;
  final List<MarkupLayer> markups;
  final MarkupLayer? draftMarkup;
  final EditorTool? activeTool;
  final bool compareEnabled;
  final bool showOriginal;
  final ValueChanged<MarkupPoint>? onBrushStart;
  final ValueChanged<MarkupPoint>? onBrushUpdate;
  final VoidCallback? onBrushEnd;
  final ValueChanged<MarkupPoint>? onTextTap;
  final ValueChanged<MarkupPoint>? onStickerTap;
  final ValueChanged<bool>? onCompareChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFCBD5E1), Color(0xFF334155), Color(0xFF111827)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x66000000),
            blurRadius: 28,
            offset: Offset(0, 20),
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: bytes == null
                ? CustomPaint(painter: _PhotoTexturePainter())
                : RepaintBoundary(
                    child: ColorFiltered(
                      colorFilter: ColorFilter.matrix(edit.previewMatrix),
                      child: Image.memory(
                        bytes!,
                        fit: BoxFit.contain,
                        gaplessPlayback: true,
                        cacheWidth: _previewDecodeWidth,
                        filterQuality: FilterQuality.medium,
                      ),
                    ),
                  ),
          ),
          if (edit.vignette > 0)
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    gradient: RadialGradient(
                      center: Alignment.center,
                      radius: 0.92,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(
                          alpha: edit.vignette.clamp(0.0, 1.0) * 0.52,
                        ),
                      ],
                      stops: const [0.48, 1],
                    ),
                  ),
                ),
              ),
            ),
          if (bytes != null && !showOriginal)
            Positioned.fill(
              child: _MarkupOverlayStage(
                bytes: bytes!,
                activeTool: activeTool,
                markups: markups,
                draftMarkup: draftMarkup,
                onBrushStart: onBrushStart,
                onBrushUpdate: onBrushUpdate,
                onBrushEnd: onBrushEnd,
                onTextTap: onTextTap,
                onStickerTap: onStickerTap,
              ),
            ),
          if (bytes != null &&
              !showOriginal &&
              edit.cropMode != CropMode.original)
            Positioned.fill(
              child: IgnorePointer(
                child: _CropGuideOverlay(mode: edit.cropMode),
              ),
            ),
          Positioned(left: 18, bottom: 18, child: _MiniPill(label: label)),
          if (compareEnabled && onCompareChanged != null)
            Positioned(
              right: 16,
              bottom: 16,
              child: GestureDetector(
                onTapDown: (_) => onCompareChanged!(true),
                onTapUp: (_) => onCompareChanged!(false),
                onTapCancel: () => onCompareChanged!(false),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: showOriginal ? _accent : const Color(0xCC0D1017),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: showOriginal
                          ? _accent
                          : Colors.white.withValues(alpha: 0.12),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.compare,
                        size: 15,
                        color: showOriginal ? const Color(0xFF071013) : _accent,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        showOriginal ? 'Before' : 'Hold',
                        style: TextStyle(
                          color: showOriginal
                              ? const Color(0xFF071013)
                              : Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MarkupOverlayStage extends StatefulWidget {
  const _MarkupOverlayStage({
    required this.bytes,
    required this.markups,
    required this.activeTool,
    this.draftMarkup,
    this.onBrushStart,
    this.onBrushUpdate,
    this.onBrushEnd,
    this.onTextTap,
    this.onStickerTap,
  });

  final Uint8List bytes;
  final List<MarkupLayer> markups;
  final MarkupLayer? draftMarkup;
  final EditorTool? activeTool;
  final ValueChanged<MarkupPoint>? onBrushStart;
  final ValueChanged<MarkupPoint>? onBrushUpdate;
  final VoidCallback? onBrushEnd;
  final ValueChanged<MarkupPoint>? onTextTap;
  final ValueChanged<MarkupPoint>? onStickerTap;

  @override
  State<_MarkupOverlayStage> createState() => _MarkupOverlayStageState();
}

class _MarkupOverlayStageState extends State<_MarkupOverlayStage> {
  ImageStream? _imageStream;
  ImageStreamListener? _imageListener;
  Size? _imageSize;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _resolveImage();
  }

  @override
  void didUpdateWidget(covariant _MarkupOverlayStage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.bytes != widget.bytes) {
      _resolveImage();
    }
  }

  @override
  void dispose() {
    final listener = _imageListener;
    if (listener != null) {
      _imageStream?.removeListener(listener);
    }
    super.dispose();
  }

  void _resolveImage() {
    final listener = _imageListener;
    if (listener != null) {
      _imageStream?.removeListener(listener);
    }

    final provider = MemoryImage(widget.bytes);
    final stream = provider.resolve(createLocalImageConfiguration(context));
    _imageListener = ImageStreamListener((info, _) {
      if (!mounted) {
        return;
      }
      setState(() {
        _imageSize = Size(
          info.image.width.toDouble(),
          info.image.height.toDouble(),
        );
      });
    });
    _imageStream = stream;
    stream.addListener(_imageListener!);
  }

  @override
  Widget build(BuildContext context) {
    final interactive = switch (widget.activeTool) {
      EditorTool.brush => widget.onBrushStart != null,
      EditorTool.text => widget.onTextTap != null,
      EditorTool.sticker => widget.onStickerTap != null,
      _ => false,
    };

    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.biggest;
        final imageRect = _imageRectFor(size);
        final painter = SizedBox.expand(
          child: CustomPaint(
            painter: _MarkupPainter(
              markups: widget.markups,
              draftMarkup: widget.draftMarkup,
              imageRect: imageRect,
            ),
          ),
        );

        if (!interactive) {
          return IgnorePointer(child: painter);
        }

        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onPanStart: widget.activeTool == EditorTool.brush
              ? (details) {
                  final point = _normalise(details.localPosition, imageRect);
                  if (point != null) {
                    widget.onBrushStart?.call(point);
                  }
                }
              : null,
          onPanUpdate: widget.activeTool == EditorTool.brush
              ? (details) {
                  final point = _normalise(details.localPosition, imageRect);
                  if (point != null) {
                    widget.onBrushUpdate?.call(point);
                  }
                }
              : null,
          onPanEnd: widget.activeTool == EditorTool.brush
              ? (_) => widget.onBrushEnd?.call()
              : null,
          onPanCancel: widget.activeTool == EditorTool.brush
              ? widget.onBrushEnd
              : null,
          onTapUp:
              widget.activeTool == EditorTool.text ||
                  widget.activeTool == EditorTool.sticker
              ? (details) {
                  final point = _normalise(details.localPosition, imageRect);
                  if (point == null) {
                    return;
                  }
                  if (widget.activeTool == EditorTool.text) {
                    widget.onTextTap?.call(point);
                  } else {
                    widget.onStickerTap?.call(point);
                  }
                }
              : null,
          child: painter,
        );
      },
    );
  }

  Rect _imageRectFor(Size stageSize) {
    final imageSize = _imageSize;
    if (imageSize == null ||
        imageSize.width <= 0 ||
        imageSize.height <= 0 ||
        stageSize.width <= 0 ||
        stageSize.height <= 0) {
      return Offset.zero & stageSize;
    }
    final fitted = applyBoxFit(BoxFit.contain, imageSize, stageSize);
    return Alignment.center.inscribe(
      fitted.destination,
      Offset.zero & stageSize,
    );
  }

  MarkupPoint? _normalise(Offset position, Rect imageRect) {
    if (!imageRect.contains(position) ||
        imageRect.width <= 0 ||
        imageRect.height <= 0) {
      return null;
    }
    return MarkupPoint(
      x: ((position.dx - imageRect.left) / imageRect.width)
          .clamp(0.0, 1.0)
          .toDouble(),
      y: ((position.dy - imageRect.top) / imageRect.height)
          .clamp(0.0, 1.0)
          .toDouble(),
    );
  }
}

class _MarkupPainter extends CustomPainter {
  const _MarkupPainter({
    required this.markups,
    required this.imageRect,
    this.draftMarkup,
  });

  final List<MarkupLayer> markups;
  final MarkupLayer? draftMarkup;
  final Rect imageRect;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRect(imageRect);
    final layers = [...markups, if (draftMarkup != null) draftMarkup!];
    for (final markup in layers) {
      switch (markup.type) {
        case MarkupLayerType.brush:
          _drawBrush(canvas, markup);
        case MarkupLayerType.text:
          _drawText(canvas, markup, isSticker: false);
        case MarkupLayerType.sticker:
          _drawText(canvas, markup, isSticker: true);
      }
    }
    canvas.restore();
  }

  void _drawBrush(Canvas canvas, MarkupLayer markup) {
    final points = markup.points;
    if (points.isEmpty) {
      return;
    }
    final paint = Paint()
      ..color = Color(markup.colorValue)
      ..style = PaintingStyle.stroke
      ..strokeWidth = (markup.size * imageRect.shortestSide).clamp(2.0, 42.0)
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    if (points.length == 1) {
      canvas.drawCircle(_point(points.first), paint.strokeWidth / 2, paint);
      return;
    }
    final path = Path()
      ..moveTo(_point(points.first).dx, _point(points.first).dy);
    for (var i = 1; i < points.length; i++) {
      final point = _point(points[i]);
      path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, paint);
  }

  void _drawText(Canvas canvas, MarkupLayer markup, {required bool isSticker}) {
    final text = markup.text.trim();
    if (text.isEmpty) {
      return;
    }
    final point = _point(MarkupPoint(x: markup.x, y: markup.y));
    final fontSize = (markup.size * imageRect.shortestSide).clamp(
      isSticker ? 24.0 : 18.0,
      isSticker ? 62.0 : 54.0,
    );
    final painter = TextPainter(
      text: TextSpan(
        text: isSticker ? text.toUpperCase() : text,
        style: TextStyle(
          color: Color(markup.colorValue),
          fontSize: fontSize,
          fontWeight: isSticker ? FontWeight.w900 : FontWeight.w800,
          shadows: const [
            Shadow(
              color: Color(0xAA000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: imageRect.width);
    final offset = Offset(
      point.dx - painter.width / 2,
      point.dy - painter.height / 2,
    );
    painter.paint(canvas, offset);
  }

  Offset _point(MarkupPoint point) {
    return Offset(
      imageRect.left + imageRect.width * point.x.clamp(0.0, 1.0).toDouble(),
      imageRect.top + imageRect.height * point.y.clamp(0.0, 1.0).toDouble(),
    );
  }

  @override
  bool shouldRepaint(covariant _MarkupPainter oldDelegate) {
    return oldDelegate.markups != markups ||
        oldDelegate.draftMarkup != draftMarkup ||
        oldDelegate.imageRect != imageRect;
  }
}

class _CropGuideOverlay extends StatelessWidget {
  const _CropGuideOverlay({required this.mode});

  final CropMode mode;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(painter: _CropGuidePainter(mode));
  }
}

class _CropGuidePainter extends CustomPainter {
  const _CropGuidePainter(this.mode);

  final CropMode mode;

  @override
  void paint(Canvas canvas, Size size) {
    final ratio = switch (mode) {
      CropMode.square => 1.0,
      CropMode.portrait45 => 4 / 5,
      CropMode.landscape169 => 16 / 9,
      CropMode.original => null,
    };
    if (ratio == null) {
      return;
    }

    final available = Rect.fromLTWH(
      18,
      18,
      size.width > 36 ? size.width - 36 : size.width,
      size.height > 36 ? size.height - 36 : size.height,
    );
    var width = available.width;
    var height = width / ratio;
    if (height > available.height) {
      height = available.height;
      width = height * ratio;
    }
    final rect = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: width,
      height: height,
    );

    final shade = Paint()..color = Colors.black.withValues(alpha: 0.22);
    final framePath = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(18)))
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(framePath, shade);

    final border = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = _accent.withValues(alpha: 0.85);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(18)),
      border,
    );

    final guide = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8
      ..color = Colors.white.withValues(alpha: 0.28);
    for (var i = 1; i < 3; i++) {
      final dx = rect.left + rect.width * i / 3;
      final dy = rect.top + rect.height * i / 3;
      canvas.drawLine(Offset(dx, rect.top), Offset(dx, rect.bottom), guide);
      canvas.drawLine(Offset(rect.left, dy), Offset(rect.right, dy), guide);
    }
  }

  @override
  bool shouldRepaint(covariant _CropGuidePainter oldDelegate) =>
      oldDelegate.mode != mode;
}

class ComparePreview extends StatelessWidget {
  const ComparePreview({
    super.key,
    required this.beforeBytes,
    required this.afterBytes,
  });

  final Uint8List? beforeBytes;
  final Uint8List? afterBytes;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        color: Colors.white.withValues(alpha: 0.06),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Expanded(
            child: _CompareSide(bytes: beforeBytes, label: 'Before'),
          ),
          Container(width: 3, color: _accent),
          Expanded(
            child: _CompareSide(
              bytes: afterBytes ?? beforeBytes,
              label: afterBytes == null ? 'Run 2x' : 'After',
            ),
          ),
        ],
      ),
    );
  }
}

class _CompareSide extends StatelessWidget {
  const _CompareSide({required this.bytes, required this.label});

  final Uint8List? bytes;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (bytes == null)
          CustomPaint(painter: _PhotoTexturePainter())
        else
          Image.memory(
            bytes!,
            fit: BoxFit.cover,
            gaplessPlayback: true,
            cacheWidth: 900,
          ),
        Positioned(left: 12, top: 12, child: _MiniPill(label: label)),
      ],
    );
  }
}

class ToolRail extends StatelessWidget {
  const ToolRail({
    super.key,
    required this.active,
    required this.edit,
    required this.markups,
    required this.onSelect,
  });

  final EditorTool active;
  final EditValues edit;
  final List<MarkupLayer> markups;
  final ValueChanged<EditorTool> onSelect;

  @override
  Widget build(BuildContext context) {
    const tools = EditorTool.values;
    return SizedBox(
      height: 58,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: tools.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final tool = tools[index];
          final isActive = tool == active;
          final hasEdits = _toolHasEdits(tool, edit, markups);
          return TweenAnimationBuilder<double>(
            tween: Tween(begin: 1, end: isActive ? 1.04 : 1),
            duration: const Duration(milliseconds: 140),
            curve: Curves.easeOutCubic,
            builder: (context, scale, child) =>
                Transform.scale(scale: scale, child: child),
            child: InkWell(
              borderRadius: BorderRadius.circular(15),
              onTap: () => onSelect(tool),
              child: Stack(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    curve: Curves.easeOutCubic,
                    width: 58,
                    decoration: BoxDecoration(
                      color: isActive
                          ? _accent.withValues(alpha: 0.17)
                          : Colors.white.withValues(alpha: 0.055),
                      borderRadius: BorderRadius.circular(15),
                      border: Border.all(
                        color: isActive
                            ? _accent
                            : Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _toolIcon(tool),
                          size: 18,
                          color: isActive ? _accent : Colors.white70,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _toolLabel(tool),
                          maxLines: 1,
                          overflow: TextOverflow.fade,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (hasEdits)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: _accent,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const SizedBox(width: 7, height: 7),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  IconData _toolIcon(EditorTool tool) {
    return switch (tool) {
      EditorTool.crop => Icons.crop,
      EditorTool.rotate => Icons.rotate_90_degrees_ccw,
      EditorTool.light => Icons.light_mode_outlined,
      EditorTool.color => Icons.palette_outlined,
      EditorTool.detail => Icons.grain,
      EditorTool.fx => Icons.blur_on,
      EditorTool.brush => Icons.brush_outlined,
      EditorTool.text => Icons.title,
      EditorTool.sticker => Icons.add_reaction_outlined,
    };
  }

  String _toolLabel(EditorTool tool) {
    return switch (tool) {
      EditorTool.crop => 'Crop',
      EditorTool.rotate => 'Rotate',
      EditorTool.light => 'Light',
      EditorTool.color => 'Color',
      EditorTool.detail => 'Detail',
      EditorTool.fx => 'FX',
      EditorTool.brush => 'Brush',
      EditorTool.text => 'Text',
      EditorTool.sticker => 'Sticker',
    };
  }

  bool _toolHasEdits(
    EditorTool tool,
    EditValues edit,
    List<MarkupLayer> markups,
  ) {
    return switch (tool) {
      EditorTool.crop => edit.cropMode != CropMode.original,
      EditorTool.rotate => edit.rotationTurns != 0,
      EditorTool.light =>
        edit.exposure != 0 || edit.brightness != 1 || edit.contrast != 1,
      EditorTool.color =>
        edit.saturation != 1 || edit.warmth != 0 || edit.tint != 0,
      EditorTool.detail => edit.detail != 0.35 || edit.clarity != 0,
      EditorTool.fx => edit.fade != 0 || edit.vignette != 0,
      EditorTool.brush => markups.any(
        (markup) => markup.type == MarkupLayerType.brush,
      ),
      EditorTool.text => markups.any(
        (markup) => markup.type == MarkupLayerType.text,
      ),
      EditorTool.sticker => markups.any(
        (markup) => markup.type == MarkupLayerType.sticker,
      ),
    };
  }
}

class _TogglePanel extends StatelessWidget {
  const _TogglePanel({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: SwitchListTile(
        contentPadding: EdgeInsets.zero,
        value: value,
        onChanged: onChanged,
        secondary: Icon(icon, color: _accent),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
        activeThumbColor: _accent,
      ),
    );
  }
}

class _SliderRow extends StatelessWidget {
  const _SliderRow({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
    this.neutral,
    this.onChangeStart,
    this.onChangeEnd,
  });

  final String label;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;
  final double? neutral;
  final VoidCallback? onChangeStart;
  final VoidCallback? onChangeEnd;

  @override
  Widget build(BuildContext context) {
    final valueLabel = _sliderValueLabel();
    return Row(
      children: [
        SizedBox(
          width: 78,
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
          ),
        ),
        Expanded(
          child: Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            onChanged: onChanged,
            onChangeStart: (_) => onChangeStart?.call(),
            onChangeEnd: (_) => onChangeEnd?.call(),
            activeColor: _accent,
          ),
        ),
        SizedBox(
          width: 44,
          child: Text(
            valueLabel,
            textAlign: TextAlign.right,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.55),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  String _sliderValueLabel() {
    final anchor =
        neutral ??
        (min < 0 && max > 0
            ? 0.0
            : min < 1 && max > 1
            ? 1.0
            : null);

    if (anchor == null) {
      return '${(value.clamp(min, max) * 100).round()}';
    }

    final delta = value - anchor;
    if (delta.abs() < 0.005) {
      return '0';
    }

    final scaled = (delta * 100).round();
    if (scaled == 0) {
      return '0';
    }
    return scaled > 0 ? '+$scaled' : '$scaled';
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.action});

  final String title;
  final String action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          action,
          style: const TextStyle(color: _accent, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _StatusLine extends StatelessWidget {
  const _StatusLine({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.circle, size: 8, color: _accent),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            status,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.62),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(54),
        backgroundColor: _accent,
        foregroundColor: const Color(0xFF071013),
        disabledBackgroundColor: Colors.white.withValues(alpha: 0.12),
        disabledForegroundColor: Colors.white.withValues(alpha: 0.36),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  const _SecondaryButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(54)),
      child: Text(label),
    );
  }
}

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xCC0D1017),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        child: Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: _accent),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _Segmented extends StatelessWidget {
  const _Segmented({required this.labels, required this.selected});

  final List<String> labels;
  final int selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: i == selected ? _accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  labels[i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: i == selected
                        ? const Color(0xFF071013)
                        : Colors.white70,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class DiagnosticsPanel extends StatelessWidget {
  const DiagnosticsPanel({
    super.key,
    required this.entries,
    required this.frameSnapshot,
    required this.latestError,
    required this.onClear,
  });

  final List<DiagnosticsEntry> entries;
  final FrameDiagnosticsSnapshot frameSnapshot;
  final String? latestError;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final visibleEntries = entries.take(8).toList(growable: false);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.055),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.monitor_heart_outlined, color: _accent),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Diagnostics',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
              ),
              TextButton.icon(
                onPressed: onClear,
                icon: const Icon(Icons.cleaning_services_outlined, size: 17),
                label: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetricPill(
                label: 'Avg frame',
                value: frameSnapshot.averageLabel,
              ),
              _MetricPill(label: 'Worst', value: frameSnapshot.worstLabel),
              _MetricPill(
                label: '>16ms',
                value: '${frameSnapshot.framesOver16ms}',
              ),
              _MetricPill(
                label: '>33ms',
                value: '${frameSnapshot.framesOver33ms}',
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (latestError != null) ...[
            _DiagnosticError(message: latestError!),
            const SizedBox(height: 12),
          ],
          Text(
            'Recent operations',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.72),
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          if (visibleEntries.isEmpty)
            Text(
              'No operations measured yet',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.52)),
            )
          else
            for (final entry in visibleEntries) _DiagnosticEntryRow(entry),
        ],
      ),
    );
  }
}

class _MetricPill extends StatelessWidget {
  const _MetricPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFF0C0F14),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.48),
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _DiagnosticError extends StatelessWidget {
  const _DiagnosticError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF3A1219),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFB7185)),
      ),
      child: Text(
        message,
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Color(0xFFFFCCD5),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DiagnosticEntryRow extends StatelessWidget {
  const _DiagnosticEntryRow(this.entry);

  final DiagnosticsEntry entry;

  @override
  Widget build(BuildContext context) {
    final color = entry.succeeded ? _accent : const Color(0xFFFB7185);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            entry.succeeded ? Icons.check_circle : Icons.error_outline,
            size: 17,
            color: color,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              entry.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            entry.durationLabel,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            entry.timeLabel,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.42),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsLogo extends StatelessWidget {
  const _SettingsLogo();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Image.asset(
          'assets/brand/omnia-creata-logo-transparent.png',
          width: 138,
        ),
        const SizedBox(height: 10),
        const Text(
          'OmniaPixels',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const _MiniPill(label: _versionLabel),
      ],
    );
  }
}

class _SettingsSectionLabel extends StatelessWidget {
  const _SettingsSectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 6),
      child: Text(
        label,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.5),
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 0,
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: _accent),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.62)),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

class _PhotoTexturePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white.withValues(alpha: 0.1);
    for (var i = 0; i < 12; i++) {
      final dx = size.width * ((i * 37) % 100) / 100;
      final dy = size.height * ((i * 23) % 100) / 100;
      canvas.drawCircle(Offset(dx, dy), 18 + (i % 4) * 10, paint);
    }
    final linePaint = Paint()
      ..color = _accent.withValues(alpha: 0.14)
      ..strokeWidth = 2;
    for (var i = 0; i < 6; i++) {
      final y = size.height * (0.18 + i * 0.12);
      canvas.drawLine(Offset(0, y), Offset(size.width, y + 38), linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
