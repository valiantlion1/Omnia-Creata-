import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_tr.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('ja'),
    Locale('tr'),
    Locale('zh'),
  ];

  /// No description provided for @appName.
  ///
  /// In tr, this message translates to:
  /// **'OmniaPixels'**
  String get appName;

  /// No description provided for @splashTagline.
  ///
  /// In tr, this message translates to:
  /// **'Tek dokunuşla profesyonel fotoğraf'**
  String get splashTagline;

  /// No description provided for @splashLoading.
  ///
  /// In tr, this message translates to:
  /// **'AI motoru başlatılıyor...'**
  String get splashLoading;

  /// No description provided for @splashSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'BY OMNIACREATA'**
  String get splashSubtitle;

  /// No description provided for @onboardingSkip.
  ///
  /// In tr, this message translates to:
  /// **'Atla'**
  String get onboardingSkip;

  /// No description provided for @onboardingContinue.
  ///
  /// In tr, this message translates to:
  /// **'Devam Et'**
  String get onboardingContinue;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In tr, this message translates to:
  /// **'Başlayalım'**
  String get onboardingGetStarted;

  /// No description provided for @onboardingPrivacyNotice.
  ///
  /// In tr, this message translates to:
  /// **'Devam ederek {policy} kabul etmiş olursunuz'**
  String onboardingPrivacyNotice(Object policy);

  /// No description provided for @onboardingPrivacyPolicy.
  ///
  /// In tr, this message translates to:
  /// **'Gizlilik Politikasını'**
  String get onboardingPrivacyPolicy;

  /// No description provided for @onboardingSlide1Tag.
  ///
  /// In tr, this message translates to:
  /// **'AI YETENEĞİ'**
  String get onboardingSlide1Tag;

  /// No description provided for @onboardingSlide1Title.
  ///
  /// In tr, this message translates to:
  /// **'Sinematik\nAI İyileştirme'**
  String get onboardingSlide1Title;

  /// No description provided for @onboardingSlide1Desc.
  ///
  /// In tr, this message translates to:
  /// **'Yapay zekâ fotoğrafınızı analiz eder, türünü tanır ve tek dokunuşta profesyonel sonuç üretir. Selfie, ürün, manzara — hepsini mükemmel yapar.'**
  String get onboardingSlide1Desc;

  /// No description provided for @onboardingSlide2Tag.
  ///
  /// In tr, this message translates to:
  /// **'GİZLİLİK ÖNCELİKLİ'**
  String get onboardingSlide2Tag;

  /// No description provided for @onboardingSlide2Title.
  ///
  /// In tr, this message translates to:
  /// **'Cihazında\nGüvenli İşleme'**
  String get onboardingSlide2Title;

  /// No description provided for @onboardingSlide2Desc.
  ///
  /// In tr, this message translates to:
  /// **'Tüm işlemler doğrudan cihazınızda gerçekleşir. Fotoğraflarınız asla sunucuya yüklenmez. Tamamen ücretsiz, tamamen gizli.'**
  String get onboardingSlide2Desc;

  /// No description provided for @onboardingSlide3Tag.
  ///
  /// In tr, this message translates to:
  /// **'PRO GÜÇ'**
  String get onboardingSlide3Tag;

  /// No description provided for @onboardingSlide3Title.
  ///
  /// In tr, this message translates to:
  /// **'Bulut Hızı,\nPremium Kalite'**
  String get onboardingSlide3Title;

  /// No description provided for @onboardingSlide3Desc.
  ///
  /// In tr, this message translates to:
  /// **'Pro ile 4× ve 8× büyütme, toplu düzenleme ve tüm AI araçlarına anında erişim. Saniyeler içinde profesyonel sonuç.'**
  String get onboardingSlide3Desc;

  /// No description provided for @loginWelcomeBack.
  ///
  /// In tr, this message translates to:
  /// **'Tekrar Hoş Geldin'**
  String get loginWelcomeBack;

  /// No description provided for @loginCreateAccount.
  ///
  /// In tr, this message translates to:
  /// **'Hesap Oluştur'**
  String get loginCreateAccount;

  /// No description provided for @loginRegisterSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'OmniaPixels ailesine katıl'**
  String get loginRegisterSubtitle;

  /// No description provided for @loginTitle.
  ///
  /// In tr, this message translates to:
  /// **'Hesap oluştur'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'OmniaPixels ailesine katıl'**
  String get loginSubtitle;

  /// No description provided for @loginTabSignIn.
  ///
  /// In tr, this message translates to:
  /// **'Giriş Yap'**
  String get loginTabSignIn;

  /// No description provided for @loginTabSignUp.
  ///
  /// In tr, this message translates to:
  /// **'Kayıt Ol'**
  String get loginTabSignUp;

  /// No description provided for @loginNameLabel.
  ///
  /// In tr, this message translates to:
  /// **'AD SOYAD'**
  String get loginNameLabel;

  /// No description provided for @loginNameHint.
  ///
  /// In tr, this message translates to:
  /// **'Adınızı girin'**
  String get loginNameHint;

  /// No description provided for @loginEmailLabel.
  ///
  /// In tr, this message translates to:
  /// **'E-POSTA'**
  String get loginEmailLabel;

  /// No description provided for @loginEmailHint.
  ///
  /// In tr, this message translates to:
  /// **'ornek@email.com'**
  String get loginEmailHint;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In tr, this message translates to:
  /// **'ŞİFRE'**
  String get loginPasswordLabel;

  /// No description provided for @loginPasswordHint.
  ///
  /// In tr, this message translates to:
  /// **'En az 6 karakter'**
  String get loginPasswordHint;

  /// No description provided for @loginSignInButton.
  ///
  /// In tr, this message translates to:
  /// **'Giriş Yap'**
  String get loginSignInButton;

  /// No description provided for @loginSignUpButton.
  ///
  /// In tr, this message translates to:
  /// **'Kayıt Ol'**
  String get loginSignUpButton;

  /// No description provided for @loginOrDivider.
  ///
  /// In tr, this message translates to:
  /// **'veya'**
  String get loginOrDivider;

  /// No description provided for @loginGoogleButton.
  ///
  /// In tr, this message translates to:
  /// **'Google ile devam et'**
  String get loginGoogleButton;

  /// No description provided for @loginAppleButton.
  ///
  /// In tr, this message translates to:
  /// **'Apple ile devam et'**
  String get loginAppleButton;

  /// No description provided for @loginGuestButton.
  ///
  /// In tr, this message translates to:
  /// **'Misafir olarak devam et'**
  String get loginGuestButton;

  /// No description provided for @loginGuestSubtext.
  ///
  /// In tr, this message translates to:
  /// **'Sadece cihaz içi özellikler'**
  String get loginGuestSubtext;

  /// No description provided for @loginForgotPassword.
  ///
  /// In tr, this message translates to:
  /// **'Şifreni mi unuttun?'**
  String get loginForgotPassword;

  /// No description provided for @loginTerms.
  ///
  /// In tr, this message translates to:
  /// **'Devam ederek Kullanım Koşullarını ve Gizlilik Politikasını kabul etmiş olursunuz.'**
  String get loginTerms;

  /// No description provided for @editorGreeting.
  ///
  /// In tr, this message translates to:
  /// **'Merhaba, {name}'**
  String editorGreeting(Object name);

  /// No description provided for @editorFreeLabel.
  ///
  /// In tr, this message translates to:
  /// **'FREE'**
  String get editorFreeLabel;

  /// No description provided for @editorDailyUsage.
  ///
  /// In tr, this message translates to:
  /// **'Günlük Kullanım'**
  String get editorDailyUsage;

  /// No description provided for @editorUpgradePro.
  ///
  /// In tr, this message translates to:
  /// **'Pro\'ya Geç'**
  String get editorUpgradePro;

  /// No description provided for @editorRightsCount.
  ///
  /// In tr, this message translates to:
  /// **'/ {count} hak'**
  String editorRightsCount(Object count);

  /// No description provided for @editorWatchAdReward.
  ///
  /// In tr, this message translates to:
  /// **'Reklam izleyerek +5 hak kazan'**
  String get editorWatchAdReward;

  /// No description provided for @editorAddPhoto.
  ///
  /// In tr, this message translates to:
  /// **'Fotoğraf Ekle'**
  String get editorAddPhoto;

  /// No description provided for @editorAddPhotoDesc.
  ///
  /// In tr, this message translates to:
  /// **'Galeriden seçin veya kamera ile çekin'**
  String get editorAddPhotoDesc;

  /// No description provided for @editorQuickTools.
  ///
  /// In tr, this message translates to:
  /// **'Hızlı Araçlar'**
  String get editorQuickTools;

  /// No description provided for @editorToolEnhance.
  ///
  /// In tr, this message translates to:
  /// **'AI İyileştir'**
  String get editorToolEnhance;

  /// No description provided for @editorToolBgRemove.
  ///
  /// In tr, this message translates to:
  /// **'Arka Plan Sil'**
  String get editorToolBgRemove;

  /// No description provided for @editorToolUpscale.
  ///
  /// In tr, this message translates to:
  /// **'Büyüt'**
  String get editorToolUpscale;

  /// No description provided for @editorToolDeblur.
  ///
  /// In tr, this message translates to:
  /// **'Netleştir'**
  String get editorToolDeblur;

  /// No description provided for @editorToolStyle.
  ///
  /// In tr, this message translates to:
  /// **'Stil Ver'**
  String get editorToolStyle;

  /// No description provided for @editorToolCompare.
  ///
  /// In tr, this message translates to:
  /// **'Karşılaştır'**
  String get editorToolCompare;

  /// No description provided for @editorRightsUnit.
  ///
  /// In tr, this message translates to:
  /// **'{count} hak'**
  String editorRightsUnit(Object count);

  /// No description provided for @editorAiSuggestion.
  ///
  /// In tr, this message translates to:
  /// **'AI Öneriyor'**
  String get editorAiSuggestion;

  /// No description provided for @editorAiSuggestionDesc.
  ///
  /// In tr, this message translates to:
  /// **'Son fotoğrafın için Upscale 2× önerilir'**
  String get editorAiSuggestionDesc;

  /// No description provided for @editorRecentEdits.
  ///
  /// In tr, this message translates to:
  /// **'Son Düzenlemeler'**
  String get editorRecentEdits;

  /// No description provided for @editorViewAll.
  ///
  /// In tr, this message translates to:
  /// **'Tümünü Gör'**
  String get editorViewAll;

  /// No description provided for @editorNewItem.
  ///
  /// In tr, this message translates to:
  /// **'Yeni'**
  String get editorNewItem;

  /// No description provided for @editorLabelAiEnhanced.
  ///
  /// In tr, this message translates to:
  /// **'AI Enhanced'**
  String get editorLabelAiEnhanced;

  /// No description provided for @editorLabelBgRemoved.
  ///
  /// In tr, this message translates to:
  /// **'BG Silindi'**
  String get editorLabelBgRemoved;

  /// No description provided for @editorLabelUpscale.
  ///
  /// In tr, this message translates to:
  /// **'4× Upscale'**
  String get editorLabelUpscale;

  /// No description provided for @editorStatEdited.
  ///
  /// In tr, this message translates to:
  /// **'Düzenlendi'**
  String get editorStatEdited;

  /// No description provided for @editorStatThisWeek.
  ///
  /// In tr, this message translates to:
  /// **'Bu Hafta'**
  String get editorStatThisWeek;

  /// No description provided for @editorStatSaved.
  ///
  /// In tr, this message translates to:
  /// **'Kaydedilen'**
  String get editorStatSaved;

  /// No description provided for @editorPhotoSelected.
  ///
  /// In tr, this message translates to:
  /// **'{tool} için fotoğraf seçildi: {name}'**
  String editorPhotoSelected(Object tool, Object name);

  /// No description provided for @galleryTitle.
  ///
  /// In tr, this message translates to:
  /// **'Galeri'**
  String get galleryTitle;

  /// No description provided for @galleryEditCount.
  ///
  /// In tr, this message translates to:
  /// **'{count} düzenleme'**
  String galleryEditCount(Object count);

  /// No description provided for @gallerySearchHint.
  ///
  /// In tr, this message translates to:
  /// **'Düzenleme ara...'**
  String get gallerySearchHint;

  /// No description provided for @galleryFilterAll.
  ///
  /// In tr, this message translates to:
  /// **'Tümü'**
  String get galleryFilterAll;

  /// No description provided for @galleryFilterFavorite.
  ///
  /// In tr, this message translates to:
  /// **'Favori'**
  String get galleryFilterFavorite;

  /// No description provided for @galleryFilterEnhanced.
  ///
  /// In tr, this message translates to:
  /// **'Enhanced'**
  String get galleryFilterEnhanced;

  /// No description provided for @galleryFilterUpscale.
  ///
  /// In tr, this message translates to:
  /// **'Upscale'**
  String get galleryFilterUpscale;

  /// No description provided for @galleryFilterBgRemove.
  ///
  /// In tr, this message translates to:
  /// **'BG Sil'**
  String get galleryFilterBgRemove;

  /// No description provided for @galleryFilterDeblur.
  ///
  /// In tr, this message translates to:
  /// **'Deblur'**
  String get galleryFilterDeblur;

  /// No description provided for @galleryDateToday.
  ///
  /// In tr, this message translates to:
  /// **'Bugün'**
  String get galleryDateToday;

  /// No description provided for @galleryDateYesterday.
  ///
  /// In tr, this message translates to:
  /// **'Dün'**
  String get galleryDateYesterday;

  /// No description provided for @galleryDateDaysAgo.
  ///
  /// In tr, this message translates to:
  /// **'{count} gün önce'**
  String galleryDateDaysAgo(Object count);

  /// No description provided for @galleryEmptyTitle.
  ///
  /// In tr, this message translates to:
  /// **'Henüz düzenleme yok'**
  String get galleryEmptyTitle;

  /// No description provided for @galleryEmptySubtitle.
  ///
  /// In tr, this message translates to:
  /// **'İlk fotoğrafınızı düzenleyin!'**
  String get galleryEmptySubtitle;

  /// No description provided for @galleryTypeBgRemoved.
  ///
  /// In tr, this message translates to:
  /// **'BG Silindi'**
  String get galleryTypeBgRemoved;

  /// No description provided for @galleryTypeFilter.
  ///
  /// In tr, this message translates to:
  /// **'Filtre'**
  String get galleryTypeFilter;

  /// No description provided for @settingsTitle.
  ///
  /// In tr, this message translates to:
  /// **'Ayarlar'**
  String get settingsTitle;

  /// No description provided for @settingsProfileGuest.
  ///
  /// In tr, this message translates to:
  /// **'Misafir Kullanıcı'**
  String get settingsProfileGuest;

  /// No description provided for @settingsProfileEmail.
  ///
  /// In tr, this message translates to:
  /// **'guest@omniacreata.com'**
  String get settingsProfileEmail;

  /// No description provided for @settingsDailyUsage.
  ///
  /// In tr, this message translates to:
  /// **'Günlük Kullanım'**
  String get settingsDailyUsage;

  /// No description provided for @settingsStatEdits.
  ///
  /// In tr, this message translates to:
  /// **'Düzenleme'**
  String get settingsStatEdits;

  /// No description provided for @settingsStatThisMonth.
  ///
  /// In tr, this message translates to:
  /// **'Bu Ay'**
  String get settingsStatThisMonth;

  /// No description provided for @settingsStatTotalOps.
  ///
  /// In tr, this message translates to:
  /// **'Toplam İşlem'**
  String get settingsStatTotalOps;

  /// No description provided for @settingsAppearance.
  ///
  /// In tr, this message translates to:
  /// **'Görünüm'**
  String get settingsAppearance;

  /// No description provided for @settingsTheme.
  ///
  /// In tr, this message translates to:
  /// **'Tema'**
  String get settingsTheme;

  /// No description provided for @settingsThemeDark.
  ///
  /// In tr, this message translates to:
  /// **'Karanlık'**
  String get settingsThemeDark;

  /// No description provided for @settingsThemeAmoled.
  ///
  /// In tr, this message translates to:
  /// **'AMOLED'**
  String get settingsThemeAmoled;

  /// No description provided for @settingsThemeLight.
  ///
  /// In tr, this message translates to:
  /// **'Açık'**
  String get settingsThemeLight;

  /// No description provided for @settingsLanguage.
  ///
  /// In tr, this message translates to:
  /// **'Dil'**
  String get settingsLanguage;

  /// No description provided for @settingsNotifications.
  ///
  /// In tr, this message translates to:
  /// **'Bildirimler'**
  String get settingsNotifications;

  /// No description provided for @settingsEmailSummary.
  ///
  /// In tr, this message translates to:
  /// **'E-posta Özeti'**
  String get settingsEmailSummary;

  /// No description provided for @settingsAccount.
  ///
  /// In tr, this message translates to:
  /// **'Hesap'**
  String get settingsAccount;

  /// No description provided for @settingsSubscription.
  ///
  /// In tr, this message translates to:
  /// **'Üyelik Planım'**
  String get settingsSubscription;

  /// No description provided for @settingsSubscriptionDesc.
  ///
  /// In tr, this message translates to:
  /// **'Free · Yükselt'**
  String get settingsSubscriptionDesc;

  /// No description provided for @settingsInviteFriend.
  ///
  /// In tr, this message translates to:
  /// **'Arkadaşını Davet Et'**
  String get settingsInviteFriend;

  /// No description provided for @settingsInviteReward.
  ///
  /// In tr, this message translates to:
  /// **'50 hak kazan'**
  String get settingsInviteReward;

  /// No description provided for @settingsRateApp.
  ///
  /// In tr, this message translates to:
  /// **'Uygulamayı Değerlendir'**
  String get settingsRateApp;

  /// No description provided for @settingsRateDesc.
  ///
  /// In tr, this message translates to:
  /// **'5 yıldız ver!'**
  String get settingsRateDesc;

  /// No description provided for @settingsHelpCenter.
  ///
  /// In tr, this message translates to:
  /// **'Yardım Merkezi'**
  String get settingsHelpCenter;

  /// No description provided for @settingsHelpDesc.
  ///
  /// In tr, this message translates to:
  /// **'SSS ve destek'**
  String get settingsHelpDesc;

  /// No description provided for @settingsPrivacy.
  ///
  /// In tr, this message translates to:
  /// **'Gizlilik Politikası'**
  String get settingsPrivacy;

  /// No description provided for @settingsTerms.
  ///
  /// In tr, this message translates to:
  /// **'Kullanım Koşulları'**
  String get settingsTerms;

  /// No description provided for @settingsVersion.
  ///
  /// In tr, this message translates to:
  /// **'Versiyon'**
  String get settingsVersion;

  /// No description provided for @settingsLogout.
  ///
  /// In tr, this message translates to:
  /// **'Çıkış Yap'**
  String get settingsLogout;

  /// No description provided for @settingsDeleteAccount.
  ///
  /// In tr, this message translates to:
  /// **'Hesabımı Sil'**
  String get settingsDeleteAccount;

  /// No description provided for @navHome.
  ///
  /// In tr, this message translates to:
  /// **'Ana Sayfa'**
  String get navHome;

  /// No description provided for @navEditor.
  ///
  /// In tr, this message translates to:
  /// **'Editor'**
  String get navEditor;

  /// No description provided for @navGallery.
  ///
  /// In tr, this message translates to:
  /// **'Gallery'**
  String get navGallery;

  /// No description provided for @navProfile.
  ///
  /// In tr, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @paywallTitle.
  ///
  /// In tr, this message translates to:
  /// **'Planını Seç'**
  String get paywallTitle;

  /// No description provided for @paywallSubtitle.
  ///
  /// In tr, this message translates to:
  /// **'İhtiyacına en uygun planı bul'**
  String get paywallSubtitle;

  /// No description provided for @paywallFreeName.
  ///
  /// In tr, this message translates to:
  /// **'Free'**
  String get paywallFreeName;

  /// No description provided for @paywallFreeDesc.
  ///
  /// In tr, this message translates to:
  /// **'Başlamak için mükemmel'**
  String get paywallFreeDesc;

  /// No description provided for @paywallFreeRights.
  ///
  /// In tr, this message translates to:
  /// **'Günlük 10 kullanım hakkı'**
  String get paywallFreeRights;

  /// No description provided for @paywallFreeUpscale.
  ///
  /// In tr, this message translates to:
  /// **'2× AI Büyütme'**
  String get paywallFreeUpscale;

  /// No description provided for @paywallFreeFilters.
  ///
  /// In tr, this message translates to:
  /// **'Temel filtreler'**
  String get paywallFreeFilters;

  /// No description provided for @paywallFreeAdReward.
  ///
  /// In tr, this message translates to:
  /// **'Reklam izleyerek +5 hak'**
  String get paywallFreeAdReward;

  /// No description provided for @paywallFreeBadge.
  ///
  /// In tr, this message translates to:
  /// **'OmniaPixels rozeti'**
  String get paywallFreeBadge;

  /// No description provided for @paywallFreeBadgeNote.
  ///
  /// In tr, this message translates to:
  /// **'Zorunlu'**
  String get paywallFreeBadgeNote;

  /// No description provided for @paywallFreeNoCloud.
  ///
  /// In tr, this message translates to:
  /// **'Bulut işleme'**
  String get paywallFreeNoCloud;

  /// No description provided for @paywallFreeNoUpscale.
  ///
  /// In tr, this message translates to:
  /// **'4× / 8× Büyütme'**
  String get paywallFreeNoUpscale;

  /// No description provided for @paywallFreeNoFast.
  ///
  /// In tr, this message translates to:
  /// **'Hızlı işleme'**
  String get paywallFreeNoFast;

  /// No description provided for @paywallFreeNoBatch.
  ///
  /// In tr, this message translates to:
  /// **'Toplu işleme'**
  String get paywallFreeNoBatch;

  /// No description provided for @paywallFreeCta.
  ///
  /// In tr, this message translates to:
  /// **'Mevcut Plan'**
  String get paywallFreeCta;

  /// No description provided for @paywallProName.
  ///
  /// In tr, this message translates to:
  /// **'Pro'**
  String get paywallProName;

  /// No description provided for @paywallProTag.
  ///
  /// In tr, this message translates to:
  /// **'En Popüler'**
  String get paywallProTag;

  /// No description provided for @paywallProDesc.
  ///
  /// In tr, this message translates to:
  /// **'Yaratıcılar ve profesyoneller için'**
  String get paywallProDesc;

  /// No description provided for @paywallProUnlimited.
  ///
  /// In tr, this message translates to:
  /// **'Sınırsız kullanım'**
  String get paywallProUnlimited;

  /// No description provided for @paywallProAllAi.
  ///
  /// In tr, this message translates to:
  /// **'Tüm AI modülleri'**
  String get paywallProAllAi;

  /// No description provided for @paywallProUpscale.
  ///
  /// In tr, this message translates to:
  /// **'4× ve 8× Büyütme'**
  String get paywallProUpscale;

  /// No description provided for @paywallProFast.
  ///
  /// In tr, this message translates to:
  /// **'Hızlı işleme'**
  String get paywallProFast;

  /// No description provided for @paywallProBatch.
  ///
  /// In tr, this message translates to:
  /// **'Toplu işleme (100+ fotoğraf)'**
  String get paywallProBatch;

  /// No description provided for @paywallProNoBadge.
  ///
  /// In tr, this message translates to:
  /// **'Rozetsiz export'**
  String get paywallProNoBadge;

  /// No description provided for @paywallProCloud.
  ///
  /// In tr, this message translates to:
  /// **'Bulut senkronizasyon'**
  String get paywallProCloud;

  /// No description provided for @paywallProStyle.
  ///
  /// In tr, this message translates to:
  /// **'Style Transfer AI'**
  String get paywallProStyle;

  /// No description provided for @paywallProNoAds.
  ///
  /// In tr, this message translates to:
  /// **'Reklamsız deneyim'**
  String get paywallProNoAds;

  /// No description provided for @paywallProCta.
  ///
  /// In tr, this message translates to:
  /// **'Pro\'ya Geç'**
  String get paywallProCta;

  /// No description provided for @paywallEntName.
  ///
  /// In tr, this message translates to:
  /// **'Enterprise'**
  String get paywallEntName;

  /// No description provided for @paywallEntTag.
  ///
  /// In tr, this message translates to:
  /// **'Kurumsal'**
  String get paywallEntTag;

  /// No description provided for @paywallEntDesc.
  ///
  /// In tr, this message translates to:
  /// **'Ekipler ve şirketler için'**
  String get paywallEntDesc;

  /// No description provided for @paywallEntPrice.
  ///
  /// In tr, this message translates to:
  /// **'Özel'**
  String get paywallEntPrice;

  /// No description provided for @paywallEntCta.
  ///
  /// In tr, this message translates to:
  /// **'İletişime Geç'**
  String get paywallEntCta;

  /// No description provided for @paywallOrBuyRights.
  ///
  /// In tr, this message translates to:
  /// **'VEYA HAK SATIN AL'**
  String get paywallOrBuyRights;

  /// No description provided for @paywallRightsUnit.
  ///
  /// In tr, this message translates to:
  /// **'hak'**
  String get paywallRightsUnit;

  /// No description provided for @paywallPerRight.
  ///
  /// In tr, this message translates to:
  /// **'{price}/hak'**
  String paywallPerRight(Object price);

  /// No description provided for @paywallPopularTag.
  ///
  /// In tr, this message translates to:
  /// **'Popüler'**
  String get paywallPopularTag;

  /// No description provided for @paywallBestValueTag.
  ///
  /// In tr, this message translates to:
  /// **'En Avantajlı'**
  String get paywallBestValueTag;

  /// No description provided for @paywallGuarantee.
  ///
  /// In tr, this message translates to:
  /// **'7 gün para iade garantisi · İstediğin zaman iptal et'**
  String get paywallGuarantee;

  /// No description provided for @paywallMonthly.
  ///
  /// In tr, this message translates to:
  /// **'Aylık'**
  String get paywallMonthly;

  /// No description provided for @paywallYearly.
  ///
  /// In tr, this message translates to:
  /// **'Yıllık'**
  String get paywallYearly;

  /// No description provided for @paywallYearlySave.
  ///
  /// In tr, this message translates to:
  /// **'%40 tasarruf'**
  String get paywallYearlySave;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'de',
    'en',
    'es',
    'ja',
    'tr',
    'zh',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'ja':
      return AppLocalizationsJa();
    case 'tr':
      return AppLocalizationsTr();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
