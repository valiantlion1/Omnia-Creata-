import 'dart:io';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../services/storage_service.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  Map<String, dynamic>? _jobData;
  File? _resultFile;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args != null && _jobData == null) {
      _jobData = Map<String, dynamic>.from(args['jobData']);
      _download();
    }
  }

  Future<void> _download() async {
    final url = _jobData?['output_url'];
    if (url == null) { setState(() => _loading = false); return; }
    try {
      final file = await StorageService().downloadFile(url, 'result_${_jobData!['job_id']}.jpg');
      setState(() { _resultFile = file; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final success = _jobData?['status'] == 'completed';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sonuç'),
        actions: [
          if (_resultFile != null)
            IconButton(
              icon: const Icon(Icons.share),
              onPressed: () => Share.shareXFiles([XFile(_resultFile!.path)]),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _resultFile != null
                    ? Image.file(_resultFile!, fit: BoxFit.contain, width: double.infinity)
                    : Center(
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(success ? Icons.check_circle : Icons.error,
                              size: 64, color: success ? Colors.green : Colors.red),
                          const SizedBox(height: 16),
                          Text(success ? 'İşlem tamamlandı' : (_jobData?['error'] ?? 'Hata oluştu'),
                              style: const TextStyle(color: Colors.white70)),
                        ]),
                      ),
          ),
          if (_resultFile != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Share.shareXFiles([XFile(_resultFile!.path)]),
                    icon: const Icon(Icons.share),
                    label: const Text('Paylaş'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false),
                    icon: const Icon(Icons.home_outlined),
                    label: const Text('Ana Sayfa'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white24),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ]),
            ),
        ],
      ),
    );
  }
}
