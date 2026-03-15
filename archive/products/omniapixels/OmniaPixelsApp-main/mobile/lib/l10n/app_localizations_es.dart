// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => 'Fotos profesionales con un toque';

  @override
  String get splashLoading => 'Iniciando motor de IA...';

  @override
  String get splashSubtitle => 'POR OMNIACREATA';

  @override
  String get onboardingSkip => 'Omitir';

  @override
  String get onboardingContinue => 'Continuar';

  @override
  String get onboardingGetStarted => 'Empezar';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return 'Al continuar, aceptas la $policy';
  }

  @override
  String get onboardingPrivacyPolicy => 'Política de privacidad';

  @override
  String get onboardingSlide1Tag => 'CAPACIDAD DE IA';

  @override
  String get onboardingSlide1Title => 'Mejora de IA\nCinematográfica';

  @override
  String get onboardingSlide1Desc =>
      'La IA analiza tu foto y produce resultados profesionales. Selfies, productos, paisajes, los perfecciona todos.';

  @override
  String get onboardingSlide2Tag => 'PRIVACIDAD PRIMERO';

  @override
  String get onboardingSlide2Title => 'Procesamiento\nSeguro';

  @override
  String get onboardingSlide2Desc =>
      'Todo el procesamiento se realiza en tu dispositivo. Completamente gratis, completamente privado.';

  @override
  String get onboardingSlide3Tag => 'PODER PRO';

  @override
  String get onboardingSlide3Title => 'Velocidad de nube,\nCalidad premium';

  @override
  String get onboardingSlide3Desc =>
      'Con Pro, obtén aumento de resolución de 4× y 8× y acceso a todas las herramientas de IA.';

  @override
  String get loginWelcomeBack => 'Bienvenido de nuevo';

  @override
  String get loginCreateAccount => 'Crear Cuenta';

  @override
  String get loginRegisterSubtitle => 'Únete a la familia OmniaPixels';

  @override
  String get loginTitle => 'Crear Cuenta';

  @override
  String get loginSubtitle => 'Únete a la familia OmniaPixels';

  @override
  String get loginTabSignIn => 'Iniciar Sesión';

  @override
  String get loginTabSignUp => 'Registrarse';

  @override
  String get loginNameLabel => 'NOMBRE';

  @override
  String get loginNameHint => 'Ingresa tu nombre';

  @override
  String get loginEmailLabel => 'CORREO';

  @override
  String get loginEmailHint => 'ejemplo@correo.com';

  @override
  String get loginPasswordLabel => 'CONTRASEÑA';

  @override
  String get loginPasswordHint => 'Al menos 6 caracteres';

  @override
  String get loginSignInButton => 'Iniciar Sesión';

  @override
  String get loginSignUpButton => 'Registrarse';

  @override
  String get loginOrDivider => 'o';

  @override
  String get loginGoogleButton => 'Continuar con Google';

  @override
  String get loginAppleButton => 'Continuar con Apple';

  @override
  String get loginGuestButton => 'Continuar como invitado';

  @override
  String get loginGuestSubtext => 'Solo funciones del dispositivo';

  @override
  String get loginForgotPassword => '¿Olvidaste tu contraseña?';

  @override
  String get loginTerms =>
      'Al continuar, aceptas los Términos de Servicio y la Política de Privacidad.';

  @override
  String editorGreeting(Object name) {
    return 'Hola, $name';
  }

  @override
  String get editorFreeLabel => 'GRATIS';

  @override
  String get editorDailyUsage => 'Uso Diario';

  @override
  String get editorUpgradePro => 'Hazte Pro';

  @override
  String editorRightsCount(Object count) {
    return '/ $count derechos';
  }

  @override
  String get editorWatchAdReward => 'Mira un anuncio para ganar +5 derechos';

  @override
  String get editorAddPhoto => 'Añadir foto';

  @override
  String get editorAddPhotoDesc => 'Elige de la galería o toma una foto';

  @override
  String get editorQuickTools => 'Herramientas Rápidas';

  @override
  String get editorToolEnhance => 'Mejorar IA';

  @override
  String get editorToolBgRemove => 'Quitar Fondo';

  @override
  String get editorToolUpscale => 'Aumentar';

  @override
  String get editorToolDeblur => 'Desenfocar';

  @override
  String get editorToolStyle => 'Estilo';

  @override
  String get editorToolCompare => 'Comparar';

  @override
  String editorRightsUnit(Object count) {
    return '$count derechos';
  }

  @override
  String get editorAiSuggestion => 'Sugerencia de IA';

  @override
  String get editorAiSuggestionDesc =>
      'Se recomienda Aumentar 2× para tu última foto';

  @override
  String get editorRecentEdits => 'Ediciones Recientes';

  @override
  String get editorViewAll => 'Ver Todo';

  @override
  String get editorNewItem => 'Nuevo';

  @override
  String get editorLabelAiEnhanced => 'Mejorado';

  @override
  String get editorLabelBgRemoved => 'Fondo Quitado';

  @override
  String get editorLabelUpscale => 'Aumentar 4×';

  @override
  String get editorStatEdited => 'Editado';

  @override
  String get editorStatThisWeek => 'Esta Semana';

  @override
  String get editorStatSaved => 'Guardado';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return 'Foto seleccionada para $tool: $name';
  }

  @override
  String get galleryTitle => 'Galería';

  @override
  String galleryEditCount(Object count) {
    return '$count ediciones';
  }

  @override
  String get gallerySearchHint => 'Buscar ediciones...';

  @override
  String get galleryFilterAll => 'Todo';

  @override
  String get galleryFilterFavorite => 'Favorito';

  @override
  String get galleryFilterEnhanced => 'Mejorado';

  @override
  String get galleryFilterUpscale => 'Aumentado';

  @override
  String get galleryFilterBgRemove => 'Fondo Quitado';

  @override
  String get galleryFilterDeblur => 'Desenfocado';

  @override
  String get galleryDateToday => 'Hoy';

  @override
  String get galleryDateYesterday => 'Ayer';

  @override
  String galleryDateDaysAgo(Object count) {
    return 'Hace $count días';
  }

  @override
  String get galleryEmptyTitle => 'Aún no hay ediciones';

  @override
  String get galleryEmptySubtitle => '¡Edita tu primera foto!';

  @override
  String get galleryTypeBgRemoved => 'Fondo Quitado';

  @override
  String get galleryTypeFilter => 'Filtro';

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String get settingsProfileGuest => 'Usuario Invitado';

  @override
  String get settingsProfileEmail => 'invitado@omniacreata.com';

  @override
  String get settingsDailyUsage => 'Uso Diario';

  @override
  String get settingsStatEdits => 'Ediciones';

  @override
  String get settingsStatThisMonth => 'Este Mes';

  @override
  String get settingsStatTotalOps => 'Total Ops';

  @override
  String get settingsAppearance => 'Apariencia';

  @override
  String get settingsTheme => 'Tema';

  @override
  String get settingsThemeDark => 'Oscuro';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => 'Claro';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsNotifications => 'Notificaciones';

  @override
  String get settingsEmailSummary => 'Resumen por correo';

  @override
  String get settingsAccount => 'Cuenta';

  @override
  String get settingsSubscription => 'Mi Plan';

  @override
  String get settingsSubscriptionDesc => 'Gratis · Mejorar';

  @override
  String get settingsInviteFriend => 'Invita a un amigo';

  @override
  String get settingsInviteReward => 'Gana 50 derechos';

  @override
  String get settingsRateApp => 'Calificar Ap';

  @override
  String get settingsRateDesc => '¡Dale 5 estrellas!';

  @override
  String get settingsHelpCenter => 'Centro de Ayuda';

  @override
  String get settingsHelpDesc => 'Soporte';

  @override
  String get settingsPrivacy => 'Política de Privacidad';

  @override
  String get settingsTerms => 'Términos de Servicio';

  @override
  String get settingsVersion => 'Versión';

  @override
  String get settingsLogout => 'Cerrar Sesión';

  @override
  String get settingsDeleteAccount => 'Eliminar Cuenta';

  @override
  String get navHome => 'Inicio';

  @override
  String get navEditor => 'Editor';

  @override
  String get navGallery => 'Galería';

  @override
  String get navProfile => 'Perfil';

  @override
  String get paywallTitle => 'Elige Tu Plan';

  @override
  String get paywallSubtitle => 'Encuentra el mejor plan para ti';

  @override
  String get paywallFreeName => 'Gratis';

  @override
  String get paywallFreeDesc => 'Perfecto para empezar';

  @override
  String get paywallFreeRights => '10 derechos diarios';

  @override
  String get paywallFreeUpscale => 'Aumentar 2×';

  @override
  String get paywallFreeFilters => 'Filtros básicos';

  @override
  String get paywallFreeAdReward => '+5 derechos (anuncios)';

  @override
  String get paywallFreeBadge => 'Insignia OmniaPixels';

  @override
  String get paywallFreeBadgeNote => 'Requerido';

  @override
  String get paywallFreeNoCloud => 'Procesamiento en nube';

  @override
  String get paywallFreeNoUpscale => 'Aumentar 4× / 8×';

  @override
  String get paywallFreeNoFast => 'Procesamiento rápido';

  @override
  String get paywallFreeNoBatch => 'Por lotes';

  @override
  String get paywallFreeCta => 'Plan Actual';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => 'Más Popular';

  @override
  String get paywallProDesc => 'Para creadores y profesionales';

  @override
  String get paywallProUnlimited => 'Uso ilimitado';

  @override
  String get paywallProAllAi => 'Todos los módulos';

  @override
  String get paywallProUpscale => 'Aumento 4× y 8×';

  @override
  String get paywallProFast => 'Rápido';

  @override
  String get paywallProBatch => 'Por lotes (100+)';

  @override
  String get paywallProNoBadge => 'Sin insignia';

  @override
  String get paywallProCloud => 'Sincronización en nube';

  @override
  String get paywallProStyle => 'Transferencia de estilo';

  @override
  String get paywallProNoAds => 'Sin anuncios';

  @override
  String get paywallProCta => 'Hazte Pro';

  @override
  String get paywallEntName => 'Empresa';

  @override
  String get paywallEntTag => 'Negocios';

  @override
  String get paywallEntDesc => 'Para equipos';

  @override
  String get paywallEntPrice => 'Personalizado';

  @override
  String get paywallEntCta => 'Contáctanos';

  @override
  String get paywallOrBuyRights => 'O COMPRAR DERECHOS';

  @override
  String get paywallRightsUnit => 'derechos';

  @override
  String paywallPerRight(Object price) {
    return '$price/derecho';
  }

  @override
  String get paywallPopularTag => 'Popular';

  @override
  String get paywallBestValueTag => 'Mejor Valor';

  @override
  String get paywallGuarantee => '7 días de garantía';

  @override
  String get paywallMonthly => 'Mensual';

  @override
  String get paywallYearly => 'Anual';

  @override
  String get paywallYearlySave => 'Ahorra 40%';
}
