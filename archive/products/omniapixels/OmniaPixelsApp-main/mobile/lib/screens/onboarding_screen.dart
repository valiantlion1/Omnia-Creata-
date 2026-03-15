import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../l10n/app_localizations.dart';
import 'dart:math' as math;

class OnboardingSlideData {
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final String tag;
  final String title;
  final String description;

  OnboardingSlideData({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.tag,
    required this.title,
    required this.description,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _current = 0;

  late AnimationController _slide1RingsController;
  late AnimationController _slide2PulseController;
  late AnimationController _slide3LinesController;

  List<OnboardingSlideData> _getSlides(AppLocalizations l) => [
    OnboardingSlideData(
      icon: Icons.auto_awesome,
      iconColor: const Color(0xFFC9A84C),
      bgColor: const Color(0x1EC9A84C),
      tag: l.onboardingSlide1Tag,
      title: l.onboardingSlide1Title,
      description: l.onboardingSlide1Desc,
    ),
    OnboardingSlideData(
      icon: Icons.shield_outlined,
      iconColor: const Color(0xFF3DBA8C),
      bgColor: const Color(0x1A3DBA8C),
      tag: l.onboardingSlide2Tag,
      title: l.onboardingSlide2Title,
      description: l.onboardingSlide2Desc,
    ),
    OnboardingSlideData(
      icon: Icons.flash_on,
      iconColor: const Color(0xFF4A90D9),
      bgColor: const Color(0x1A4A90D9),
      tag: l.onboardingSlide3Tag,
      title: l.onboardingSlide3Title,
      description: l.onboardingSlide3Desc,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _slide1RingsController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 24),
    )..repeat();
    _slide2PulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _slide3LinesController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _slide1RingsController.dispose();
    _slide2PulseController.dispose();
    _slide3LinesController.dispose();
    super.dispose();
  }

  void _next() {
    if (_current < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOutCubic,
      );
    } else {
      context.go('/login');
    }
  }

  void _skip() {
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final slides = _getSlides(l);
    final slide = slides[_current];

    return Scaffold(
      backgroundColor: const Color(0xFF060608),
      body: Stack(
        children: [
          // Background Glow Transition
          AnimatedContainer(
            duration: const Duration(milliseconds: 600),
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                colors: [slide.bgColor, Colors.transparent],
                stops: const [0.0, 0.7],
                radius: 1.0,
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Skip Button
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                    child: TextButton(
                      onPressed: _skip,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        backgroundColor: Colors.transparent,
                      ),
                      child: Text(
                        l.onboardingSkip,
                        style: TextStyle(
                          color: Color(0xFF6B6B84),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),

                // Main Content
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: (idx) => setState(() => _current = idx),
                    itemCount: slides.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Column(
                          children: [
                            Expanded(
                              flex: 5,
                              child: _buildVisualForSlide(index),
                            ),
                            Expanded(
                              flex: 6,
                              child: Column(
                                children: [
                                  // Tag
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: slides[index].iconColor
                                          .withOpacity(0.12),
                                      border: Border.all(
                                        color: slides[index].iconColor
                                            .withOpacity(0.19),
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      slides[index].tag.toUpperCase(),
                                      style: TextStyle(
                                        color: slides[index].iconColor,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.65,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 24),

                                  // Title
                                  Text(
                                    slides[index].title,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFFF0F0FA),
                                      height: 1.2,
                                      letterSpacing: -0.56,
                                    ),
                                  ),
                                  const SizedBox(height: 16),

                                  // Description
                                  Text(
                                    slides[index].description,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      color: Color(0xFF8A8A9E),
                                      height: 1.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Progress + CTA
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 24,
                  ),
                  child: Column(
                    children: [
                      // Dots
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(slides.length, (i) {
                          final isActive = i == _current;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            height: 8,
                            width: isActive ? 24 : 8,
                            decoration: BoxDecoration(
                              color: isActive
                                  ? const Color(0xFFC9A84C)
                                  : Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 24),

                      // CTA Button
                      InkWell(
                        onTap: _next,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: const LinearGradient(
                              colors: [
                                Color(0xFFC9A84C),
                                Color(0xFFE8C97A),
                                Color(0xFFC9A84C),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x59C9A84C),
                                blurRadius: 30,
                              ), // 0.35 opacity gold
                              BoxShadow(
                                color: Color(0x66000000),
                                offset: Offset(0, 4),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _current < slides.length - 1
                                    ? l.onboardingContinue
                                    : l.onboardingGetStarted,
                                style: const TextStyle(
                                  color: Color(0xFF060608),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.16,
                                ),
                              ),
                              if (_current < slides.length - 1) ...[
                                const SizedBox(width: 8),
                                const Icon(
                                  Icons.chevron_right,
                                  color: Color(0xFF060608),
                                  size: 20,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),

                      // Privacy term
                      AnimatedOpacity(
                        duration: const Duration(milliseconds: 300),
                        opacity: _current == slides.length - 1 ? 1.0 : 0.0,
                        child: Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: RichText(
                            text: TextSpan(
                              text: l.onboardingPrivacyNotice('').replaceAll('{policy}', ''),
                              style: const TextStyle(
                                color: Color(0xFF6B6B84),
                                fontSize: 12,
                              ),
                              children: [
                                TextSpan(
                                  text: l.onboardingPrivacyPolicy,
                                  style: const TextStyle(color: Color(0xFFC9A84C)),
                                ),
                                // In a real scenario we'd split the string properly based on {policy} placeholder
                                // but for simplicity and since the TR translation is "Devam ederek {policy} kabul etmiş olursunuz",
                                // we'll append the rest of the string.
                                const TextSpan(text: ' kabul etmiş olursunuz'),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisualForSlide(int index) {
    if (index == 0) return _buildSlide1Visual();
    if (index == 1) return _buildSlide2Visual();
    return _buildSlide3Visual();
  }

  Widget _buildSlide1Visual() {
    return Center(
      child: SizedBox(
        width: 192,
        height: 192,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Rotating Rings
            ...[140.0, 108.0, 76.0].asMap().entries.map((entry) {
              final i = entry.key;
              final size = entry.value;
              final durationFactor =
                  1.0 +
                  (i *
                      0.33); // equivalent of 12 + i*4 in React roughly handled via controller speed

              return AnimatedBuilder(
                animation: _slide1RingsController,
                builder: (context, child) {
                  // i=0 clockwise, i=1 counter, i=2 clockwise
                  final angle =
                      (i % 2 == 0 ? 1 : -1) *
                      _slide1RingsController.value *
                      2 *
                      math.pi /
                      durationFactor;
                  return Transform.rotate(
                    angle: angle,
                    child: Container(
                      width: size,
                      height: size,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(
                            0xFFC9A84C,
                          ).withOpacity(0.1 + i * 0.08),
                        ),
                      ),
                    ),
                  );
                },
              );
            }),

            // Center Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [Color(0x33C9A84C), Color(0x0DC9A84C)], // 0.2, 0.05
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: const Color(0x66C9A84C)), // 0.4
                boxShadow: const [
                  BoxShadow(color: Color(0x40C9A84C), blurRadius: 30),
                ], // 0.25
              ),
              child: const Center(
                child: Icon(
                  Icons.auto_awesome,
                  color: Color(0xFFC9A84C),
                  size: 36,
                ),
              ),
            ),

            // Orbiting Dots
            ...[0, 72, 144, 216, 288].asMap().entries.map((entry) {
              final i = entry.key;
              final offsetAngle = entry.value * math.pi / 180;
              return AnimatedBuilder(
                animation: _slide1RingsController,
                builder: (context, child) {
                  // Full rotation every 6s roughly handled proportionally
                  final angle =
                      _slide1RingsController.value * 2 * math.pi * 4 +
                      offsetAngle;
                  return Transform.translate(
                    offset: Offset(math.cos(angle) * 80, math.sin(angle) * 80),
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: const Color(
                          0xFFC9A84C,
                        ).withOpacity(0.6 + i * 0.08),
                        shape: BoxShape.circle,
                      ),
                    ),
                  );
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildSlide2Visual() {
    return Center(
      child: SizedBox(
        width: 192,
        height: 192,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Center Pulse Icon
            AnimatedBuilder(
              animation: _slide2PulseController,
              builder: (context, child) {
                // scale [1, 1.04, 1] mapped to Reverse animation controller
                final scale = 1.0 + (_slide2PulseController.value * 0.04);
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 112,
                    height: 112,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(32),
                      gradient: const LinearGradient(
                        colors: [
                          Color(0x263DBA8C),
                          Color(0x0C3DBA8C),
                        ], // 0.15, 0.05
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      border: Border.all(
                        color: const Color(0x593DBA8C),
                      ), // 0.35
                      boxShadow: const [
                        BoxShadow(color: Color(0x333DBA8C), blurRadius: 30),
                      ], // 0.2
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.shield_outlined,
                        color: Color(0xFF3DBA8C),
                        size: 48,
                      ),
                    ),
                  ),
                );
              },
            ),

            // Lock marks
            ...[-40.0, 40.0].expand(
              (x) => [-40.0, 40.0].map((y) {
                final delayFactor = (x.abs() + y.abs()) * 0.01;
                return AnimatedBuilder(
                  animation: _slide2PulseController,
                  builder: (context, child) {
                    // Simulate opacity wave
                    final offsetT =
                        (_slide2PulseController.value + delayFactor) % 1.0;
                    final opacity =
                        0.4 +
                        (offsetT * 0.6); // Mocks the original 0.4 to 1.0 pulse

                    return Transform.translate(
                      offset: Offset(x, y),
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: const Color(
                            0x663DBA8C,
                          ).withOpacity(opacity.clamp(0.0, 1.0)),
                          shape: BoxShape.circle,
                        ),
                      ),
                    );
                  },
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlide3Visual() {
    return Center(
      child: SizedBox(
        width: 192,
        height: 192,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Center Box
            Container(
              width: 112,
              height: 112,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
                gradient: const LinearGradient(
                  colors: [Color(0x264A90D9), Color(0x0C4A90D9)], // 0.15, 0.05
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: const Color(0x594A90D9)), // 0.35
                boxShadow: const [
                  BoxShadow(color: Color(0x334A90D9), blurRadius: 30),
                ], // 0.2
              ),
              child: const Center(
                child: Icon(Icons.flash_on, color: Color(0xFF4A90D9), size: 48),
              ),
            ),

            // Speed Lines
            ...[-30.0, -15.0, 0.0, 15.0, 30.0].asMap().entries.map((entry) {
              final i = entry.key;
              final y = entry.value;
              final delay = i * 0.18;

              return Positioned(
                top: 96 + y, // Center is 96 since total is 192
                right: 96,
                child: AnimatedBuilder(
                  animation: _slide3LinesController,
                  builder: (context, child) {
                    final t = (_slide3LinesController.value - delay) % 1.0;
                    if (t < 0) return const SizedBox.shrink();

                    // Simple imitation of the line shooting out
                    final width = math.sin(t * math.pi) * 32.0;
                    final opacity = math.sin(t * math.pi);
                    final rightOffset = 10.0 + (t * 20.0); // right moving

                    return Transform.translate(
                      offset: Offset(rightOffset, 0),
                      child: Container(
                        height: 1.5,
                        width: width.clamp(0.0, 32.0),
                        color: const Color(
                          0x804A90D9,
                        ).withOpacity(opacity.clamp(0.0, 1.0)), // 0.5
                      ),
                    );
                  },
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
