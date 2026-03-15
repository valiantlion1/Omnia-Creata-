import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/premium_ui.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/credit_provider.dart';
import '../l10n/app_localizations.dart';
import '../widgets/glow_orbs_background.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String _mode = 'login'; // 'login' or 'register'
  bool _showPass = false;
  bool _isLoading = false;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen email ve şifre giriniz')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final auth = context.read<AuthProvider>();
      final creditProv = context.read<CreditProvider>();
      final emailLower = _emailController.text.toLowerCase().trim();

      if (_mode == 'login') {
        await auth.login(emailLower, _passwordController.text);
      } else {
        await auth.register(emailLower, _passwordController.text);
        // Otomatik login yap
        await auth.login(emailLower, _passwordController.text);
      }

      if (emailLower == 'admin@omniapixels.com' ||
          emailLower == 'valiantlion@omniapixels.com') {
        creditProv.setAdminStatus(true);
      } else {
        creditProv.setAdminStatus(false);
      }

      // Başarılı olursa router dinleyicisi yönlendirebilir ancak Web üzerindeki 
      // MouseTracker çökmesi (Assertion Failed) ihtimaline karşı Open/Manual Redirect:
      if (mounted) {
        Future.delayed(const Duration(milliseconds: 350), () {
          if (mounted) context.pushReplacement('/');
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: colors.background,
      body: Stack(
        children: [
          // Background ambient pulse (Animated)
          const Positioned.fill(
            child: GlowOrbsBackground(
              baseColor: Color(0xFFC9A84C), // accentGold
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Header (Back button)
                Padding(
                  padding: const EdgeInsets.only(
                    left: 24.0,
                    right: 24.0,
                    top: 16.0,
                    bottom: 8.0,
                  ),
                  child: Row(
                    children: [
                      InkWell(
                        onTap: () => context.go('/onboarding'),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: colors.surfaceGlassLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: colors.borderLight),
                          ),
                          child: Icon(
                            Icons.arrow_back,
                            size: 18,
                            color: colors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                    child: Column(
                      children: [
                        // Logo & Title
                        const SizedBox(height: 8),
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                colors.accentGold.withOpacity(0.15),
                                colors.accentGold.withOpacity(0.05),
                              ],
                            ),
                            border: Border.all(
                              color: colors.accentGold.withOpacity(0.3),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: colors.accentGold.withOpacity(0.15),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Image.asset(
                              'assets/images/logo.png',
                              width: 28,
                              height: 28,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _mode == 'login'
                              ? l.loginWelcomeBack
                              : l.loginCreateAccount,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontSize: 24,
                                letterSpacing: -0.48, // -0.02em
                                color: colors.textPrimary,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _mode == 'login'
                              ? l.loginSubtitle
                              : l.loginRegisterSubtitle,
                          style: TextStyle(
                            color: colors.textSecondary,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),

                        // Tab Switcher
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: colors.surfaceGlass,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: colors.borderLight),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () => setState(() => _mode = 'login'),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _mode == 'login'
                                          ? colors.accentGold.withOpacity(0.15)
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: _mode == 'login'
                                            ? colors.accentGold.withOpacity(
                                                0.25,
                                              )
                                            : Colors.transparent,
                                      ),
                                    ),
                                    child: Center(
                                      child: Text(
                                        l.loginTabSignIn,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: _mode == 'login'
                                              ? colors.accentGold
                                              : colors.textMuted,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: InkWell(
                                  onTap: () =>
                                      setState(() => _mode = 'register'),
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _mode == 'register'
                                          ? colors.accentGold.withOpacity(0.15)
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: _mode == 'register'
                                            ? colors.accentGold.withOpacity(
                                                0.25,
                                              )
                                            : Colors.transparent,
                                      ),
                                    ),
                                    child: Center(
                                      child: Text(
                                        l.loginTabSignUp,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: _mode == 'register'
                                              ? colors.accentGold
                                              : colors.textMuted,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Form
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: Column(
                            key: ValueKey(_mode),
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_mode == 'register') ...[
                                _buildLabel(l.loginNameLabel, colors),
                                const SizedBox(height: 8),
                                _buildInput(
                                  icon: Icons.person_outline,
                                  hint: l.loginNameHint,
                                  controller: _nameController,
                                  colors: colors,
                                ),
                                const SizedBox(height: 16),
                              ],

                              _buildLabel(l.loginEmailLabel, colors),
                              const SizedBox(height: 8),
                              _buildInput(
                                icon: Icons.email_outlined,
                                hint: l.loginEmailHint,
                                controller: _emailController,
                                isEmail: true,
                                colors: colors,
                              ),
                              const SizedBox(height: 16),

                              _buildLabel(l.loginPasswordLabel, colors),
                              const SizedBox(height: 6),
                              _buildInput(
                                icon: Icons.lock_outline,
                                hint: l.loginPasswordHint,
                                controller: _passwordController,
                                isPassword: true,
                                showPass: _showPass,
                                onTogglePass: () =>
                                    setState(() => _showPass = !_showPass),
                                colors: colors,
                              ),

                              if (_mode == 'login') ...[
                                const SizedBox(height: 16),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: () {},
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize:
                                          MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      l.loginForgotPassword,
                                      style: TextStyle(
                                        color: colors.accentGold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Submit Button
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              gradient: _isLoading
                                  ? null
                                  : LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        colors.accentGold,
                                        colors.accentGoldLight,
                                        colors.accentGold,
                                      ],
                                    ),
                              color: _isLoading
                                  ? colors.accentGold.withOpacity(0.3)
                                  : null,
                              boxShadow: _isLoading
                                  ? []
                                  : AppTheme.premiumShadow,
                            ),
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleSubmit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              child: _isLoading
                                  ? SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        color: colors.accentGold,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      _mode == 'login'
                                          ? l.loginSignInButton
                                          : l.loginSignUpButton,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: colors.background,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Divider
                        Row(
                          children: [
                            Expanded(
                              child: Divider(
                                color: colors.borderLight,
                                thickness: 1,
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              child: Text(
                                l.loginOrDivider,
                                style: TextStyle(
                                  color: colors.textMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Divider(
                                color: colors.borderLight,
                                thickness: 1,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Social Buttons
                        _buildSocialButton(
                          l.loginGoogleButton,
                          'assets/images/google.png',
                          colors,
                        ),
                        const SizedBox(height: 12),
                        _buildSocialButton(
                          l.loginAppleButton,
                          'assets/images/apple.png',
                          colors,
                        ), // Note: Needs actual icon in assets or from font

                        const SizedBox(height: 24),

                        TextButton.icon(
                          onPressed: _isLoading ? null : () async {
                            setState(() => _isLoading = true);
                            await context.read<AuthProvider>().loginAsGuest();
                            if (mounted) {
                              Future.delayed(const Duration(milliseconds: 350), () {
                                if (mounted) context.pushReplacement('/');
                              });
                            }
                          },
                          icon: Icon(
                            Icons.shield_outlined,
                            size: 14,
                            color: colors.textMuted,
                          ),
                          label: Text(
                            l.loginGuestButton,
                            style: TextStyle(
                              color: colors.textMuted,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text, AppColors colors) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: colors.textMuted,
        letterSpacing: 0.96, // 0.08em -> 12 * 0.08 = 0.96
      ),
    );
  }

  Widget _buildInput({
    required IconData icon,
    required String hint,
    required TextEditingController controller,
    required AppColors colors,
    bool isPassword = false,
    bool isEmail = false,
    bool showPass = false,
    VoidCallback? onTogglePass,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: colors.surfaceGlass,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.borderLight),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword && !showPass,
        keyboardType: isEmail ? TextInputType.emailAddress : TextInputType.text,
        style: TextStyle(color: colors.textPrimary, fontSize: 15),
        cursorColor: colors.accentGold,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: colors.textMuted, fontSize: 15),
          prefixIcon: Icon(icon, size: 18, color: colors.textMuted),
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    showPass
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    size: 18,
                    color: colors.textMuted,
                  ),
                  onPressed: onTogglePass,
                )
              : null,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildSocialButton(String label, String iconPath, AppColors colors) {
    // Exact React styled buttons
    return InkWell(
      onTap: _isLoading ? null : () async {
        setState(() => _isLoading = true);
        await context.read<AuthProvider>().loginAsGuest();
        if (mounted) {
          Future.delayed(const Duration(milliseconds: 350), () {
            if (mounted) context.pushReplacement('/');
          });
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: colors.surfaceGlassMedium,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colors.borderLight),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Note: Since we don't have the explicit SVG paths, falling back to a dummy icon for now.
            const Icon(Icons.circle, size: 20, color: Colors.white),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: colors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
