import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class ProcessingScreen extends StatefulWidget {
  const ProcessingScreen({super.key});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> {
  Timer? _timer;
  int? _jobId;
  double _progress = 0;
  String _status = 'pending';
  Map<String, dynamic>? _jobData;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args != null && _jobId == null) {
      _jobId = args['jobId'];
      _startPolling();
    }
  }

  void _startPolling() {
    _timer = Timer.periodic(const Duration(seconds: 2), (_) => _poll());
  }

  Future<void> _poll() async {
    if (_jobId == null) return;
    try {
      final data = await context.read<ApiService>().getJobStatus(_jobId!);
      setState(() {
        _jobData = data;
        _progress = (data['progress'] ?? 0.0).toDouble();
        _status = data['status'] ?? 'pending';
      });
      if (_status == 'completed' || _status == 'failed') {
        _timer?.cancel();
        await Future.delayed(const Duration(milliseconds: 600));
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/result', arguments: {'jobData': _jobData});
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('İşleniyor')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 120, height: 120,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: _status == 'pending' ? null : _progress,
                      strokeWidth: 6,
                      backgroundColor: Colors.white12,
                      color: const Color(0xFF6C3CE1),
                    ),
                    Text(
                      _status == 'pending' ? '...' : '${(_progress * 100).toInt()}%',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Text(_statusText(), style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text('AI modeliniz görüntüyü işliyor', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  String _statusText() {
    switch (_status) {
      case 'processing': return 'İşleniyor...';
      case 'completed': return 'Tamamlandı!';
      case 'failed': return 'Hata oluştu';
      default: return 'Sıraya alındı...';
    }
  }
}
