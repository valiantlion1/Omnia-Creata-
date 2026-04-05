import 'dart:typed_data';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  List<AssetPathEntity> _albums = [];
  AssetPathEntity? _selectedAlbum;
  List<AssetEntity> _photos = [];
  bool _loading = true;
  int _page = 0;
  static const _pageSize = 60;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _requestPermission();
  }

  Future<void> _requestPermission() async {
    final result = await PhotoManager.requestPermissionExtend();
    if (result.isAuth) {
      await _loadAlbums();
    } else {
      PhotoManager.openSetting();
    }
  }

  Future<void> _loadAlbums() async {
    final albums = await PhotoManager.getAssetPathList(
      type: RequestType.image,
      filterOption: FilterOptionGroup(
        orders: [const OrderOption(type: OrderOptionType.createDate, asc: false)],
      ),
    );
    if (albums.isEmpty) return;
    setState(() {
      _albums = albums;
      _selectedAlbum = albums.first;
    });
    await _loadPhotos(reset: true);
  }

  Future<void> _loadPhotos({bool reset = false}) async {
    if (_selectedAlbum == null) return;
    if (reset) {
      setState(() { _page = 0; _photos = []; _hasMore = true; _loading = true; });
    }
    final assets = await _selectedAlbum!.getAssetListPaged(
      page: _page,
      size: _pageSize,
    );
    setState(() {
      _photos.addAll(assets);
      _hasMore = assets.length == _pageSize;
      _page++;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _albums.isEmpty
            ? const Text('Galeri')
            : DropdownButton<AssetPathEntity>(
                value: _selectedAlbum,
                dropdownColor: const Color(0xFF1A1A24),
                underline: const SizedBox(),
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                icon: const Icon(Icons.expand_more, color: Colors.white),
                items: _albums.map((a) => DropdownMenuItem(
                  value: a,
                  child: Text(a.name, overflow: TextOverflow.ellipsis),
                )).toList(),
                onChanged: (album) {
                  if (album == null) return;
                  setState(() => _selectedAlbum = album);
                  _loadPhotos(reset: true);
                },
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _photos.isEmpty
              ? const Center(child: Text('Fotoğraf bulunamadı', style: TextStyle(color: Colors.white54)))
              : NotificationListener<ScrollNotification>(
                  onNotification: (n) {
                    if (_hasMore && n.metrics.pixels >= n.metrics.maxScrollExtent - 300) {
                      _loadPhotos();
                    }
                    return false;
                  },
                  child: GridView.builder(
                    padding: const EdgeInsets.all(2),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 2,
                      mainAxisSpacing: 2,
                    ),
                    itemCount: _photos.length,
                    itemBuilder: (ctx, i) => _PhotoTile(
                      asset: _photos[i],
                      onTap: () => Navigator.pushNamed(ctx, '/upload',
                          arguments: {'asset': _photos[i]}),
                    ),
                  ),
                ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  final AssetEntity asset;
  final VoidCallback onTap;

  const _PhotoTile({required this.asset, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: FutureBuilder<Uint8List?>(
        future: asset.thumbnailDataWithSize(const ThumbnailSize.square(200)),
        builder: (ctx, snap) {
          if (snap.data == null) {
            return Container(color: const Color(0xFF1A1A24));
          }
          return Image.memory(snap.data!, fit: BoxFit.cover);
        },
      ),
    );
  }
}
