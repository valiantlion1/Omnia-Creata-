// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => 'Professionelle Fotos mit einer Berührung';

  @override
  String get splashLoading => 'KI-Engine startet...';

  @override
  String get splashSubtitle => 'VON OMNIACREATA';

  @override
  String get onboardingSkip => 'Überspringen';

  @override
  String get onboardingContinue => 'Weiter';

  @override
  String get onboardingGetStarted => 'Loslegen';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return 'Indem Sie fortfahren, akzeptieren Sie die $policy';
  }

  @override
  String get onboardingPrivacyPolicy => 'Datenschutzrichtlinien';

  @override
  String get onboardingSlide1Tag => 'KI-FÄHIGKEIT';

  @override
  String get onboardingSlide1Title => 'Filmreife\nKI-Verbesserung';

  @override
  String get onboardingSlide1Desc =>
      'Die KI analysiert Ihr Foto, erkennt den Typ und liefert professionelle Ergebnisse. Selfies, Produkte, Landschaften — es perfektioniert sie alle.';

  @override
  String get onboardingSlide2Tag => 'DATENSCHUTZ ZUERST';

  @override
  String get onboardingSlide2Title => 'Sichere\nVerarbeitung auf dem Gerät';

  @override
  String get onboardingSlide2Desc =>
      'Die gesamte Verarbeitung erfolgt auf Ihrem Gerät. Ihre Fotos werden nie auf einen Server hochgeladen. Völlig kostenlos, völlig privat.';

  @override
  String get onboardingSlide3Tag => 'PRO-LEISTUNG';

  @override
  String get onboardingSlide3Title =>
      'Cloud-Geschwindigkeit,\nPremium-Qualität';

  @override
  String get onboardingSlide3Desc =>
      'Mit Pro erhalten Sie 4× und 8× Hochskalierung, Stapelverarbeitung und sofortigen Zugriff auf alle KI-Tools.';

  @override
  String get loginWelcomeBack => 'Willkommen zurück';

  @override
  String get loginCreateAccount => 'Konto erstellen';

  @override
  String get loginRegisterSubtitle => 'Treten Sie der OmniaPixels-Familie bei';

  @override
  String get loginTitle => 'Konto erstellen';

  @override
  String get loginSubtitle => 'Treten Sie der OmniaPixels-Familie bei';

  @override
  String get loginTabSignIn => 'Anmelden';

  @override
  String get loginTabSignUp => 'Registrieren';

  @override
  String get loginNameLabel => 'VOLLSTÄNDIGER NAME';

  @override
  String get loginNameHint => 'Geben Sie Ihren Namen ein';

  @override
  String get loginEmailLabel => 'E-MAIL';

  @override
  String get loginEmailHint => 'beispiel@email.com';

  @override
  String get loginPasswordLabel => 'PASSWORT';

  @override
  String get loginPasswordHint => 'Mindestens 6 Zeichen';

  @override
  String get loginSignInButton => 'Anmelden';

  @override
  String get loginSignUpButton => 'Registrieren';

  @override
  String get loginOrDivider => 'oder';

  @override
  String get loginGoogleButton => 'Weiter mit Google';

  @override
  String get loginAppleButton => 'Weiter mit Apple';

  @override
  String get loginGuestButton => 'Als Gast fortfahren';

  @override
  String get loginGuestSubtext => 'Nur Funktionen auf dem Gerät';

  @override
  String get loginForgotPassword => 'Passwort vergessen?';

  @override
  String get loginTerms =>
      'Indem Sie fortfahren, akzeptieren Sie die Nutzungsbedingungen und Datenschutzrichtlinien.';

  @override
  String editorGreeting(Object name) {
    return 'Hallo, $name';
  }

  @override
  String get editorFreeLabel => 'KOSTENLOS';

  @override
  String get editorDailyUsage => 'Tägliche Nutzung';

  @override
  String get editorUpgradePro => 'Pro werden';

  @override
  String editorRightsCount(Object count) {
    return '/ $count Rechte';
  }

  @override
  String get editorWatchAdReward =>
      'Sehen Sie eine Anzeige, um +5 Rechte zu verdienen';

  @override
  String get editorAddPhoto => 'Foto hinzufügen';

  @override
  String get editorAddPhotoDesc => 'Aus Galerie wählen oder Foto aufnehmen';

  @override
  String get editorQuickTools => 'Schnellwerkzeuge';

  @override
  String get editorToolEnhance => 'KI Verbessern';

  @override
  String get editorToolBgRemove => 'HG entfernen';

  @override
  String get editorToolUpscale => 'Hochskalieren';

  @override
  String get editorToolDeblur => 'Entschärfen';

  @override
  String get editorToolStyle => 'Stil';

  @override
  String get editorToolCompare => 'Vergleichen';

  @override
  String editorRightsUnit(Object count) {
    return '$count Rechte';
  }

  @override
  String get editorAiSuggestion => 'KI schlägt vor';

  @override
  String get editorAiSuggestionDesc =>
      '2× Hochskalieren wird für Ihr letztes Foto empfohlen';

  @override
  String get editorRecentEdits => 'Letzte Bearbeitungen';

  @override
  String get editorViewAll => 'Alle anzeigen';

  @override
  String get editorNewItem => 'Neu';

  @override
  String get editorLabelAiEnhanced => 'KI Verbessert';

  @override
  String get editorLabelBgRemoved => 'HG entfernt';

  @override
  String get editorLabelUpscale => '4× Hochskalieren';

  @override
  String get editorStatEdited => 'Bearbeitet';

  @override
  String get editorStatThisWeek => 'Diese Woche';

  @override
  String get editorStatSaved => 'Gespeichert';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return 'Foto für $tool ausgewählt: $name';
  }

  @override
  String get galleryTitle => 'Galerie';

  @override
  String galleryEditCount(Object count) {
    return '$count Bearbeitungen';
  }

  @override
  String get gallerySearchHint => 'Bearbeitungen suchen...';

  @override
  String get galleryFilterAll => 'Alle';

  @override
  String get galleryFilterFavorite => 'Favorit';

  @override
  String get galleryFilterEnhanced => 'Verbessert';

  @override
  String get galleryFilterUpscale => 'Hochskalieren';

  @override
  String get galleryFilterBgRemove => 'HG entfernen';

  @override
  String get galleryFilterDeblur => 'Entschärfen';

  @override
  String get galleryDateToday => 'Heute';

  @override
  String get galleryDateYesterday => 'Gestern';

  @override
  String galleryDateDaysAgo(Object count) {
    return 'Vor $count Tagen';
  }

  @override
  String get galleryEmptyTitle => 'Noch keine Bearbeitungen';

  @override
  String get galleryEmptySubtitle => 'Bearbeiten Sie Ihr erstes Foto!';

  @override
  String get galleryTypeBgRemoved => 'HG entfernt';

  @override
  String get galleryTypeFilter => 'Filter';

  @override
  String get settingsTitle => 'Einstellungen';

  @override
  String get settingsProfileGuest => 'Gastbenutzer';

  @override
  String get settingsProfileEmail => 'gast@omniacreata.com';

  @override
  String get settingsDailyUsage => 'Tägliche Nutzung';

  @override
  String get settingsStatEdits => 'Bearbeitungen';

  @override
  String get settingsStatThisMonth => 'Dieser Monat';

  @override
  String get settingsStatTotalOps => 'Gesamte Ops';

  @override
  String get settingsAppearance => 'Aussehen';

  @override
  String get settingsTheme => 'Thema';

  @override
  String get settingsThemeDark => 'Dunkel';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => 'Hell';

  @override
  String get settingsLanguage => 'Sprache';

  @override
  String get settingsNotifications => 'Benachrichtigungen';

  @override
  String get settingsEmailSummary => 'E-Mail-Zusammenfassung';

  @override
  String get settingsAccount => 'Konto';

  @override
  String get settingsSubscription => 'Mein Plan';

  @override
  String get settingsSubscriptionDesc => 'Kostenlos · Upgrade';

  @override
  String get settingsInviteFriend => 'Freund einladen';

  @override
  String get settingsInviteReward => '50 Rechte verdienen';

  @override
  String get settingsRateApp => 'App bewerten';

  @override
  String get settingsRateDesc => 'Geben Sie 5 Sterne!';

  @override
  String get settingsHelpCenter => 'Hilfezentrum';

  @override
  String get settingsHelpDesc => 'FAQ und Support';

  @override
  String get settingsPrivacy => 'Datenschutzrichtlinien';

  @override
  String get settingsTerms => 'Nutzungsbedingungen';

  @override
  String get settingsVersion => 'Version';

  @override
  String get settingsLogout => 'Abmelden';

  @override
  String get settingsDeleteAccount => 'Konto löschen';

  @override
  String get navHome => 'Startseite';

  @override
  String get navEditor => 'Editor';

  @override
  String get navGallery => 'Galerie';

  @override
  String get navProfile => 'Profil';

  @override
  String get paywallTitle => 'Plan wählen';

  @override
  String get paywallSubtitle => 'Finden Sie den besten Plan für Sie';

  @override
  String get paywallFreeName => 'Kostenlos';

  @override
  String get paywallFreeDesc => 'Perfekt für den Start';

  @override
  String get paywallFreeRights => '10 tägliche Nutzungsrechte';

  @override
  String get paywallFreeUpscale => '2× KI Hochskalieren';

  @override
  String get paywallFreeFilters => 'Grundlegende Filter';

  @override
  String get paywallFreeAdReward => '+5 Rechte durch Anzeigen';

  @override
  String get paywallFreeBadge => 'OmniaPixels Abzeichen';

  @override
  String get paywallFreeBadgeNote => 'Erforderlich';

  @override
  String get paywallFreeNoCloud => 'Cloud-Verarbeitung';

  @override
  String get paywallFreeNoUpscale => '4× / 8× Hochskalieren';

  @override
  String get paywallFreeNoFast => 'Schnelle Verarbeitung';

  @override
  String get paywallFreeNoBatch => 'Stapelverarbeitung';

  @override
  String get paywallFreeCta => 'Aktueller Plan';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => 'Am beliebtesten';

  @override
  String get paywallProDesc => 'Für Schöpfer und Profis';

  @override
  String get paywallProUnlimited => 'Unbegrenzte Nutzung';

  @override
  String get paywallProAllAi => 'Alle KI-Module';

  @override
  String get paywallProUpscale => '4× und 8× Hochskalieren';

  @override
  String get paywallProFast => 'Schnelle Verarbeitung';

  @override
  String get paywallProBatch => 'Stapelverarbeitung (100+ Fotos)';

  @override
  String get paywallProNoBadge => 'Ohne Abzeichen';

  @override
  String get paywallProCloud => 'Cloud-Sync';

  @override
  String get paywallProStyle => 'Stil-Transfer KI';

  @override
  String get paywallProNoAds => 'Werbefreie Erfahrung';

  @override
  String get paywallProCta => 'Pro werden';

  @override
  String get paywallEntName => 'Unternehmen';

  @override
  String get paywallEntTag => 'Geschäft';

  @override
  String get paywallEntDesc => 'Für Teams';

  @override
  String get paywallEntPrice => 'Individuell';

  @override
  String get paywallEntCta => 'Kontaktieren Sie uns';

  @override
  String get paywallOrBuyRights => 'ODER RECHTE KAUFEN';

  @override
  String get paywallRightsUnit => 'Rechte';

  @override
  String paywallPerRight(Object price) {
    return '$price/Recht';
  }

  @override
  String get paywallPopularTag => 'Beliebt';

  @override
  String get paywallBestValueTag => 'Bester Wert';

  @override
  String get paywallGuarantee => '7 Tage Geld-zurück-Garantie';

  @override
  String get paywallMonthly => 'Monatlich';

  @override
  String get paywallYearly => 'Jährlich';

  @override
  String get paywallYearlySave => '40% sparen';
}
