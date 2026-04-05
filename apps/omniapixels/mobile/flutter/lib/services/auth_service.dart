import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';

class AuthService extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  final _googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);

  User? get currentUser => _supabase.auth.currentUser;
  bool get isLoggedIn => currentUser != null;

  String? get email => currentUser?.email;
  String? get displayName =>
      currentUser?.userMetadata?['full_name'] ??
      currentUser?.userMetadata?['name'] ??
      email?.split('@').first;

  bool get isAdmin =>
      AppConfig.adminEmails.contains(email?.toLowerCase());

  String? get accessToken => _supabase.auth.currentSession?.accessToken;

  Future<void> init() async {
    _supabase.auth.onAuthStateChange.listen((_) => notifyListeners());
  }

  /// Google Sign-In
  Future<void> signInWithGoogle() async {
    final googleUser = await _googleSignIn.signIn();
    if (googleUser == null) throw Exception('Google sign-in cancelled');

    final googleAuth = await googleUser.authentication;
    await _supabase.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: googleAuth.idToken!,
      accessToken: googleAuth.accessToken,
    );
    notifyListeners();
  }

  /// Email + password sign-in
  Future<void> signInWithEmail(String email, String password) async {
    await _supabase.auth.signInWithPassword(email: email, password: password);
    notifyListeners();
  }

  /// Email + password sign-up
  Future<void> signUpWithEmail(String email, String password, {String? fullName}) async {
    await _supabase.auth.signUp(
      email: email,
      password: password,
      data: fullName != null ? {'full_name': fullName} : null,
    );
    notifyListeners();
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _supabase.auth.signOut();
    notifyListeners();
  }
}
