import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../services/zerocost_service.dart';
import '../services/ai_service.dart';
import '../theme/app_theme.dart';
import '../widgets/ai_glow_animation.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import 'result_screen.dart';

/// Full-screen processing screen with AI glow animation.
/// Accepts Uint8List (platform-agnostic, works on Web + Android).
class ProcessingScreen extends StatefulWidget {
  final Uint8List imageBytes;
  final String imageName;
  final ZeroCostAction action;

  const ProcessingScreen({
    super.key,
    required this.imageBytes,
    required this.imageName,
    required this.action,
  });

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> {
  final ZeroCostService _service = ZeroCostService();

  double _progress = 0.0;
  String _stepName = 'Hazırlanıyor...';
  bool _isComplete = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startProcessing();
  }

  Future<void> _startProcessing() async {
    try {
      final isCloud = widget.action == ZeroCostAction.cloudUpscale4x || 
                      widget.action == ZeroCostAction.cloudBgRemove ||
                      widget.action == ZeroCostAction.cloudDeblur;
      
      ZeroCostResult result;

      if (isCloud) {
        final stopwatch = Stopwatch()..start();
        final aiService = AiService();
        String taskType = 'enhance';
        Map<String, dynamic> params = {};
        
        if (widget.action == ZeroCostAction.cloudUpscale4x) {
           taskType = 'upscale';
           params['scale'] = 4;
        } else if (widget.action == ZeroCostAction.cloudBgRemove) {
           taskType = 'remove_bg';
        } else if (widget.action == ZeroCostAction.cloudDeblur) {
           taskType = 'denoise';
        }

        if (mounted) setState(() => _stepName = 'Buluta bağlanılıyor...');

        final resultBytes = await aiService.processImage(
            inputBytes: widget.imageBytes,
            filename: widget.imageName,
            taskType: taskType,
            params: params,
            onProgress: (p) {
               if (mounted) setState(() => _progress = p);
            }
        );
        stopwatch.stop();

        if (mounted) setState(() => _stepName = 'Tamamlandı!');
        
        result = ZeroCostResult(
           originalBytes: widget.imageBytes,
           processedBytes: resultBytes,
           processingTime: stopwatch.elapsed,
           action: widget.action,
           isCloud: true,
        );
      } else {
        result = await _service.process(
          inputBytes: widget.imageBytes,
          action: widget.action,
          onProgress: (p) {
            if (mounted) setState(() => _progress = p);
          },
          onStep: (step) {
            if (mounted) setState(() => _stepName = step);
          },
        );
      }

      if (mounted) {
        setState(() => _isComplete = true);
        await Future.delayed(const Duration(milliseconds: 600));
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => ResultScreen(
                result: result,
                imageName: widget.imageName,
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;

    return Scaffold(
      backgroundColor: colors.background,
      body: Center(
        child: _errorMessage != null
            ? _buildErrorView(colors)
            : _buildProcessingView(colors),
      ),
    );
  }

  Widget _buildProcessingView(AppColors colors) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AiGlowAnimation(
          color: colors.accentGold,
          size: 200,
          isActive: !_isComplete,
          child: _isComplete
              ? Icon(Icons.check_circle, color: colors.accentGold, size: 48)
              : Icon(Icons.auto_awesome, color: colors.accentGold, size: 40),
        ),
        const SizedBox(height: 40),

        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Text(
            _stepName,
            key: ValueKey(_stepName),
            style: TextStyle(
              color: colors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: 16),

        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 60),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: _progress,
              minHeight: 6,
              backgroundColor: colors.surfaceGlass,
              valueColor: AlwaysStoppedAnimation<Color>(colors.accentGold),
            ),
          ),
        ),
        const SizedBox(height: 12),

        Text(
          '${(_progress * 100).toInt()}%',
          style: TextStyle(
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 40),

        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shield_outlined,
                size: 14, color: colors.textMuted.withOpacity(0.6)),
            const SizedBox(width: 6),
            Text(
              'Cihazınızda güvenle işleniyor',
              style: TextStyle(
                color: colors.textMuted.withOpacity(0.6),
                fontSize: 12,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildErrorView(AppColors colors) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, color: colors.accentRed, size: 56),
          const SizedBox(height: 20),
          Text(
            'İşlem Başarısız',
            style: TextStyle(
                color: colors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            _errorMessage ?? '',
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.textMuted, fontSize: 14),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back),
            label: const Text('Geri Dön'),
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.accentGold,
              foregroundColor: colors.background,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}
