import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _isSignup = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _googleSignIn() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthService>().signInWithGoogle();
    } catch (e) {
      setState(() => _error = 'Google sign-in failed. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _emailSubmit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final auth = context.read<AuthService>();
      if (_isSignup) {
        await auth.signUpWithEmail(
          _emailCtrl.text.trim(),
          _passCtrl.text,
          fullName: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
        );
      } else {
        await auth.signInWithEmail(_emailCtrl.text.trim(), _passCtrl.text);
      }
    } catch (e) {
      setState(() => _error = 'Authentication failed. Check your credentials.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              
              // DEV ONLY - BIG SKIP BUTTON
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange),
                ),
                child: TextButton(
                  onPressed: () => Navigator.pushReplacementNamed(context, '/home'),
                  child: const Text('⚡ DEV: SKIP LOGIN - TAP HERE',
                      style: TextStyle(color: Colors.orange, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),
              
              // Brand
              Row(children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6C3CE1), Color(0xFFB06EFF)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 12),
                const Text('OmniaPixels',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
              ]),
              const SizedBox(height: 48),
              Text(
                _isSignup ? 'Create account' : 'Welcome back',
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                _isSignup ? 'Join the Omnia Creata ecosystem' : 'Sign in to your Omnia Creata account',
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
              ),
              const SizedBox(height: 36),

              // Google Sign-In button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: _loading ? null : _googleSignIn,
                  icon: _loading
                      ? const SizedBox(width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Image.network(
                          'https://www.google.com/favicon.ico',
                          width: 18, height: 18,
                          errorBuilder: (_, __, ___) => const Icon(Icons.login, size: 18),
                        ),
                  label: const Text('Continue with Google',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white.withOpacity(0.2)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),

              const SizedBox(height: 24),
              Row(children: [
                Expanded(child: Divider(color: Colors.white.withOpacity(0.1))),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text('or', style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12)),
                ),
                Expanded(child: Divider(color: Colors.white.withOpacity(0.1))),
              ]),
              const SizedBox(height: 24),

              // Email fields
              if (_isSignup) ...[
                _field(_nameCtrl, 'Full Name', Icons.person_outline),
                const SizedBox(height: 14),
              ],
              _field(_emailCtrl, 'Email', Icons.email_outlined, type: TextInputType.emailAddress),
              const SizedBox(height: 14),
              _field(_passCtrl, 'Password', Icons.lock_outline, obscure: true),

              if (_error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ),
              ],
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _emailSubmit,
                  child: Text(_isSignup ? 'Sign Up' : 'Sign In',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: TextButton(
                  onPressed: () => setState(() { _isSignup = !_isSignup; _error = null; }),
                  child: Text(
                    _isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up",
                    style: const TextStyle(color: Color(0xFFB06EFF)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String hint, IconData icon,
      {bool obscure = false, TextInputType type = TextInputType.text}) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      keyboardType: type,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
        prefixIcon: Icon(icon, color: Colors.white.withOpacity(0.4), size: 20),
        filled: true,
        fillColor: const Color(0xFF1A1A24),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF6C3CE1))),
      ),
    );
  }
}
