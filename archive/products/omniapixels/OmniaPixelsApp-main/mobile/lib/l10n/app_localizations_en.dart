// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => 'Professional photos with one touch';

  @override
  String get splashLoading => 'Starting AI engine...';

  @override
  String get splashSubtitle => 'BY OMNIACREATA';

  @override
  String get onboardingSkip => 'Skip';

  @override
  String get onboardingContinue => 'Continue';

  @override
  String get onboardingGetStarted => 'Get Started';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return 'By continuing, you accept the $policy';
  }

  @override
  String get onboardingPrivacyPolicy => 'Privacy Policy';

  @override
  String get onboardingSlide1Tag => 'AI CAPABILITY';

  @override
  String get onboardingSlide1Title => 'Cinematic\nAI Enhancement';

  @override
  String get onboardingSlide1Desc =>
      'AI analyzes your photo, recognizes its type, and produces professional results with one touch. Selfies, products, landscapes — it perfects them all.';

  @override
  String get onboardingSlide2Tag => 'PRIVACY FIRST';

  @override
  String get onboardingSlide2Title => 'Secure\nOn-Device Processing';

  @override
  String get onboardingSlide2Desc =>
      'All processing happens directly on your device. Your photos are never uploaded to a server. Completely free, completely private.';

  @override
  String get onboardingSlide3Tag => 'PRO POWER';

  @override
  String get onboardingSlide3Title => 'Cloud Speed,\nPremium Quality';

  @override
  String get onboardingSlide3Desc =>
      'With Pro, get 4× and 8× upscaling, batch editing, and instant access to all AI tools. Professional results in seconds.';

  @override
  String get loginWelcomeBack => 'Welcome Back';

  @override
  String get loginCreateAccount => 'Create Account';

  @override
  String get loginRegisterSubtitle => 'Join the OmniaPixels family';

  @override
  String get loginTitle => 'Create Account';

  @override
  String get loginSubtitle => 'Join the OmniaPixels family';

  @override
  String get loginTabSignIn => 'Sign In';

  @override
  String get loginTabSignUp => 'Sign Up';

  @override
  String get loginNameLabel => 'FULL NAME';

  @override
  String get loginNameHint => 'Enter your name';

  @override
  String get loginEmailLabel => 'EMAIL';

  @override
  String get loginEmailHint => 'example@email.com';

  @override
  String get loginPasswordLabel => 'PASSWORD';

  @override
  String get loginPasswordHint => 'At least 6 characters';

  @override
  String get loginSignInButton => 'Sign In';

  @override
  String get loginSignUpButton => 'Sign Up';

  @override
  String get loginOrDivider => 'or';

  @override
  String get loginGoogleButton => 'Continue with Google';

  @override
  String get loginAppleButton => 'Continue with Apple';

  @override
  String get loginGuestButton => 'Continue as Guest';

  @override
  String get loginGuestSubtext => 'On-device features only';

  @override
  String get loginForgotPassword => 'Forgot your password?';

  @override
  String get loginTerms =>
      'By continuing, you accept the Terms of Service and Privacy Policy.';

  @override
  String editorGreeting(Object name) {
    return 'Hello, $name';
  }

  @override
  String get editorFreeLabel => 'FREE';

  @override
  String get editorDailyUsage => 'Daily Usage';

  @override
  String get editorUpgradePro => 'Go Pro';

  @override
  String editorRightsCount(Object count) {
    return '/ $count rights';
  }

  @override
  String get editorWatchAdReward => 'Watch an ad to earn +5 rights';

  @override
  String get editorAddPhoto => 'Add Photo';

  @override
  String get editorAddPhotoDesc => 'Choose from gallery or take a photo';

  @override
  String get editorQuickTools => 'Quick Tools';

  @override
  String get editorToolEnhance => 'AI Enhance';

  @override
  String get editorToolBgRemove => 'Remove BG';

  @override
  String get editorToolUpscale => 'Upscale';

  @override
  String get editorToolDeblur => 'Deblur';

  @override
  String get editorToolStyle => 'Style';

  @override
  String get editorToolCompare => 'Compare';

  @override
  String editorRightsUnit(Object count) {
    return '$count rights';
  }

  @override
  String get editorAiSuggestion => 'AI Suggests';

  @override
  String get editorAiSuggestionDesc =>
      'Upscale 2× is recommended for your last photo';

  @override
  String get editorRecentEdits => 'Recent Edits';

  @override
  String get editorViewAll => 'View All';

  @override
  String get editorNewItem => 'New';

  @override
  String get editorLabelAiEnhanced => 'AI Enhanced';

  @override
  String get editorLabelBgRemoved => 'BG Removed';

  @override
  String get editorLabelUpscale => '4× Upscale';

  @override
  String get editorStatEdited => 'Edited';

  @override
  String get editorStatThisWeek => 'This Week';

  @override
  String get editorStatSaved => 'Saved';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return 'Photo selected for $tool: $name';
  }

  @override
  String get galleryTitle => 'Gallery';

  @override
  String galleryEditCount(Object count) {
    return '$count edits';
  }

  @override
  String get gallerySearchHint => 'Search edits...';

  @override
  String get galleryFilterAll => 'All';

  @override
  String get galleryFilterFavorite => 'Favorite';

  @override
  String get galleryFilterEnhanced => 'Enhanced';

  @override
  String get galleryFilterUpscale => 'Upscale';

  @override
  String get galleryFilterBgRemove => 'BG Remove';

  @override
  String get galleryFilterDeblur => 'Deblur';

  @override
  String get galleryDateToday => 'Today';

  @override
  String get galleryDateYesterday => 'Yesterday';

  @override
  String galleryDateDaysAgo(Object count) {
    return '$count days ago';
  }

  @override
  String get galleryEmptyTitle => 'No edits yet';

  @override
  String get galleryEmptySubtitle => 'Edit your first photo!';

  @override
  String get galleryTypeBgRemoved => 'BG Removed';

  @override
  String get galleryTypeFilter => 'Filter';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsProfileGuest => 'Guest User';

  @override
  String get settingsProfileEmail => 'guest@omniacreata.com';

  @override
  String get settingsDailyUsage => 'Daily Usage';

  @override
  String get settingsStatEdits => 'Edits';

  @override
  String get settingsStatThisMonth => 'This Month';

  @override
  String get settingsStatTotalOps => 'Total Ops';

  @override
  String get settingsAppearance => 'Appearance';

  @override
  String get settingsTheme => 'Theme';

  @override
  String get settingsThemeDark => 'Dark';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => 'Light';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsNotifications => 'Notifications';

  @override
  String get settingsEmailSummary => 'Email Summary';

  @override
  String get settingsAccount => 'Account';

  @override
  String get settingsSubscription => 'My Plan';

  @override
  String get settingsSubscriptionDesc => 'Free · Upgrade';

  @override
  String get settingsInviteFriend => 'Invite a Friend';

  @override
  String get settingsInviteReward => 'Earn 50 rights';

  @override
  String get settingsRateApp => 'Rate the App';

  @override
  String get settingsRateDesc => 'Give 5 stars!';

  @override
  String get settingsHelpCenter => 'Help Center';

  @override
  String get settingsHelpDesc => 'FAQ and support';

  @override
  String get settingsPrivacy => 'Privacy Policy';

  @override
  String get settingsTerms => 'Terms of Service';

  @override
  String get settingsVersion => 'Version';

  @override
  String get settingsLogout => 'Log Out';

  @override
  String get settingsDeleteAccount => 'Delete My Account';

  @override
  String get navHome => 'Home';

  @override
  String get navEditor => 'Editor';

  @override
  String get navGallery => 'Gallery';

  @override
  String get navProfile => 'Profile';

  @override
  String get paywallTitle => 'Choose Your Plan';

  @override
  String get paywallSubtitle => 'Find the plan that suits you best';

  @override
  String get paywallFreeName => 'Free';

  @override
  String get paywallFreeDesc => 'Perfect to get started';

  @override
  String get paywallFreeRights => '10 daily usage rights';

  @override
  String get paywallFreeUpscale => '2× AI Upscale';

  @override
  String get paywallFreeFilters => 'Basic filters';

  @override
  String get paywallFreeAdReward => '+5 rights by watching ads';

  @override
  String get paywallFreeBadge => 'OmniaPixels badge';

  @override
  String get paywallFreeBadgeNote => 'Required';

  @override
  String get paywallFreeNoCloud => 'Cloud processing';

  @override
  String get paywallFreeNoUpscale => '4× / 8× Upscale';

  @override
  String get paywallFreeNoFast => 'Fast processing';

  @override
  String get paywallFreeNoBatch => 'Batch processing';

  @override
  String get paywallFreeCta => 'Current Plan';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => 'Most Popular';

  @override
  String get paywallProDesc => 'For creators and professionals';

  @override
  String get paywallProUnlimited => 'Unlimited usage';

  @override
  String get paywallProAllAi => 'All AI modules';

  @override
  String get paywallProUpscale => '4× and 8× Upscale';

  @override
  String get paywallProFast => 'Fast processing';

  @override
  String get paywallProBatch => 'Batch processing (100+ photos)';

  @override
  String get paywallProNoBadge => 'Badge-free export';

  @override
  String get paywallProCloud => 'Cloud sync';

  @override
  String get paywallProStyle => 'Style Transfer AI';

  @override
  String get paywallProNoAds => 'Ad-free experience';

  @override
  String get paywallProCta => 'Go Pro';

  @override
  String get paywallEntName => 'Enterprise';

  @override
  String get paywallEntTag => 'Business';

  @override
  String get paywallEntDesc => 'For teams and companies';

  @override
  String get paywallEntPrice => 'Custom';

  @override
  String get paywallEntCta => 'Contact Us';

  @override
  String get paywallOrBuyRights => 'OR BUY RIGHTS';

  @override
  String get paywallRightsUnit => 'rights';

  @override
  String paywallPerRight(Object price) {
    return '$price/right';
  }

  @override
  String get paywallPopularTag => 'Popular';

  @override
  String get paywallBestValueTag => 'Best Value';

  @override
  String get paywallGuarantee => '7-day money-back guarantee · Cancel anytime';

  @override
  String get paywallMonthly => 'Monthly';

  @override
  String get paywallYearly => 'Yearly';

  @override
  String get paywallYearlySave => 'Save 40%';
}
