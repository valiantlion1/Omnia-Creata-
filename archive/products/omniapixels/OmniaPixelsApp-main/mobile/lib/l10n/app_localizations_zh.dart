// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appName => 'OmniaPixels';

  @override
  String get splashTagline => '一键获取专业照片';

  @override
  String get splashLoading => '正在启动AI引擎...';

  @override
  String get splashSubtitle => '由OMNIACREATA提供';

  @override
  String get onboardingSkip => '跳过';

  @override
  String get onboardingContinue => '继续';

  @override
  String get onboardingGetStarted => '开始使用';

  @override
  String onboardingPrivacyNotice(Object policy) {
    return '继续即表示您接受$policy';
  }

  @override
  String get onboardingPrivacyPolicy => '隐私政策';

  @override
  String get onboardingSlide1Tag => 'AI能力';

  @override
  String get onboardingSlide1Title => '电影级别的\nAI增强';

  @override
  String get onboardingSlide1Desc => 'AI分析您的照片并一键生成专业结果。让自拍、产品和风景更完美。';

  @override
  String get onboardingSlide2Tag => '隐私至上';

  @override
  String get onboardingSlide2Title => '安全的\n本地处理';

  @override
  String get onboardingSlide2Desc => '所有处理都在您的设备上进行。您的照片绝不会上传到服务器。';

  @override
  String get onboardingSlide3Tag => '专业功能';

  @override
  String get onboardingSlide3Title => '云端速度，\n旗舰质量';

  @override
  String get onboardingSlide3Desc => '使用Pro，获得4倍和8倍的高级放大，批量编辑以及所有AI功能。';

  @override
  String get loginWelcomeBack => '欢迎回来';

  @override
  String get loginCreateAccount => '创建账号';

  @override
  String get loginRegisterSubtitle => '加入OmniaPixels家族';

  @override
  String get loginTitle => '创建账号';

  @override
  String get loginSubtitle => '加入OmniaPixels家族';

  @override
  String get loginTabSignIn => '登录';

  @override
  String get loginTabSignUp => '注册';

  @override
  String get loginNameLabel => '全名';

  @override
  String get loginNameHint => '请输入您的姓名';

  @override
  String get loginEmailLabel => '邮箱';

  @override
  String get loginEmailHint => 'example@email.com';

  @override
  String get loginPasswordLabel => '密码';

  @override
  String get loginPasswordHint => '至少6个字符';

  @override
  String get loginSignInButton => '登录';

  @override
  String get loginSignUpButton => '注册';

  @override
  String get loginOrDivider => '或';

  @override
  String get loginGoogleButton => '继续使用Google';

  @override
  String get loginAppleButton => '继续使用Apple';

  @override
  String get loginGuestButton => '以访客身份继续';

  @override
  String get loginGuestSubtext => '仅限本地功能';

  @override
  String get loginForgotPassword => '忘记密码？';

  @override
  String get loginTerms => '继续即表示您同意服务条款。';

  @override
  String editorGreeting(Object name) {
    return '你好，$name';
  }

  @override
  String get editorFreeLabel => '免费';

  @override
  String get editorDailyUsage => '每日使用量';

  @override
  String get editorUpgradePro => '升级为Pro';

  @override
  String editorRightsCount(Object count) {
    return '/ $count 次';
  }

  @override
  String get editorWatchAdReward => '观看广告赚取+5次';

  @override
  String get editorAddPhoto => '添加照片';

  @override
  String get editorAddPhotoDesc => '从图库中选择或拍照';

  @override
  String get editorQuickTools => '快捷工具';

  @override
  String get editorToolEnhance => 'AI增强';

  @override
  String get editorToolBgRemove => '移除背景';

  @override
  String get editorToolUpscale => '放大';

  @override
  String get editorToolDeblur => '去模糊';

  @override
  String get editorToolStyle => '风格';

  @override
  String get editorToolCompare => '比较';

  @override
  String editorRightsUnit(Object count) {
    return '$count 次';
  }

  @override
  String get editorAiSuggestion => 'AI建议';

  @override
  String get editorAiSuggestionDesc => '建议对您的最后一张照片进行2倍放大';

  @override
  String get editorRecentEdits => '最近编辑';

  @override
  String get editorViewAll => '查看全部';

  @override
  String get editorNewItem => '新建';

  @override
  String get editorLabelAiEnhanced => 'AI增强';

  @override
  String get editorLabelBgRemoved => '背景移除';

  @override
  String get editorLabelUpscale => '4倍放大';

  @override
  String get editorStatEdited => '已编辑';

  @override
  String get editorStatThisWeek => '本周';

  @override
  String get editorStatSaved => '已保存';

  @override
  String editorPhotoSelected(Object tool, Object name) {
    return '已选择$tool照片: $name';
  }

  @override
  String get galleryTitle => '图库';

  @override
  String galleryEditCount(Object count) {
    return '$count 次编辑';
  }

  @override
  String get gallerySearchHint => '搜索编辑...';

  @override
  String get galleryFilterAll => '全部';

  @override
  String get galleryFilterFavorite => '收藏';

  @override
  String get galleryFilterEnhanced => '已增强';

  @override
  String get galleryFilterUpscale => '放大';

  @override
  String get galleryFilterBgRemove => '背景移除';

  @override
  String get galleryFilterDeblur => '去模糊';

  @override
  String get galleryDateToday => '今天';

  @override
  String get galleryDateYesterday => '昨天';

  @override
  String galleryDateDaysAgo(Object count) {
    return '$count 天前';
  }

  @override
  String get galleryEmptyTitle => '暂无编辑';

  @override
  String get galleryEmptySubtitle => '编辑您的第一张照片！';

  @override
  String get galleryTypeBgRemoved => '背景移除';

  @override
  String get galleryTypeFilter => '过滤器';

  @override
  String get settingsTitle => '设置';

  @override
  String get settingsProfileGuest => '访客';

  @override
  String get settingsProfileEmail => 'guest@omniacreata.com';

  @override
  String get settingsDailyUsage => '每日使用量';

  @override
  String get settingsStatEdits => '编辑';

  @override
  String get settingsStatThisMonth => '本月';

  @override
  String get settingsStatTotalOps => '总次数';

  @override
  String get settingsAppearance => '外观';

  @override
  String get settingsTheme => '主题';

  @override
  String get settingsThemeDark => '深色';

  @override
  String get settingsThemeAmoled => 'AMOLED';

  @override
  String get settingsThemeLight => '浅色';

  @override
  String get settingsLanguage => '语言';

  @override
  String get settingsNotifications => '通知';

  @override
  String get settingsEmailSummary => '邮件摘要';

  @override
  String get settingsAccount => '账户';

  @override
  String get settingsSubscription => '我的计划';

  @override
  String get settingsSubscriptionDesc => '免费 · 升级';

  @override
  String get settingsInviteFriend => '邀请好友';

  @override
  String get settingsInviteReward => '赚取50次';

  @override
  String get settingsRateApp => '评价应用';

  @override
  String get settingsRateDesc => '请给5星！';

  @override
  String get settingsHelpCenter => '帮助中心';

  @override
  String get settingsHelpDesc => '常见问题和支持';

  @override
  String get settingsPrivacy => '隐私政策';

  @override
  String get settingsTerms => '服务条款';

  @override
  String get settingsVersion => '版本';

  @override
  String get settingsLogout => '退出登录';

  @override
  String get settingsDeleteAccount => '删除账户';

  @override
  String get navHome => '首页';

  @override
  String get navEditor => '编辑器';

  @override
  String get navGallery => '图库';

  @override
  String get navProfile => '简介';

  @override
  String get paywallTitle => '选择您的计划';

  @override
  String get paywallSubtitle => '找到最适合您的计划';

  @override
  String get paywallFreeName => '免费';

  @override
  String get paywallFreeDesc => '完美的开始';

  @override
  String get paywallFreeRights => '10次每日使用权';

  @override
  String get paywallFreeUpscale => '2倍 AI 放大';

  @override
  String get paywallFreeFilters => '基本过滤器';

  @override
  String get paywallFreeAdReward => '观看广告+5次';

  @override
  String get paywallFreeBadge => 'OmniaPixels徽章';

  @override
  String get paywallFreeBadgeNote => '必选';

  @override
  String get paywallFreeNoCloud => '云处理';

  @override
  String get paywallFreeNoUpscale => '4倍 / 8倍 放大';

  @override
  String get paywallFreeNoFast => '快速处理';

  @override
  String get paywallFreeNoBatch => '批量处理';

  @override
  String get paywallFreeCta => '当前计划';

  @override
  String get paywallProName => 'Pro';

  @override
  String get paywallProTag => '最流行';

  @override
  String get paywallProDesc => '适合创作者和专业人士';

  @override
  String get paywallProUnlimited => '无限使用';

  @override
  String get paywallProAllAi => '所有 AI 模块';

  @override
  String get paywallProUpscale => '4倍和8倍放大';

  @override
  String get paywallProFast => '快速处理';

  @override
  String get paywallProBatch => '批量处理';

  @override
  String get paywallProNoBadge => '无徽章导出';

  @override
  String get paywallProCloud => '云同步';

  @override
  String get paywallProStyle => '风格转换';

  @override
  String get paywallProNoAds => '无广告体验';

  @override
  String get paywallProCta => '升级为Pro';

  @override
  String get paywallEntName => '企业';

  @override
  String get paywallEntTag => '商业';

  @override
  String get paywallEntDesc => '适合团队';

  @override
  String get paywallEntPrice => '定制';

  @override
  String get paywallEntCta => '联系我们';

  @override
  String get paywallOrBuyRights => '或购买权利';

  @override
  String get paywallRightsUnit => '次';

  @override
  String paywallPerRight(Object price) {
    return '$price/次';
  }

  @override
  String get paywallPopularTag => '流行';

  @override
  String get paywallBestValueTag => '最佳价值';

  @override
  String get paywallGuarantee => '7天退款保证';

  @override
  String get paywallMonthly => '包月';

  @override
  String get paywallYearly => '包年';

  @override
  String get paywallYearlySave => '节省40%';
}
