import 'dart:io';
import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  AssetEntity? _asset;
  File? _file;
  String _processingType = 'enhance';
  bool _uploading = false;

  static const _types = [
    {'value': 'super_resolution', 'label': 'Upscale', 'icon': Icons.zoom_in, 'color': Color(0xFF6C3CE1)},
    {'value': 'background_removal', 'label': 'Arkaplan Sil', 'icon': Icons.auto_fix_high, 'color': Color(0xFF2196F3)},
    {'value': 'enhance', 'label': 'Geliştir', 'icon': Icons.tune, 'color': Color(0xFF4CAF50)},
    {'value': 'crop', 'label': 'Akıllı Kırp', 'icon': Icons.crop, 'color': Color(0xFFFF9800)},
    {'value': 'style_transfer', 'label': 'Stil', 'icon': Icons.palette, 'color': Color(0xFFE91E63)},
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args != null && args['asset'] != null && _asset == null) {
      _asset = args['asset'] as AssetEntity;
      _loadFile();
    }
  }

  Future<void> _loadFile() async {
    final file = await _asset!.loadFile();
    if (mounted) setState(() => _file = file);
  }

  Future<void> _process() async {
    if (_file == null) return;
    setState(() => _uploading = true);
    try {
      final api = context.read<ApiService>();
      final filename = '${_asset?.id ?? 'image'}.jpg';
      final uploadData = await api.getUploadUrl(filename);
      await api.uploadFileToUrl(uploadData['url'], _file!);
      final job = await api.createJob(
        processingType: _processingType,
        inputKey: uploadData['key'],
      );
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/processing',
            arguments: {'jobId': job['job_id']});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('İşlem Seç')),
      body: Column(
        children: [
          // Preview
          if (_file != null)
            Expanded(
              flex: 5,
              child: Container(
                width: double.infinity,
                color: Colors.black,
                child: Image.file(_file!, fit: BoxFit.contain),
              ),
            )
          else
            const Expanded(
              flex: 5,
              child: Center(child: CircularProgressIndicator()),
            ),

          // Tool selector
          Expanded(
            flex: 4,
            child: Container(
              color: const Color(0xFF0F0F14),
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 90,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _types.length,
                      itemBuilder: (ctx, i) {
                        final t = _types[i];
                        final selected = _processingType == t['value'];
                        return GestureDetector(
                          onTap: () => setState(() => _processingType = t['value'] as String),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.only(right: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: selected
                                  ? (t['color'] as Color).withOpacity(0.2)
                                  : const Color(0xFF1A1A24),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: selected ? t['color'] as Color : Colors.transparent,
                                width: 1.5,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(t['icon'] as IconData,
                                    color: selected ? t['color'] as Color : Colors.white38,
                                    size: 24),
                                const SizedBox(height: 6),
                                Text(t['label'] as String,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: selected ? Colors.white : Colors.white38,
                                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                                    )),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    child: SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: (_file != null && !_uploading) ? _process : null,
                        child: _uploading
                            ? const SizedBox(width: 20, height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('İşlemi Başlat',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
