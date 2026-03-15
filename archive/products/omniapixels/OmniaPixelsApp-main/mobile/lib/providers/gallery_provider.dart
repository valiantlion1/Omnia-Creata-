import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A saved gallery item
class GalleryItem {
  final String id;
  final String name;
  final String action;
  final DateTime createdAt;
  final String thumbnailBase64; // Small preview
  final String fullBase64; // Full processed image

  GalleryItem({
    required this.id,
    required this.name,
    required this.action,
    required this.createdAt,
    required this.thumbnailBase64,
    required this.fullBase64,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'action': action,
    'createdAt': createdAt.toIso8601String(),
    'thumbnailBase64': thumbnailBase64,
    'fullBase64': fullBase64,
  };

  factory GalleryItem.fromJson(Map<String, dynamic> json) => GalleryItem(
    id: json['id'],
    name: json['name'],
    action: json['action'],
    createdAt: DateTime.parse(json['createdAt']),
    thumbnailBase64: json['thumbnailBase64'],
    fullBase64: json['fullBase64'],
  );

  Uint8List get fullBytes => base64Decode(fullBase64);
  Uint8List get thumbnailBytes => base64Decode(thumbnailBase64);
}

/// Gallery provider — stores processed images locally via SharedPreferences.
class GalleryProvider extends ChangeNotifier {
  static const String _storageKey = 'omniapixels_gallery';
  List<GalleryItem> _items = [];
  bool _isLoaded = false;

  List<GalleryItem> get items => List.unmodifiable(_items);
  int get count => _items.length;
  bool get isLoaded => _isLoaded;

  GalleryProvider() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_storageKey);
      if (jsonStr != null) {
        final List<dynamic> decoded = json.decode(jsonStr);
        _items = decoded.map((e) => GalleryItem.fromJson(e)).toList();
        _items.sort((a, b) => b.createdAt.compareTo(a.createdAt)); // newest first
      }
    } catch (_) {
      // If corrupted, start fresh
      _items = [];
    }
    _isLoaded = true;
    notifyListeners();
  }

  Future<void> _saveToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = json.encode(_items.map((e) => e.toJson()).toList());
    await prefs.setString(_storageKey, jsonStr);
  }

  /// Save a processed image to gallery
  Future<void> saveImage({
    required String name,
    required String action,
    required Uint8List imageBytes,
  }) async {
    final item = GalleryItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      action: action,
      createdAt: DateTime.now(),
      thumbnailBase64: base64Encode(imageBytes), // TODO: generate smaller thumb
      fullBase64: base64Encode(imageBytes),
    );
    _items.insert(0, item);
    notifyListeners();
    await _saveToStorage();
  }

  /// Delete an item
  Future<void> deleteItem(String id) async {
    _items.removeWhere((item) => item.id == id);
    notifyListeners();
    await _saveToStorage();
  }

  /// Clear all items
  Future<void> clearAll() async {
    _items.clear();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
