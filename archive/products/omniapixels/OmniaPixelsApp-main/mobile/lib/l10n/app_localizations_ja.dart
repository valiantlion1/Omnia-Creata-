// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => 'ワンタッチでプロフェッショナルな写真を';

  @override
  String get splashLoading => 'AIエンジンを起動中...';

  @override
  String get splashSubtitle => 'BY OMNIACREATA';

  @override
  String get onboardingSkip => 'スキップ';

  @override
  String get onboardingContinue => '続行';

  @override
  String get onboardingGetStarted => '始める';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return '続行することで、$policyに同意したことになります';
  }

  @override
  String get onboardingPrivacyPolicy => 'プライバシーポリシー';

  @override
  String get onboardingSlide1Tag => 'AI能力';

  @override
  String get onboardingSlide1Title => '映画のような\nAI機能';

  @override
  String get onboardingSlide1Desc => 'AIが写真を分析し、種類を認識してワンタッチでプロの結果を出します。';

  @override
  String get onboardingSlide2Tag => 'プライバシー第一';

  @override
  String get onboardingSlide2Title => '安全な\nデバイス内処理';

  @override
  String get onboardingSlide2Desc =>
      'すべての処理はデバイス上で直接行われます。写真はサーバーにアップロードされません。';

  @override
  String get onboardingSlide3Tag => 'プロパワー';

  @override
  String get onboardingSlide3Title => 'クラウドの速度、\nプレミアム品質';

  @override
  String get onboardingSlide3Desc => 'Proでは、4倍と8倍のアップスケーリング、一括編集をご利用いただけます。';

  @override
  String get loginWelcomeBack => 'お帰りなさい';

  @override
  String get loginCreateAccount => 'アカウント作成';

  @override
  String get loginRegisterSubtitle => 'OmniaPixelsファミリーに参加しましょう';

  @override
  String get loginTitle => 'アカウント作成';

  @override
  String get loginSubtitle => 'OmniaPixelsファミリーに参加しましょう';

  @override
  String get loginTabSignIn => 'ログイン';

  @override
  String get loginTabSignUp => '登録';

  @override
  String get loginNameLabel => 'フルネーム';

  @override
  String get loginNameHint => '名前を入力';

  @override
  String get loginEmailLabel => 'メールアドレス';

  @override
  String get loginEmailHint => 'example@email.com';

  @override
  String get loginPasswordLabel => 'パスワード';

  @override
  String get loginPasswordHint => '6文字以上';

  @override
  String get loginSignInButton => 'ログイン';

  @override
  String get loginSignUpButton => '登録';

  @override
  String get loginOrDivider => 'または';

  @override
  String get loginGoogleButton => 'Googleで続行';

  @override
  String get loginAppleButton => 'Appleで続行';

  @override
  String get loginGuestButton => 'ゲストとして続行';

  @override
  String get loginGuestSubtext => 'デバイス機能のみ';

  @override
  String get loginForgotPassword => 'パスワードをお忘れですか？';

  @override
  String get loginTerms => '続行することで、利用規約に同意したことになります。';

  @override
  String editorGreeting(Object name) {
    return 'こんにちは、$nameさん';
  }

  @override
  String get editorFreeLabel => '無料';

  @override
  String get editorDailyUsage => '毎日の利用';

  @override
  String get editorUpgradePro => 'Proにアップグレード';

  @override
  String editorRightsCount(Object count) {
    return '/ $count 回';
  }

  @override
  String get editorWatchAdReward => '広告を見て+5回獲得';

  @override
  String get editorAddPhoto => '写真を追加';

  @override
  String get editorAddPhotoDesc => 'ギャラリーから選択か撮影';

  @override
  String get editorQuickTools => 'クイックツール';

  @override
  String get editorToolEnhance => 'AI補正';

  @override
  String get editorToolBgRemove => '背景削除';

  @override
  String get editorToolUpscale => '高画質化';

  @override
  String get editorToolDeblur => 'ぼかし除去';

  @override
  String get editorToolStyle => 'スタイル';

  @override
  String get editorToolCompare => '比較';

  @override
  String editorRightsUnit(Object count) {
    return '$count 回';
  }

  @override
  String get editorAiSuggestion => 'AIの提案';

  @override
  String get editorAiSuggestionDesc => '2倍の高画質化をおすすめします';

  @override
  String get editorRecentEdits => '最近の編集';

  @override
  String get editorViewAll => 'すべて見る';

  @override
  String get editorNewItem => '新規';

  @override
  String get editorLabelAiEnhanced => 'AI補正';

  @override
  String get editorLabelBgRemoved => '背景削除';

  @override
  String get editorLabelUpscale => '4倍高画質化';

  @override
  String get editorStatEdited => '編集済み';

  @override
  String get editorStatThisWeek => '今週';

  @override
  String get editorStatSaved => '保存済み';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return '$tool用に選択された写真: $name';
  }

  @override
  String get galleryTitle => 'ギャラリー';

  @override
  String galleryEditCount(Object count) {
    return '$count 件の編集';
  }

  @override
  String get gallerySearchHint => '編集を検索...';

  @override
  String get galleryFilterAll => 'すべて';

  @override
  String get galleryFilterFavorite => 'お気に入り';

  @override
  String get galleryFilterEnhanced => '補正済み';

  @override
  String get galleryFilterUpscale => '高画質化';

  @override
  String get galleryFilterBgRemove => '背景削除';

  @override
  String get galleryFilterDeblur => 'ぼかし除去';

  @override
  String get galleryDateToday => '今日';

  @override
  String get galleryDateYesterday => '昨日';

  @override
  String galleryDateDaysAgo(Object count) {
    return '$count日前';
  }

  @override
  String get galleryEmptyTitle => '編集はまだありません';

  @override
  String get galleryEmptySubtitle => '最初の写真を編集しましょう！';

  @override
  String get galleryTypeBgRemoved => '背景削除';

  @override
  String get galleryTypeFilter => 'フィルター';

  @override
  String get settingsTitle => '設定';

  @override
  String get settingsProfileGuest => 'ゲストユーザー';

  @override
  String get settingsProfileEmail => 'guest@omniacreata.com';

  @override
  String get settingsDailyUsage => '毎日の利用';

  @override
  String get settingsStatEdits => '編集';

  @override
  String get settingsStatThisMonth => '今月';

  @override
  String get settingsStatTotalOps => '合計回数';

  @override
  String get settingsAppearance => '外観';

  @override
  String get settingsTheme => 'テーマ';

  @override
  String get settingsThemeDark => 'ダーク';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => 'ライト';

  @override
  String get settingsLanguage => '言語';

  @override
  String get settingsNotifications => '通知';

  @override
  String get settingsEmailSummary => 'メール概要';

  @override
  String get settingsAccount => 'アカウント';

  @override
  String get settingsSubscription => 'プラン';

  @override
  String get settingsSubscriptionDesc => '無料 · アップグレード';

  @override
  String get settingsInviteFriend => '友達を招待';

  @override
  String get settingsInviteReward => '50回獲得';

  @override
  String get settingsRateApp => 'アプリを評価';

  @override
  String get settingsRateDesc => '5つ星をお願いします！';

  @override
  String get settingsHelpCenter => 'ヘルプセンター';

  @override
  String get settingsHelpDesc => 'サポート';

  @override
  String get settingsPrivacy => 'プライバシーポリシー';

  @override
  String get settingsTerms => '利用規約';

  @override
  String get settingsVersion => 'バージョン';

  @override
  String get settingsLogout => 'ログアウト';

  @override
  String get settingsDeleteAccount => 'アカウントを削除';

  @override
  String get navHome => 'ホーム';

  @override
  String get navEditor => 'エディタ';

  @override
  String get navGallery => 'ギャラリー';

  @override
  String get navProfile => 'プロフィール';

  @override
  String get paywallTitle => 'プランを選択';

  @override
  String get paywallSubtitle => 'あなたに最適なプランを見つけてください';

  @override
  String get paywallFreeName => '無料';

  @override
  String get paywallFreeDesc => 'お試しに最適';

  @override
  String get paywallFreeRights => '毎日10回の利用権';

  @override
  String get paywallFreeUpscale => '2倍AI高画質化';

  @override
  String get paywallFreeFilters => '基本フィルター';

  @override
  String get paywallFreeAdReward => '広告視聴で+5回';

  @override
  String get paywallFreeBadge => 'OmniaPixelsバッジ';

  @override
  String get paywallFreeBadgeNote => '必須';

  @override
  String get paywallFreeNoCloud => 'クラウド処理';

  @override
  String get paywallFreeNoUpscale => '4倍 / 8倍 高画質化';

  @override
  String get paywallFreeNoFast => '高速処理';

  @override
  String get paywallFreeNoBatch => '一括処理';

  @override
  String get paywallFreeCta => '現在のプラン';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => '一番人気';

  @override
  String get paywallProDesc => 'クリエイターやプロ向け';

  @override
  String get paywallProUnlimited => '無制限利用';

  @override
  String get paywallProAllAi => 'すべてのAIモジュール';

  @override
  String get paywallProUpscale => '4倍と8倍の高画質化';

  @override
  String get paywallProFast => '高速処理';

  @override
  String get paywallProBatch => '一括処理（100枚以上）';

  @override
  String get paywallProNoBadge => 'バッジなしでエクスポート';

  @override
  String get paywallProCloud => 'クラウド動機';

  @override
  String get paywallProStyle => 'スタイル変換AI';

  @override
  String get paywallProNoAds => '広告なしの体験';

  @override
  String get paywallProCta => 'Proにアップグレード';

  @override
  String get paywallEntName => 'Enterprise';

  @override
  String get paywallEntTag => 'ビジネス';

  @override
  String get paywallEntDesc => 'チーム向け';

  @override
  String get paywallEntPrice => 'カスタム';

  @override
  String get paywallEntCta => 'お問い合わせ';

  @override
  String get paywallOrBuyRights => 'または権利を購入';

  @override
  String get paywallRightsUnit => '回';

  @override
  String paywallPerRight(Object price) {
    return '$price/回';
  }

  @override
  String get paywallPopularTag => '人気';

  @override
  String get paywallBestValueTag => '最もお得';

  @override
  String get paywallGuarantee => '7日間の返金保証';

  @override
  String get paywallMonthly => '月間';

  @override
  String get paywallYearly => '年間';

  @override
  String get paywallYearlySave => '40%お得';
}
