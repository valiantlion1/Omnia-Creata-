import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../providers/gallery_provider.dart';
import '../theme/app_theme.dart';
import '../services/zerocost_service.dart';
import '../widgets/before_after_slider.dart';

/// Result screen showing processed image with Before/After comparison,
/// save, and share options. Platform-agnostic (no dart:io).
class ResultScreen extends StatefulWidget {
  final ZeroCostResult result;
  final String imageName;

  const ResultScreen({super.key, required this.result, required this.imageName});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  bool _showComparison = true;

  String get _actionLabel {
    switch (widget.result.action) {
      case ZeroCostAction.autoEnhance:
        return 'AI İyileştirme';
      case ZeroCostAction.upscale2x:
        return '2× Büyütme';
      case ZeroCostAction.denoise:
        return 'Gürültü Azaltma';
      case ZeroCostAction.grayscale:
        return 'Siyah-Beyaz';
      case ZeroCostAction.vignette:
        return 'Vinyet Efekti';
      case ZeroCostAction.cloudUpscale4x:
        return '4× Büyütme (Pro)';
      case ZeroCostAction.cloudBgRemove:
        return 'Arka Plan Silme';
      case ZeroCostAction.cloudDeblur:
        return 'Netleştirme (Pro)';
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: colors.textPrimary),
          onPressed: () {
            // Pop back to EditorHub
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
        ),
        title: Text(
          _actionLabel,
          style: TextStyle(
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              _showComparison ? Icons.compare : Icons.image,
              color: colors.accentGold,
            ),
            onPressed: () =>
                setState(() => _showComparison = !_showComparison),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Image / Comparison area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _showComparison
                      ? BeforeAfterSlider(
                          key: const ValueKey('comparison'),
                          beforeImage: widget.result.originalBytes,
                          afterImage: widget.result.processedBytes,
                          borderRadius: BorderRadius.circular(20),
                        )
                      : ClipRRect(
                          key: const ValueKey('result'),
                          borderRadius: BorderRadius.circular(20),
                          child: Image.memory(
                            widget.result.processedBytes,
                            fit: BoxFit.contain,
                          ),
                        ),
                ),
              ),
            ),

            // Stats chips
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildChip(
                    Icons.timer_outlined,
                    '${widget.result.processingTime.inMilliseconds}ms',
                    colors,
                  ),
                  const SizedBox(width: 12),
                  _buildChip(
                    widget.result.isCloud ? Icons.cloud_done_outlined : Icons.wifi_off_rounded,
                    widget.result.isCloud ? 'Bulutta İşlendi' : 'Cihazda İşlendi',
                    colors,
                  ),
                  const SizedBox(width: 12),
                  _buildChip(
                    Icons.shield_outlined,
                    'Ücretsiz',
                    colors,
                  ),
                ],
              ),
            ),

            // Action buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Row(
                children: [
                  // Save to gallery
                  Expanded(
                    child: SizedBox(
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: _handleSaveToGallery,
                        icon: Icon(Icons.save_alt, color: colors.background),
                        label: Text(
                          'Galeriye Kaydet',
                          style: TextStyle(
                            color: colors.background,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colors.accentGold,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Done button
                  SizedBox(
                    width: 54,
                    height: 54,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).popUntil((route) => route.isFirst);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.surfaceGlassMedium,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(color: colors.borderLight),
                        ),
                        padding: EdgeInsets.zero,
                      ),
                      child: Icon(Icons.check, color: colors.textPrimary, size: 22),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(IconData icon, String label, AppColors colors) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.surfaceGlass,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.borderLight),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: colors.accentGold),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: colors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _handleSaveToGallery() async {
    final gallery = context.read<GalleryProvider>();
    await gallery.saveImage(
      name: widget.imageName,
      action: widget.result.action.name,
      imageBytes: widget.result.processedBytes,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ "${widget.imageName}" galeriye kaydedildi'),
          backgroundColor: Colors.green.shade700,
        ),
      );
    }
  }
}
