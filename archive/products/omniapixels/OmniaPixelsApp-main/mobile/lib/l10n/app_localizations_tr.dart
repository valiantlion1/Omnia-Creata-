// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkish (`tr`).
class AppLocalizationsTr extends AppLocalizations {
  AppLocalizationsTr([String locale = 'tr']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => 'Tek dokunuşla profesyonel fotoğraf';

  @override
  String get splashLoading => 'AI motoru başlatılıyor...';

  @override
  String get splashSubtitle => 'BY OMNIACREATA';

  @override
  String get onboardingSkip => 'Atla';

  @override
  String get onboardingContinue => 'Devam Et';

  @override
  String get onboardingGetStarted => 'Başlayalım';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return 'Devam ederek $policy kabul etmiş olursunuz';
  }

  @override
  String get onboardingPrivacyPolicy => 'Gizlilik Politikasını';

  @override
  String get onboardingSlide1Tag => 'AI YETENEĞİ';

  @override
  String get onboardingSlide1Title => 'Sinematik\nAI İyileştirme';

  @override
  String get onboardingSlide1Desc =>
      'Yapay zekâ fotoğrafınızı analiz eder, türünü tanır ve tek dokunuşta profesyonel sonuç üretir. Selfie, ürün, manzara — hepsini mükemmel yapar.';

  @override
  String get onboardingSlide2Tag => 'GİZLİLİK ÖNCELİKLİ';

  @override
  String get onboardingSlide2Title => 'Cihazında\nGüvenli İşleme';

  @override
  String get onboardingSlide2Desc =>
      'Tüm işlemler doğrudan cihazınızda gerçekleşir. Fotoğraflarınız asla sunucuya yüklenmez. Tamamen ücretsiz, tamamen gizli.';

  @override
  String get onboardingSlide3Tag => 'PRO GÜÇ';

  @override
  String get onboardingSlide3Title => 'Bulut Hızı,\nPremium Kalite';

  @override
  String get onboardingSlide3Desc =>
      'Pro ile 4× ve 8× büyütme, toplu düzenleme ve tüm AI araçlarına anında erişim. Saniyeler içinde profesyonel sonuç.';

  @override
  String get loginWelcomeBack => 'Tekrar Hoş Geldin';

  @override
  String get loginCreateAccount => 'Hesap Oluştur';

  @override
  String get loginRegisterSubtitle => 'OmniaPixels ailesine katıl';

  @override
  String get loginTitle => 'Hesap oluştur';

  @override
  String get loginSubtitle => 'OmniaPixels ailesine katıl';

  @override
  String get loginTabSignIn => 'Giriş Yap';

  @override
  String get loginTabSignUp => 'Kayıt Ol';

  @override
  String get loginNameLabel => 'AD SOYAD';

  @override
  String get loginNameHint => 'Adınızı girin';

  @override
  String get loginEmailLabel => 'E-POSTA';

  @override
  String get loginEmailHint => 'ornek@email.com';

  @override
  String get loginPasswordLabel => 'ŞİFRE';

  @override
  String get loginPasswordHint => 'En az 6 karakter';

  @override
  String get loginSignInButton => 'Giriş Yap';

  @override
  String get loginSignUpButton => 'Kayıt Ol';

  @override
  String get loginOrDivider => 'veya';

  @override
  String get loginGoogleButton => 'Google ile devam et';

  @override
  String get loginAppleButton => 'Apple ile devam et';

  @override
  String get loginGuestButton => 'Misafir olarak devam et';

  @override
  String get loginGuestSubtext => 'Sadece cihaz içi özellikler';

  @override
  String get loginForgotPassword => 'Şifreni mi unuttun?';

  @override
  String get loginTerms =>
      'Devam ederek Kullanım Koşullarını ve Gizlilik Politikasını kabul etmiş olursunuz.';

  @override
  String editorGreeting(Object name) {
    return 'Merhaba, $name';
  }

  @override
  String get editorFreeLabel => 'FREE';

  @override
  String get editorDailyUsage => 'Günlük Kullanım';

  @override
  String get editorUpgradePro => 'Pro\'ya Geç';

  @override
  String editorRightsCount(Object count) {
    return '/ $count hak';
  }

  @override
  String get editorWatchAdReward => 'Reklam izleyerek +5 hak kazan';

  @override
  String get editorAddPhoto => 'Fotoğraf Ekle';

  @override
  String get editorAddPhotoDesc => 'Galeriden seçin veya kamera ile çekin';

  @override
  String get editorQuickTools => 'Hızlı Araçlar';

  @override
  String get editorToolEnhance => 'AI İyileştir';

  @override
  String get editorToolBgRemove => 'Arka Plan Sil';

  @override
  String get editorToolUpscale => 'Büyüt';

  @override
  String get editorToolDeblur => 'Netleştir';

  @override
  String get editorToolStyle => 'Stil Ver';

  @override
  String get editorToolCompare => 'Karşılaştır';

  @override
  String editorRightsUnit(Object count) {
    return '$count hak';
  }

  @override
  String get editorAiSuggestion => 'AI Öneriyor';

  @override
  String get editorAiSuggestionDesc =>
      'Son fotoğrafın için Upscale 2× önerilir';

  @override
  String get editorRecentEdits => 'Son Düzenlemeler';

  @override
  String get editorViewAll => 'Tümünü Gör';

  @override
  String get editorNewItem => 'Yeni';

  @override
  String get editorLabelAiEnhanced => 'AI Enhanced';

  @override
  String get editorLabelBgRemoved => 'BG Silindi';

  @override
  String get editorLabelUpscale => '4× Upscale';

  @override
  String get editorStatEdited => 'Düzenlendi';

  @override
  String get editorStatThisWeek => 'Bu Hafta';

  @override
  String get editorStatSaved => 'Kaydedilen';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return '$tool için fotoğraf seçildi: $name';
  }

  @override
  String get galleryTitle => 'Galeri';

  @override
  String galleryEditCount(Object count) {
    return '$count düzenleme';
  }

  @override
  String get gallerySearchHint => 'Düzenleme ara...';

  @override
  String get galleryFilterAll => 'Tümü';

  @override
  String get galleryFilterFavorite => 'Favori';

  @override
  String get galleryFilterEnhanced => 'Enhanced';

  @override
  String get galleryFilterUpscale => 'Upscale';

  @override
  String get galleryFilterBgRemove => 'BG Sil';

  @override
  String get galleryFilterDeblur => 'Deblur';

  @override
  String get galleryDateToday => 'Bugün';

  @override
  String get galleryDateYesterday => 'Dün';

  @override
  String galleryDateDaysAgo(Object count) {
    return '$count gün önce';
  }

  @override
  String get galleryEmptyTitle => 'Henüz düzenleme yok';

  @override
  String get galleryEmptySubtitle => 'İlk fotoğrafınızı düzenleyin!';

  @override
  String get galleryTypeBgRemoved => 'BG Silindi';

  @override
  String get galleryTypeFilter => 'Filtre';

  @override
  String get settingsTitle => 'Ayarlar';

  @override
  String get settingsProfileGuest => 'Misafir Kullanıcı';

  @override
  String get settingsProfileEmail => 'guest@omniacreata.com';

  @override
  String get settingsDailyUsage => 'Günlük Kullanım';

  @override
  String get settingsStatEdits => 'Düzenleme';

  @override
  String get settingsStatThisMonth => 'Bu Ay';

  @override
  String get settingsStatTotalOps => 'Toplam İşlem';

  @override
  String get settingsAppearance => 'Görünüm';

  @override
  String get settingsTheme => 'Tema';

  @override
  String get settingsThemeDark => 'Karanlık';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => 'Açık';

  @override
  String get settingsLanguage => 'Dil';

  @override
  String get settingsNotifications => 'Bildirimler';

  @override
  String get settingsEmailSummary => 'E-posta Özeti';

  @override
  String get settingsAccount => 'Hesap';

  @override
  String get settingsSubscription => 'Üyelik Planım';

  @override
  String get settingsSubscriptionDesc => 'Free · Yükselt';

  @override
  String get settingsInviteFriend => 'Arkadaşını Davet Et';

  @override
  String get settingsInviteReward => '50 hak kazan';

  @override
  String get settingsRateApp => 'Uygulamayı Değerlendir';

  @override
  String get settingsRateDesc => '5 yıldız ver!';

  @override
  String get settingsHelpCenter => 'Yardım Merkezi';

  @override
  String get settingsHelpDesc => 'SSS ve destek';

  @override
  String get settingsPrivacy => 'Gizlilik Politikası';

  @override
  String get settingsTerms => 'Kullanım Koşulları';

  @override
  String get settingsVersion => 'Versiyon';

  @override
  String get settingsLogout => 'Çıkış Yap';

  @override
  String get settingsDeleteAccount => 'Hesabımı Sil';

  @override
  String get navHome => 'Ana Sayfa';

  @override
  String get navEditor => 'Editor';

  @override
  String get navGallery => 'Gallery';

  @override
  String get navProfile => 'Profile';

  @override
  String get paywallTitle => 'Planını Seç';

  @override
  String get paywallSubtitle => 'İhtiyacına en uygun planı bul';

  @override
  String get paywallFreeName => 'Free';

  @override
  String get paywallFreeDesc => 'Başlamak için mükemmel';

  @override
  String get paywallFreeRights => 'Günlük 10 kullanım hakkı';

  @override
  String get paywallFreeUpscale => '2× AI Büyütme';

  @override
  String get paywallFreeFilters => 'Temel filtreler';

  @override
  String get paywallFreeAdReward => 'Reklam izleyerek +5 hak';

  @override
  String get paywallFreeBadge => 'OmniaPixels rozeti';

  @override
  String get paywallFreeBadgeNote => 'Zorunlu';

  @override
  String get paywallFreeNoCloud => 'Bulut işleme';

  @override
  String get paywallFreeNoUpscale => '4× / 8× Büyütme';

  @override
  String get paywallFreeNoFast => 'Hızlı işleme';

  @override
  String get paywallFreeNoBatch => 'Toplu işleme';

  @override
  String get paywallFreeCta => 'Mevcut Plan';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => 'En Popüler';

  @override
  String get paywallProDesc => 'Yaratıcılar ve profesyoneller için';

  @override
  String get paywallProUnlimited => 'Sınırsız kullanım';

  @override
  String get paywallProAllAi => 'Tüm AI modülleri';

  @override
  String get paywallProUpscale => '4× ve 8× Büyütme';

  @override
  String get paywallProFast => 'Hızlı işleme';

  @override
  String get paywallProBatch => 'Toplu işleme (100+ fotoğraf)';

  @override
  String get paywallProNoBadge => 'Rozetsiz export';

  @override
  String get paywallProCloud => 'Bulut senkronizasyon';

  @override
  String get paywallProStyle => 'Style Transfer AI';

  @override
  String get paywallProNoAds => 'Reklamsız deneyim';

  @override
  String get paywallProCta => 'Pro\'ya Geç';

  @override
  String get paywallEntName => 'Enterprise';

  @override
  String get paywallEntTag => 'Kurumsal';

  @override
  String get paywallEntDesc => 'Ekipler ve şirketler için';

  @override
  String get paywallEntPrice => 'Özel';

  @override
  String get paywallEntCta => 'İletişime Geç';

  @override
  String get paywallOrBuyRights => 'VEYA HAK SATIN AL';

  @override
  String get paywallRightsUnit => 'hak';

  @override
  String paywallPerRight(Object price) {
    return '$price/hak';
  }

  @override
  String get paywallPopularTag => 'Popüler';

  @override
  String get paywallBestValueTag => 'En Avantajlı';

  @override
  String get paywallGuarantee =>
      '7 gün para iade garantisi · İstediğin zaman iptal et';

  @override
  String get paywallMonthly => 'Aylık';

  @override
  String get paywallYearly => 'Yıllık';

  @override
  String get paywallYearlySave => '%40 tasarruf';
}
