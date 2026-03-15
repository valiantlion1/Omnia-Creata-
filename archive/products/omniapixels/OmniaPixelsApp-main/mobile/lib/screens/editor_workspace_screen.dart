import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:crop_your_image/crop_your_image.dart';

import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../providers/theme_provider.dart';
import '../providers/credit_provider.dart';
import '../services/zerocost_service.dart';
import '../widgets/premium_ui.dart';
import 'processing_screen.dart';

enum EditorMode { view, crop, brush, adjust }

class EditorWorkspaceScreen extends StatefulWidget {
  final XFile pickedFile;

  const EditorWorkspaceScreen({super.key, required this.pickedFile});

  @override
  State<EditorWorkspaceScreen> createState() => _EditorWorkspaceScreenState();
}

class _EditorWorkspaceScreenState extends State<EditorWorkspaceScreen> {
  Uint8List? _imageBytes;
  EditorMode _mode = EditorMode.view;
  
  // Brush State
  List<List<Offset>> _brushStrokes = [];
  double _brushSize = 20.0;

  // Crop State
  final CropController _cropController = CropController();
  double? _targetAspectRatio;

  // Adjust State
  double _brightness = 0.0;
  double _contrast = 1.0;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  Future<void> _loadImage() async {
    final bytes = await widget.pickedFile.readAsBytes();
    if (mounted) {
      setState(() {
        _imageBytes = bytes;
      });
    }
  }

  ZeroCostAction? _mapToZeroCost(String label, AppLocalizations l) {
    if (label == l.editorToolEnhance) return ZeroCostAction.autoEnhance;
    if (label == l.editorToolUpscale) return ZeroCostAction.cloudUpscale4x;
    if (label == l.editorToolBgRemove) return ZeroCostAction.cloudBgRemove;
    if (label == l.editorToolDeblur) return ZeroCostAction.denoise;
    if (label == l.editorToolStyle) return ZeroCostAction.grayscale;
    if (label == l.editorToolCompare) return ZeroCostAction.vignette;
    return null;
  }

  Future<void> _handleToolAction(String actionLabel, Color iconColor, AppLocalizations l) async {
    final zeroCostAction = _mapToZeroCost(actionLabel, l);
    if (zeroCostAction == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Bu araç henüz hazır değil veya bulut gerektiriyor', style: const TextStyle(color: Colors.white)),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final creditProvider = context.read<CreditProvider>();
    final cost = CreditProvider.getCost(zeroCostAction.name);
    
    if (!creditProvider.useCredits(cost)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Yeterli krediniz yok! Kredi kazanabilirsiniz.'),
          backgroundColor: Colors.orangeAccent,
          action: SnackBarAction(
            label: 'Pro\'ya Geç',
            textColor: Colors.white,
            onPressed: () => context.push('/paywall'),
          ),
        ),
      );
      return;
    }

    if (_imageBytes == null) return;

    if (!mounted) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProcessingScreen(
          imageBytes: _imageBytes!,
          imageName: widget.pickedFile.name,
          action: zeroCostAction,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;

    final tools = [
      {'icon': Icons.auto_awesome, 'label': l.editorToolEnhance, 'c': colors.accentGold, 'credits': 1},
      {'icon': Icons.content_cut, 'label': l.editorToolBgRemove, 'c': colors.accentRed, 'credits': 2},
      {'icon': Icons.zoom_out_map, 'label': l.editorToolUpscale, 'c': colors.accentBlue, 'credits': 2},
      {'icon': Icons.blur_off, 'label': l.editorToolDeblur, 'c': colors.accentGreen, 'credits': 1},
      {'icon': Icons.palette_outlined, 'label': l.editorToolStyle, 'c': colors.accentPurple, 'credits': 3},
      {'icon': Icons.filter_vintage_outlined, 'label': l.editorToolCompare, 'c': colors.accentOrange, 'credits': 0},
    ];

    return Scaffold(
      backgroundColor: Colors.black, // Resim altı tam siyah
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. TAM EKRAN RESIM ALANI VEYA KIRPMA/FIRCA MODU
          _imageBytes == null
              ? Center(child: CircularProgressIndicator(color: colors.accentGold))
              : Positioned.fill(
                  child: _buildImageWorkspace(),
                ),

          // 2. YUKARIDAKI CAM (GLASS) TOP BAR
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: PremiumGlassCard(
              borderRadius: 24,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: Icon(Icons.close, color: colors.textPrimary, size: 24),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => context.pop(),
                  ),
                  Text(
                    "Pro Editor",
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Orijinal fotoğrafı kaydetmek için bir işlem yapmanız gerek")));
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: colors.accentGold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text("Kaydet", style: TextStyle(color: colors.accentGold, fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. ALT KISIM (TOOL VEYA MOD AYARLARI)
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 20,
            left: 16,
            right: 16,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // MOD AKTIFSE - İPTAL/ONAY BARI HOVER GIBI CIKAR
                if (_mode != EditorMode.view) ...[
                  PremiumGlassCard(
                    borderRadius: 24,
                    isAccent: true,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              _mode == EditorMode.brush ? "Fırça: Maskelenecek alanı boyayın" : 
                              _mode == EditorMode.crop ? "Kırpma Modu" : "Ayarlar Modu",
                              style: TextStyle(color: colors.accentGold, fontWeight: FontWeight.bold, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.check_circle, color: colors.accentGold, size: 28),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () {
                              setState(() {
                                _mode = EditorMode.view;
                              });
                            },
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // ANA TOOL VEYA ALT AYAR KARTI
                PremiumGlassCard(
                  borderRadius: 30, // Hap (Pill) seklinde
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _mode == EditorMode.view 
                      ? _buildMainToolbar(colors, l, tools)
                      : _buildModeToolbar(colors),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- SUB WIDGETS ---

  Widget _buildImageWorkspace() {
    if (_mode == EditorMode.brush) {
      return GestureDetector(
        onPanStart: (details) {
          setState(() {
            _brushStrokes.add([details.localPosition]);
          });
        },
        onPanUpdate: (details) {
          setState(() {
            _brushStrokes.last.add(details.localPosition);
          });
        },
        child: Stack(
          fit: StackFit.loose,
          alignment: Alignment.center,
          children: [
            Image.memory(
              _imageBytes!,
              fit: BoxFit.contain, // To ensure brush path perfectly aligns we will later wrap this in strict size constraints
              width: double.infinity,
              height: double.infinity,
            ),
            CustomPaint(
              painter: BrushPainter(_brushStrokes, _brushSize),
              size: Size.infinite,
            ),
          ],
        ),
      );
    } else if (_mode == EditorMode.crop) {
      final colors = context.read<ThemeProvider>().colors;
      return Crop(
        image: _imageBytes!,
        controller: _cropController,
        onCropped: (dynamic result) {
          if (mounted) {
            Uint8List? finalBytes;
            if (result is Uint8List) {
              finalBytes = result;
            } else {
              // Assume CropSuccess or similar containing a data/image field
              finalBytes = result.data as Uint8List?;
            }
            if (finalBytes != null) {
              setState(() {
                _imageBytes = finalBytes;
                _mode = EditorMode.view;
              });
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Görsel başarıyla kırpıldı")));
            }
          }
        },
        aspectRatio: _targetAspectRatio,
        baseColor: colors.backgroundSecondary,
        maskColor: Colors.black.withOpacity(0.6),
        cornerDotBuilder: (size, edgeAlignment) => DotControl(color: colors.accentGold),
      );
    }

    // Default View Mode (Interactive Pan/Zoom)
    return InteractiveViewer(
      minScale: 1.0,
      maxScale: 4.0,
      boundaryMargin: const EdgeInsets.all(double.infinity),
      clipBehavior: Clip.none,
      child: Center(
        child: ColorFiltered(
          colorFilter: ColorFilter.matrix(_getAdjustMatrix()),
          child: Image.memory(
            _imageBytes!,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }

  List<double> _getAdjustMatrix() {
    // Basic brightness/contrast matrix
    // Adjusts Brightness (-1 to 1) and Contrast (0.5 to 2.0)
    final b = _brightness * 255;
    final c = _contrast;
    final t = (1.0 - c) * 128 + b;

    return [
      c, 0, 0, 0, t,
      0, c, 0, 0, t,
      0, 0, c, 0, t,
      0, 0, 0, 1, 0,
    ];
  }

  Widget _buildModeToolbar(AppColors colors) {
    if (_mode == EditorMode.brush) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Fırça Boyutu", style: TextStyle(color: colors.textSecondary, fontSize: 13)),
                TextButton.icon(
                  icon: Icon(Icons.undo, color: colors.textPrimary, size: 16),
                  label: Text("Geri Al", style: TextStyle(color: colors.textPrimary)),
                  onPressed: () {
                    if (_brushStrokes.isNotEmpty) {
                      setState(() {
                        _brushStrokes.removeLast();
                      });
                    }
                  },
                )
              ],
            ),
            Slider(
              value: _brushSize,
              min: 5.0,
              max: 50.0,
              activeColor: colors.accentGold,
              inactiveColor: colors.borderMedium,
              onChanged: (val) {
                setState(() { _brushSize = val; });
              },
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: colors.accentGold),
                onPressed: () {
                  // TODO: Inpaint backend call with mask
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Ağ ile Inpaint isteği (Maskeli) gönderiliyor..")));
                  setState(() { _mode = EditorMode.view; });
                },
                child: Text("Bölgeyi Yenile (Inpaint)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      );
    } else if (_mode == EditorMode.crop) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                   _buildRatioButton("Serbest", null, colors),
                   _buildRatioButton("1:1 Kare", 1.0, colors),
                   _buildRatioButton("4:3", 4.0 / 3.0, colors),
                   _buildRatioButton("3:4", 3.0 / 4.0, colors),
                   _buildRatioButton("16:9", 16.0 / 9.0, colors),
                   _buildRatioButton("9:16", 9.0 / 16.0, colors),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: colors.surfaceGlassLight),
                onPressed: () {
                  _cropController.crop();
                },
                child: Text("Kırpmayı Onayla", style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      );
    } else if (_mode == EditorMode.adjust) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Parlaklık", style: TextStyle(color: colors.textSecondary, fontSize: 13)),
            Slider(
              value: _brightness,
              min: -1.0,
              max: 1.0,
              activeColor: colors.accentGold,
              inactiveColor: colors.borderMedium,
              onChanged: (val) {
                setState(() { _brightness = val; });
              },
            ),
            const SizedBox(height: 8),
            Text("Kontrast", style: TextStyle(color: colors.textSecondary, fontSize: 13)),
            Slider(
              value: _contrast,
              min: 0.5,
              max: 2.0,
              activeColor: colors.accentGold,
              inactiveColor: colors.borderMedium,
              onChanged: (val) {
                setState(() { _contrast = val; });
              },
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: colors.surfaceGlassLight),
                onPressed: () {
                  // TODO: Apply adjustments
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Ayarlar uygulandı")));
                  setState(() { _mode = EditorMode.view; });
                },
                child: Text("Uygula", style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      );
    }
    
    // Fallback for crop/adjust (placeholder)
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: Text("Bu araç şu anda inşa ediliyor.", style: TextStyle(color: colors.textMuted)),
      ),
    );
  }

  Widget _buildRatioButton(String label, double? ratio, AppColors colors) {
    final isSelected = _targetAspectRatio == ratio;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? colors.background : colors.textPrimary)),
        selected: isSelected,
        selectedColor: colors.textPrimary,
        backgroundColor: colors.backgroundSecondary,
        showCheckmark: false,
        onSelected: (bool selected) {
          setState(() {
            _targetAspectRatio = ratio;
            if (ratio != null) {
              _cropController.aspectRatio = ratio;
            } else {
              _cropController.aspectRatio = null;
            }
          });
        },
      ),
    );
  }

  Widget _buildMainToolbar(AppColors colors, AppLocalizations l, List<Map<String, dynamic>> tools) {
    // Inject Interactive Tools at the start
    final interactiveTools = [
      {'icon': Icons.crop, 'label': 'Kırp', 'c': colors.textPrimary, 'credits': 0, 'mode': EditorMode.crop},
      {'icon': Icons.brush, 'label': 'Fırça/Inpaint', 'c': colors.textPrimary, 'credits': 0, 'mode': EditorMode.brush},
      {'icon': Icons.tune, 'label': 'Ayarlar', 'c': colors.textPrimary, 'credits': 0, 'mode': EditorMode.adjust},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 0),
      child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ...interactiveTools.map((tool) => _buildToolItem(tool, colors, l, isInteractive: true)),
                Container(
                  width: 1, 
                  height: 40, 
                  color: colors.borderMedium, 
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)
                ),
                ...tools.map((tool) => _buildToolItem(tool, colors, l, isInteractive: false)),
              ],
            ),
          ),
      ),
    );
  }

  Widget _buildToolItem(Map<String, dynamic> tool, AppColors colors, AppLocalizations l, {required bool isInteractive}) {
    final iconColor = tool['c'] as Color;
    final label = tool['label'] as String;
    final credits = tool['credits'] as int;

    return Padding(
      padding: const EdgeInsets.only(right: 16.0),
      child: GestureDetector(
        onTap: () {
          if (isInteractive) {
            setState(() {
              _mode = tool['mode'] as EditorMode;
            });
          } else {
            _handleToolAction(label, iconColor, l);
          }
        },
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: isInteractive ? colors.surfaceGlassLight : iconColor.withOpacity(0.12),
                shape: BoxShape.circle,
                border: Border.all(color: isInteractive ? colors.borderLight : iconColor.withOpacity(0.3)),
              ),
              child: Icon(tool['icon'] as IconData, color: iconColor, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (credits > 0)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.flash_on, color: colors.accentGold, size: 10),
                    const SizedBox(width: 2),
                    Text('$credits', style: TextStyle(color: colors.accentGold, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// Custom Painter for Brush Mask
class BrushPainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final double brushSize;

  BrushPainter(this.strokes, this.brushSize);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.redAccent.withOpacity(0.5)
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke
      ..strokeWidth = brushSize;

    for (final stroke in strokes) {
      if (stroke.isEmpty) continue;
      
      final path = Path();
      path.moveTo(stroke.first.dx, stroke.first.dy);
      
      for (int i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant BrushPainter oldDelegate) => true;
}
