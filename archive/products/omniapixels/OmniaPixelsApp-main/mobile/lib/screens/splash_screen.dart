import 'dart:ui';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:provider/provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';

class CustomSplashScreen extends StatefulWidget {
  const CustomSplashScreen({super.key});

  @override
  State<CustomSplashScreen> createState() => _CustomSplashScreenState();
}

class _CustomSplashScreenState extends State<CustomSplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _mainController;
  late AnimationController _loopController;
  late AnimationController _dotsController;
  final AudioPlayer _audioPlayer = AudioPlayer();

  @override
  void initState() {
    super.initState();

    _mainController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _loopController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _dotsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();

    _startSplashSequence();
  }

  Future<void> _startSplashSequence() async {
    // 1. Play audio
    try {
      await _audioPlayer.setSourceAsset('audio/splash.mp3');
      await _audioPlayer.resume();
    } catch (e) {
      debugPrint("Audio could not play: \$e");
    }

    // 2. Start Main Entrance Animation
    _mainController.forward();

    // 3. Wait and Navigate
    await Future.delayed(const Duration(milliseconds: 2800));
    if (mounted) {
      context.go('/onboarding');
    }
  }

  @override
  void dispose() {
    _mainController.dispose();
    _loopController.dispose();
    _dotsController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Default to a dark theme for splash or use provider
    final colors = context.watch<ThemeProvider>().colors;

    // Animations
    final bgFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );

    final ring1Scale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.15, 0.9, curve: Curves.easeOut),
      ),
    );
    final ring1Fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.15, 0.9, curve: Curves.easeOut),
      ),
    );

    final ring2Scale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.25, 1.0, curve: Curves.easeOut),
      ),
    );
    final ring2Fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.25, 1.0, curve: Curves.easeOut),
      ),
    );

    final logoSlide =
        Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _mainController,
            curve: const Interval(0.1, 0.6, curve: Curves.easeOutCubic),
          ),
        );
    final logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.1, 0.6, curve: Curves.easeOutCubic),
      ),
    );
    final logoScale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.1, 0.6, curve: Curves.easeOutCubic),
      ),
    );

    final taglineFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.45, 0.85, curve: Curves.easeOut),
      ),
    );
    final loadingFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(0.7, 1.0, curve: Curves.easeOut),
      ),
    );

    return Scaffold(
      backgroundColor: const Color(
        0xFF060608,
      ), // Using strictly #060608 like React
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Ambient Glow
          AnimatedBuilder(
            animation: _mainController,
            builder: (context, child) {
              return Opacity(
                opacity: bgFade.value,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 320,
                      height: 320,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            Color(0x2EC9A84C), // 0.18
                            Color(0x0AC9A84C), // 0.04
                            Colors.transparent,
                          ],
                          stops: [0.0, 0.5, 0.7],
                        ),
                      ),
                    ),
                    BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                      child: Container(color: Colors.transparent),
                    ),
                    Container(
                      width: 208,
                      height: 208,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            Color(0x1AC9A84C), // 0.1
                            Colors.transparent,
                          ],
                          stops: [0.0, 0.7],
                        ),
                      ),
                    ),
                    BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                      child: Container(color: Colors.transparent),
                    ),
                  ],
                ),
              );
            },
          ),

          // Decorative Rings
          AnimatedBuilder(
            animation: _mainController,
            builder: (context, child) {
              return Stack(
                alignment: Alignment.center,
                children: [
                  Opacity(
                    opacity: ring1Fade.value,
                    child: Transform.scale(
                      scale: ring1Scale.value,
                      child: Container(
                        width: 280,
                        height: 280,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0x14C9A84C),
                          ), // 0.08
                        ),
                      ),
                    ),
                  ),
                  Opacity(
                    opacity: ring2Fade.value,
                    child: Transform.scale(
                      scale: ring2Scale.value,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0x1EC9A84C),
                          ), // 0.12
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),

          // Main Center Content
          AnimatedBuilder(
            animation: _mainController,
            builder: (context, child) {
              return Opacity(
                opacity: logoFade.value,
                child: SlideTransition(
                  position: logoSlide,
                  child: Transform.scale(
                    scale: logoScale.value,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Logo Build
                        SizedBox(
                          width: 90,
                          height: 90,
                          child: Stack(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  gradient: const LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      Color(0x26C9A84C),
                                      Color(0x0CC9A84C),
                                    ], // 0.15 to 0.05
                                  ),
                                  border: Border.all(
                                    color: const Color(0x4DC9A84C),
                                  ), // 0.30
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x33C9A84C), // 0.2
                                      blurRadius: 40,
                                    ),
                                    BoxShadow(
                                      color: Color(
                                        0x1AFFFFFF,
                                      ), // 0.1 white inner shadow cheat using top offset
                                      offset: Offset(0, 1),
                                      blurRadius: 0,
                                      blurStyle: BlurStyle.inner,
                                    ),
                                  ],
                                ),
                              ),
                              Center(
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  width: 48,
                                  height: 48,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Brand Name
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            const Text(
                              "Omnia",
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFF0F0FA),
                                letterSpacing: -0.64,
                              ),
                            ),
                            ShaderMask(
                              shaderCallback: (bounds) => const LinearGradient(
                                colors: [Color(0xFFE8C97A), Color(0xFFC9A84C)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ).createShader(bounds),
                              child: const Text(
                                "Pixels",
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: -0.64,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          "BY OMNIACREATA",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF6B6B84),
                            letterSpacing: 2.6, // 0.2em for 13px = 2.6
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Tagline
                        Opacity(
                          opacity: taglineFade.value,
                          child: const Text(
                            "Tek dokunuşla profesyonel fotoğraf",
                            style: TextStyle(
                              fontSize: 15,
                              color: Color(0xFF8A8A9E),
                              letterSpacing: 0.15,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),

          // Loading Indicator
          Positioned(
            bottom: 64,
            left: 0,
            right: 0,
            child: AnimatedBuilder(
              animation: _mainController,
              builder: (context, child) {
                return Opacity(
                  opacity: loadingFade.value,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(3, (index) {
                          return AnimatedBuilder(
                            animation: _dotsController,
                            builder: (context, child) {
                              final delay = index * 0.2;
                              final progress =
                                  (_dotsController.value - delay) % 1.0;
                              final opacity = progress < 0
                                  ? 0.3
                                  : (0.3 +
                                        0.7 * (1 - (progress * 2 - 1).abs()));
                              final scale = progress < 0
                                  ? 0.8
                                  : (0.8 +
                                        0.4 * (1 - (progress * 2 - 1).abs()));
                              return Transform.scale(
                                scale: scale,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFFC9A84C,
                                    ).withOpacity(opacity.clamp(0.0, 1.0)),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              );
                            },
                          );
                        }),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "AI motoru başlatılıyor...",
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF6B6B84),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // Corner decorations
          Positioned(top: 24, right: 24, child: _buildCornerDecor()),
          Positioned(bottom: 24, left: 24, child: _buildCornerDecor()),
        ],
      ),
    );
  }

  Widget _buildCornerDecor() {
    return Opacity(
      opacity: 0.2,
      child: CustomPaint(
        size: const Size(24, 24),
        painter: _CornerCrosshairPainter(),
      ),
    );
  }
}

class _CornerCrosshairPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFC9A84C)
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawLine(const Offset(6, 2), const Offset(2, 2), paint);
    canvas.drawLine(const Offset(2, 2), const Offset(2, 6), paint);

    canvas.drawLine(const Offset(18, 2), const Offset(22, 2), paint);
    canvas.drawLine(const Offset(22, 2), const Offset(22, 6), paint);

    canvas.drawLine(const Offset(6, 22), const Offset(2, 22), paint);
    canvas.drawLine(const Offset(2, 22), const Offset(2, 18), paint);

    canvas.drawLine(const Offset(18, 22), const Offset(22, 22), paint);
    canvas.drawLine(const Offset(22, 22), const Offset(22, 18), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
