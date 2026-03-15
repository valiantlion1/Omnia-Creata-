import type { Locale } from "@prompt-vault/types";

export type MessageValue = string | MessageDictionary | string[] | Array<Record<string, string>>;

export interface MessageDictionary {
  [key: string]: MessageValue;
}

const en = {
  common: {
    productName: "Prompt Vault",
    productTagline: "Save, organize, sync, and reuse your best prompts.",
    parentBrand: "Omnia Creata",
    app: "App",
    dashboard: "Dashboard",
    home: "Home",
    library: "Library",
    collections: "Collections",
    favorites: "Favorites",
    recent: "Recent",
    settings: "Settings",
    search: "Search",
    pricing: "Pricing",
    faq: "FAQ",
    features: "Features",
    howItWorks: "How It Works",
    signIn: "Sign in",
    signUp: "Create account",
    launchApp: "Open app",
    getStarted: "Get started",
    viewPricing: "View pricing",
    language: "Language",
    theme: "Theme",
    export: "Export",
    all: "All",
    save: "Save",
    cancel: "Cancel",
    copy: "Copy",
    duplicate: "Duplicate",
    edit: "Edit",
    archive: "Archive",
    favorite: "Favorite",
    prompt: "Prompt",
    idea: "Idea",
    workflow: "Workflow",
    template: "Template",
    offlineReady: "Offline-ready",
    previewMode: "Preview mode",
    authReady: "Auth ready",
    working: "Working...",
    saving: "Saving...",
    somethingWentWrong: "Something went wrong."
  },
  marketing: {
    heroEyebrow: "A serious prompt operating system for AI creators",
    heroTitle: "Your personal AI prompt library, built for real work.",
    heroDescription:
      "Prompt Vault gives teams and solo creators a premium place to save prompts, reusable instructions, and evolving ideas across devices without losing structure.",
    heroPrimaryCta: "Start building your vault",
    heroSecondaryCta: "Explore the product",
    proofTitle: "Built for the way modern AI users actually work",
    proofItems: [
      "Version prompts instead of overwriting them.",
      "Organize by collections, categories, tags, and models.",
      "Search across title, content, tags, and usage context.",
      "Keep a mobile-ready vault that feels like an app."
    ],
    featureTitle: "A structured prompt system, not another notes app",
    workflowTitle: "From scattered chats to a usable system",
    pricingTitle: "Pricing designed for individual creators and growing teams",
    faqTitle: "Questions serious AI users ask before they commit",
    entryEyebrow: "Prompt Vault app",
    entryTitle: "Open the real product workspace, while the main product site lives on Omnia Creata.",
    entryDescription:
      "This app is the working surface for your library, editor, collections, AI assistance, and sync-ready vault flows.",
    entryHighlights: [
      "Real dashboard, library, editor, and settings surfaces.",
      "Auth-first app flow with PWA-ready behavior.",
      "Same Prompt Vault backend, separate from the main Omnia Creata site."
    ],
    entryCards: [
      {
        title: "Working app shell",
        description: "Dashboard, library, editor, collections, settings, and AI assist live here."
      },
      {
        title: "Shared backend",
        description: "Supabase auth, data, sync, and server-side AI routes stay inside the app stack."
      },
      {
        title: "Main site stays separate",
        description: "Product marketing, brand storytelling, and the wider Omnia Creata experience live on omniacreata.com."
      }
    ],
    entryProductLink: "View the product page",
    entryMainSiteLink: "Visit Omnia Creata",
    footerDescription:
      "Prompt Vault on this domain is the real application surface: sign in, open your vault, and continue your work across devices.",
    footerProductLink: "Prompt Vault product page",
    footerMainSiteLink: "Omnia Creata main site"
  },
  auth: {
    signInTitle: "Welcome back to your vault",
    signUpTitle: "Create your Prompt Vault account",
    signInDescription: "Use secure email and password access with Supabase-backed session architecture.",
    signUpDescription: "Start with a free personal vault, then grow into premium automation and sharing later.",
    email: "Email address",
    password: "Password",
    fullName: "Full name",
    rememberMe: "Keep me signed in",
    forgotPassword: "Forgot password?",
    continue: "Continue",
    resetDescription: "Request a secure password reset email for your Prompt Vault account.",
    resetPreviewMessage: "Reset flow is ready for Supabase. Preview mode opened the app instead.",
    previewEnterAppMessage: "Supabase is not configured yet, so preview mode opened the app shell.",
    clientInitError: "Supabase client could not be created.",
    signedInSuccess: "Signed in successfully.",
    checkEmailConfirm: "Check your email to confirm your account.",
    resetEmailSent: "Password reset email sent.",
    fullNamePlaceholder: "Aylin Kaya",
    emailPlaceholder: "name@omniacreata.com",
    passwordPlaceholder: "********",
    previewBanner:
      "Supabase credentials are not configured yet, so auth screens are wired and ready while the app runs in preview mode."
  },
  app: {
    dashboardTitle: "A calm, searchable operating system for your prompts",
    dashboardSubtitle:
      "See what changed recently, what deserves another pass, and what you can reuse immediately.",
    quickActions: "Quick actions",
    createPrompt: "New prompt",
    createCollection: "New collection",
    importPrompts: "Import prompts",
    totalEntries: "Total entries",
    totalCollections: "Collections",
    favoritesCount: "Favorites",
    archivedCount: "Archived",
    recentlyUpdated: "Recently updated",
    topCategories: "By category",
    topPlatforms: "By platform",
    topTags: "Popular tags",
    searchPlaceholder: "Search prompts, notes, tags, or platforms",
    libraryTitle: "Prompt Library",
    librarySubtitle:
      "Use filters and quick actions to manage a prompt system that scales beyond a single device.",
    collectionsTitle: "Collections",
    collectionsSubtitle: "Group prompts by project, client, workflow, or channel.",
    favoritesTitle: "Favorite Prompts",
    favoritesSubtitle: "Keep your most reliable prompts one tap away.",
    recentTitle: "Recent Activity",
    recentSubtitle: "Track updates, versions, and the entries you touched most recently.",
    settingsTitle: "Settings",
    settingsSubtitle: "Control language, appearance, export behavior, and account readiness.",
    editorTitle: "Prompt Composer",
    editorSubtitle: "Capture the body, metadata, variables, and usage notes together.",
    versionHistory: "Version history",
    resultNotes: "Result notes",
    variables: "Variables",
    platforms: "Platforms",
    category: "Category",
    collection: "Collection",
    tags: "Tags",
    status: "Status",
    type: "Type",
    notes: "Notes",
    summary: "Summary",
    body: "Prompt body",
    titleField: "Title",
    filters: "Filters",
    clearFilters: "Clear filters",
    emptyStateTitle: "Your vault is ready for its first serious prompt",
    emptyStateDescription:
      "Create a prompt, add metadata that makes it reusable, and start building a system instead of another scattered archive.",
    offlineDescription:
      "Prompt Vault keeps a resilient local cache for preview and offline-friendly browsing while remaining ready for Supabase sync.",
    exportJson: "Export JSON",
    exportMarkdown: "Export Markdown",
    exportTxt: "Export TXT",
    syncStatusPreview: "Preview storage",
    syncStatusSupabase: "Supabase sync",
    syncLabel: "Sync",
    vaultStatus: "Vault status",
    syncDescriptionPreview:
      "Preview mode keeps your vault locally persistent and ready for secure cloud sync.",
    syncDescriptionSupabase: "Supabase-backed authentication and sync are active across your vault.",
    dashboardSearchActionDescription: "Jump into search-first prompt management.",
    dashboardFavoriteActionDescription: "Keep reliable prompts within one tap.",
    dashboardExportActionDescription: "Export the vault and tune product defaults.",
    activityTitle: "Activity",
    aiAssistantTitle: "AI Organization Assistant",
    aiAssistantDescription:
      "Use server-side AI to improve structure, metadata, and reuse without turning the vault into a chat app.",
    aiServerOnly: "Server only",
    aiWorking: "Working...",
    aiEmptyState:
      "Run an AI action to generate a reviewable suggestion. Nothing changes until you apply it.",
    aiAccept: "Apply suggestion",
    aiReject: "Reject",
    aiDismiss: "Dismiss",
    aiApplied: "Suggestion applied.",
    aiRequestFailed: "AI assistance could not complete this request.",
    aiSuggestTitle: "Suggest title",
    aiSuggestCategory: "Suggest category",
    aiSuggestTags: "Suggest tags",
    aiSuggestPlatforms: "Suggest platform",
    aiSummarize: "Summarize prompt",
    aiImprovePrompt: "Improve prompt",
    aiMakeShorter: "Make shorter",
    aiMakeDetailed: "Make more detailed",
    aiFindSimilar: "Find similar prompts",
    listView: "List view",
    gridView: "Grid view",
    resultsLabel: "results",
    quickCreatePrompt: "Create prompt",
    quickOpenLibrary: "Open library",
    quickOpenCollections: "Open collections",
    quickOpenFavorites: "Open favorites",
    quickOpenSettings: "Open settings",
    installApp: "Install app",
    promptCopied: "Prompt copied to the clipboard.",
    aiVersionCreated: "Created a new prompt version from the AI suggestion.",
    noInternalNotesYet: "No internal notes yet.",
    noResultNotesYet: "No result notes recorded yet.",
    noSummarySupplied: "No summary supplied.",
    defaultLabel: "Default",
    noVariablesDefinedYet: "No variables defined yet.",
    versionHint: "Save changes as a new version instead of overwriting history.",
    noCollection: "No collection",
    typeSystemPrompt: "System prompt",
    typeAgentInstruction: "Agent instruction",
    typeTextBlock: "Reusable text block",
    typeNote: "Note",
    statusDraft: "Draft",
    statusActive: "Active",
    statusReviewed: "Reviewed",
    statusArchived: "Archived",
    rating: "Rating",
    noRating: "No rating",
    tagsHint: "Separate tags with commas.",
    variablesHint: "List variables such as character, style, tone.",
    sourceLabel: "Source label",
    sourceUrl: "Source URL",
    collectionName: "Collection name",
    collectionDescription: "Description",
    itemsLabel: "items",
    allCategories: "All categories",
    allCollections: "All collections",
    allPlatforms: "All platforms",
    aiPossibleDuplicates: "Possible duplicates",
    aiRelatedPrompts: "Related prompts",
    aiNoStrongDuplicates: "No strong duplicates detected.",
    aiNoRelatedPrompts: "No related prompts were found in this library slice.",
    commandCenterTitle: "Vault pulse",
    commandCenterDescription:
      "A quick read on the prompts, collections, and reusable material shaping your current workflow.",
    filterSurfaceTitle: "Search surface",
    filterSurfaceDescription:
      "Filter by content, tags, platform, and collection without breaking your working rhythm.",
    resultsHeading: "Library results",
    editorWorkspaceTitle: "Writing workspace",
    editorWorkspaceDescription:
      "Shape the prompt first, then tighten notes, variables, and targeting until it feels production-ready.",
    editorMetaTitle: "Metadata and targeting",
    editorMetaDescription:
      "Keep prompts reusable across collections, models, and future versions.",
    detailOverviewTitle: "Prompt overview",
    detailOverviewDescription:
      "Reusable metadata, targeting, and source context for this prompt.",
    updatedAt: "Updated",
    source: "Source",
    recentActivityTitle: "Recent movement",
    recentActivityDescription:
      "See the latest edits and saves without leaving the dashboard.",
    notesWorkspaceTitle: "Notes and operating context",
    notesWorkspaceDescription:
      "Capture what worked, what failed, and which variations are worth preserving beside the draft.",
    promptSystemTitle: "Targeting and reusable context",
    promptSystemDescription:
      "Keep tags, platform fit, variables, and source context attached to the prompt while you shape it.",
    collectionsWorkspaceTitle: "Collection studio",
    collectionsWorkspaceDescription:
      "Create project libraries that keep related prompts together without cluttering the main vault.",
    versionHistoryDescription:
      "Every refinement stays visible so you can compare evolution without overwriting the original.",
    variablesDescription:
      "Template placeholders stay close to the prompt so reuse remains fast on every device.",
    tagsDescription: "Tags keep the library searchable across collections, categories, and model targets."
  },
  settings: {
    appearance: "Appearance",
    defaults: "Defaults",
    account: "Account",
    security: "Security",
    backups: "Backups",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    densityComfortable: "Comfortable",
    densityCompact: "Compact",
    languageEnglish: "English",
    languageTurkish: "Turkish",
    live: "Live",
    preview: "Preview",
    density: "Density",
    defaultLibraryView: "Default library view",
    viewList: "List",
    viewGrid: "Grid",
    accountReadySupabase:
      "Supabase auth is configured. This section is ready for profile, billing, and security preferences.",
    accountReadyPreview:
      "Preview mode is active until Supabase credentials are added. The account shell remains ready for secure sessions.",
    resetPreviewData: "Reset preview dataset",
    appearanceDescription: "Tune theme and density without losing the calm contrast needed for long prompt sessions.",
    defaultsDescription: "Set the library behavior you want to land in every time you open Prompt Vault.",
    backupsDescription: "Keep portable exports close by so your library always feels safe and recoverable.",
    accountDescription: "Account readiness stays clear whether you are in preview mode or on live Supabase auth."
  }
} satisfies MessageDictionary;

const tr = {
  common: {
    productName: "Prompt Vault",
    productTagline: "En iyi istemlerini kaydet, duzenle, esitle ve yeniden kullan.",
    parentBrand: "Omnia Creata",
    app: "Uygulama",
    dashboard: "Panel",
    home: "Ana sayfa",
    library: "Kutuphane",
    collections: "Koleksiyonlar",
    favorites: "Favoriler",
    recent: "Son",
    settings: "Ayarlar",
    search: "Ara",
    pricing: "Fiyatlandirma",
    faq: "SSS",
    features: "Ozellikler",
    howItWorks: "Nasil Calisir",
    signIn: "Giris yap",
    signUp: "Hesap olustur",
    launchApp: "Uygulamayi ac",
    getStarted: "Basla",
    viewPricing: "Fiyatlari gor",
    language: "Dil",
    theme: "Tema",
    export: "Disa aktar",
    all: "Tum",
    save: "Kaydet",
    cancel: "Iptal",
    copy: "Kopyala",
    duplicate: "Cogalt",
    edit: "Duzenle",
    archive: "Arsivle",
    favorite: "Favori",
    prompt: "Istem",
    idea: "Fikir",
    workflow: "Akis",
    template: "Sablon",
    offlineReady: "Cevrimdisi hazir",
    previewMode: "Onizleme modu",
    authReady: "Kimlik sistemi hazir",
    working: "Calisiyor...",
    saving: "Kaydediliyor...",
    somethingWentWrong: "Bir seyler ters gitti."
  },
  marketing: {
    heroEyebrow: "AI ureticileri icin ciddi bir istem isletim sistemi",
    heroTitle: "Gercek isler icin tasarlanmis kisisel AI istem kutuphanen.",
    heroDescription:
      "Prompt Vault; istemlerini, tekrar kullanilabilir talimatlarini ve gelisen fikirlerini duzen kaybetmeden cihazlar arasinda yonetmen icin premium bir alan sunar.",
    heroPrimaryCta: "Kasani kurmaya basla",
    heroSecondaryCta: "Urunu incele",
    proofTitle: "Modern AI kullanicilarinin gercek calisma bicimi icin tasarlandi",
    proofItems: [
      "Istemleri ustune yazmak yerine surumle.",
      "Koleksiyonlar, kategoriler, etiketler ve modellerle duzenle.",
      "Baslik, icerik, etiket ve kullanim baglaminda ara.",
      "Uygulama gibi hissettiren mobil hazir bir kasa kullan."
    ],
    featureTitle: "Bir not uygulamasi degil, yapili bir istem sistemi",
    workflowTitle: "Daginik sohbetlerden kullanilabilir bir sisteme",
    pricingTitle: "Bireysel ureticiler ve buyuyen ekipler icin fiyatlandirma",
    faqTitle: "Ciddi AI kullanicilarinin baglanmadan once sordugu sorular",
    entryEyebrow: "Prompt Vault uygulamasi",
    entryTitle: "Ana urun sitesi Omnia Creata'da kalirken, gercek calisma alani buradan acilir.",
    entryDescription:
      "Bu alan kutuphane, editor, koleksiyonlar, AI yardimi ve esitlemeye hazir kasa akislarinin gercek uygulama yuzeyidir.",
    entryHighlights: [
      "Gercek panel, kutuphane, editor ve ayarlar ekranlari burada.",
      "Kimlik odakli app akisiyla PWA-hazir davranis birlikte gelir.",
      "Ayni Prompt Vault backend'i kullanilir; sadece Omnia Creata ana sitesinden ayridir."
    ],
    entryCards: [
      {
        title: "Calisan uygulama kabugu",
        description: "Panel, kutuphane, editor, koleksiyonlar, ayarlar ve AI yardimi burada yasar."
      },
      {
        title: "Ortak backend",
        description: "Supabase auth, veri, esitleme ve server-side AI rotalari uygulama yigininda kalir."
      },
      {
        title: "Ana site ayri kalir",
        description: "Urun tanitimi, marka hikayesi ve daha genis Omnia Creata deneyimi omniacreata.com tarafinda yasar."
      }
    ],
    entryProductLink: "Urun sayfasini gor",
    entryMainSiteLink: "Omnia Creata'yi ziyaret et",
    footerDescription:
      "Bu domaindeki Prompt Vault, gercek uygulama yuzeyidir: giris yap, kasani ac ve cihazlar arasinda calismaya devam et.",
    footerProductLink: "Prompt Vault urun sayfasi",
    footerMainSiteLink: "Omnia Creata ana sitesi"
  },
  auth: {
    signInTitle: "Kasana tekrar hos geldin",
    signUpTitle: "Prompt Vault hesabini olustur",
    signInDescription: "Supabase tabanli oturum mimarisiyle guvenli e-posta ve sifre erisimi kullan.",
    signUpDescription: "Ucretsiz kisisel kasayla basla, sonra premium otomasyon ve paylasima gec.",
    email: "E-posta adresi",
    password: "Sifre",
    fullName: "Tam ad",
    rememberMe: "Oturumum acik kalsin",
    forgotPassword: "Sifremi unuttum",
    continue: "Devam et",
    resetDescription: "Prompt Vault hesabin icin guvenli sifre sifirlama e-postasi iste.",
    resetPreviewMessage: "Sifre sifirlama akisi Supabase icin hazir. Onizleme modu uygulamayi acti.",
    previewEnterAppMessage:
      "Supabase henuz yapilandirilmadi, bu nedenle onizleme modu uygulama kabugunu acti.",
    clientInitError: "Supabase istemcisi olusturulamadi.",
    signedInSuccess: "Giris basarili.",
    checkEmailConfirm: "Hesabini dogrulamak icin e-postani kontrol et.",
    resetEmailSent: "Sifre sifirlama e-postasi gonderildi.",
    fullNamePlaceholder: "Aylin Kaya",
    emailPlaceholder: "name@omniacreata.com",
    passwordPlaceholder: "********",
    previewBanner:
      "Supabase bilgileri henuz ayarlanmadigi icin kimlik ekranlari hazir; uygulama su anda onizleme modunda calisiyor."
  },
  app: {
    dashboardTitle: "Istemlerin icin sakin ve aranabilir bir isletim sistemi",
    dashboardSubtitle:
      "Son degisiklikleri, tekrar bakilmasi gerekenleri ve hemen yeniden kullanabileceklerini gor.",
    quickActions: "Hizli islemler",
    createPrompt: "Yeni istem",
    createCollection: "Yeni koleksiyon",
    importPrompts: "Istemleri ice aktar",
    totalEntries: "Toplam kayit",
    totalCollections: "Koleksiyon",
    favoritesCount: "Favori",
    archivedCount: "Arsiv",
    recentlyUpdated: "Son guncellenenler",
    topCategories: "Kategoriye gore",
    topPlatforms: "Platforma gore",
    topTags: "Populer etiketler",
    searchPlaceholder: "Istemlerde, notlarda, etiketlerde veya platformlarda ara",
    libraryTitle: "Istem Kutuphanesi",
    librarySubtitle:
      "Tek bir cihazin otesine gecen bir istem sistemi yonetmek icin filtreleri ve hizli islemleri kullan.",
    collectionsTitle: "Koleksiyonlar",
    collectionsSubtitle: "Istemlerini proje, musteri, is akisi veya kanala gore grupla.",
    favoritesTitle: "Favori Istemler",
    favoritesSubtitle: "En guvenilir istemlerini tek dokunus uzaginda tut.",
    recentTitle: "Son Hareketler",
    recentSubtitle: "Guncellemeleri, surumleri ve en son dokundugun kayitlari takip et.",
    settingsTitle: "Ayarlar",
    settingsSubtitle: "Dil, gorunum, disa aktarma davranisi ve hesap hazirligini kontrol et.",
    editorTitle: "Istem Bestecisi",
    editorSubtitle: "Govdeyi, metaveriyi, degiskenleri ve kullanim notlarini birlikte yakala.",
    versionHistory: "Surum gecmisi",
    resultNotes: "Sonuc notlari",
    variables: "Degiskenler",
    platforms: "Platformlar",
    category: "Kategori",
    collection: "Koleksiyon",
    tags: "Etiketler",
    status: "Durum",
    type: "Tip",
    notes: "Notlar",
    summary: "Ozet",
    body: "Istem govdesi",
    titleField: "Baslik",
    filters: "Filtreler",
    clearFilters: "Filtreleri temizle",
    emptyStateTitle: "Kasan ilk ciddi istemi icin hazir",
    emptyStateDescription:
      "Bir istem olustur, onu tekrar kullanilabilir yapan metaveriyi ekle ve daginik bir arsiv yerine bir sistem kur.",
    offlineDescription:
      "Prompt Vault, Supabase esitlemesine hazir kalirken onizleme ve cevrimdisi gezinme icin dayanikli bir yerel onbellek tutar.",
    exportJson: "JSON disa aktar",
    exportMarkdown: "Markdown disa aktar",
    exportTxt: "TXT disa aktar",
    syncStatusPreview: "Onizleme depolamasi",
    syncStatusSupabase: "Supabase esitlemesi",
    syncLabel: "Esitleme",
    vaultStatus: "Kasa durumu",
    syncDescriptionPreview:
      "Onizleme modu, kasani yerelde kalici tutar ve guvenli bulut esitlemesine hazirlar.",
    syncDescriptionSupabase:
      "Supabase tabanli kimlik dogrulama ve esitleme kasanin genelinde aktiftir.",
    dashboardSearchActionDescription: "Arama odakli istem yonetimine hizlica gec.",
    dashboardFavoriteActionDescription: "Guvenilir istemlerini tek dokunus uzakliginda tut.",
    dashboardExportActionDescription: "Kasani disa aktar ve urun varsayilanlarini ayarla.",
    activityTitle: "Aktivite",
    aiAssistantTitle: "AI Duzenleme Asistani",
    aiAssistantDescription:
      "Kasayi sohbet uygulamasina cevirmeden yapilandirma, etiketleme ve iyilestirme icin sunucu tarafli AI kullan.",
    aiServerOnly: "Sadece sunucu",
    aiWorking: "Calisiyor...",
    aiEmptyState:
      "Incelenebilir bir oneri olusturmak icin bir AI islemi calistir. Uygulayana kadar hicbir sey degismez.",
    aiAccept: "Oneriyi uygula",
    aiReject: "Reddet",
    aiDismiss: "Kapat",
    aiApplied: "Oneri uygulandi.",
    aiRequestFailed: "AI yardimi bu istegi tamamlayamadi.",
    aiSuggestTitle: "Baslik oner",
    aiSuggestCategory: "Kategori oner",
    aiSuggestTags: "Etiket oner",
    aiSuggestPlatforms: "Platform oner",
    aiSummarize: "Istemi ozetle",
    aiImprovePrompt: "Istemi iyilestir",
    aiMakeShorter: "Kisalt",
    aiMakeDetailed: "Detaylandir",
    aiFindSimilar: "Benzer istemleri bul",
    listView: "Liste gorunumu",
    gridView: "Kart gorunumu",
    resultsLabel: "sonuc",
    quickCreatePrompt: "Istem olustur",
    quickOpenLibrary: "Kutuphaneyi ac",
    quickOpenCollections: "Koleksiyonlari ac",
    quickOpenFavorites: "Favorileri ac",
    quickOpenSettings: "Ayarlari ac",
    installApp: "Uygulamayi yukle",
    promptCopied: "Istem panoya kopyalandi.",
    aiVersionCreated: "AI onerisiyle yeni bir istem surumu olusturuldu.",
    noInternalNotesYet: "Henuz ic not yok.",
    noResultNotesYet: "Henuz sonuc notu kaydedilmedi.",
    noSummarySupplied: "Ozet eklenmedi.",
    defaultLabel: "Varsayilan",
    noVariablesDefinedYet: "Henuz degisken tanimlanmadi.",
    versionHint: "Gecmisi ezmek yerine degisiklikleri yeni surum olarak kaydet.",
    noCollection: "Koleksiyon yok",
    typeSystemPrompt: "Sistem istemi",
    typeAgentInstruction: "Ajan talimati",
    typeTextBlock: "Yeniden kullanilabilir metin blogu",
    typeNote: "Not",
    statusDraft: "Taslak",
    statusActive: "Aktif",
    statusReviewed: "Gozden gecirildi",
    statusArchived: "Arsivlendi",
    rating: "Puan",
    noRating: "Puan yok",
    tagsHint: "Etiketleri virgul ile ayir.",
    variablesHint: "character, style, tone gibi degiskenleri listele.",
    sourceLabel: "Kaynak etiketi",
    sourceUrl: "Kaynak URL",
    collectionName: "Koleksiyon adi",
    collectionDescription: "Aciklama",
    itemsLabel: "oge",
    allCategories: "Tum kategoriler",
    allCollections: "Tum koleksiyonlar",
    allPlatforms: "Tum platformlar",
    aiPossibleDuplicates: "Olasi tekrarlar",
    aiRelatedPrompts: "Ilgili istemler",
    aiNoStrongDuplicates: "Guclu bir tekrar benzerligi bulunamadi.",
    aiNoRelatedPrompts: "Bu kutuphane diliminde ilgili istem bulunamadi.",
    commandCenterTitle: "Kasa nabzi",
    commandCenterDescription:
      "Mevcut calisma ritmini sekillendiren istemleri, koleksiyonlari ve tekrar kullanilabilir materyali hizlica gor.",
    filterSurfaceTitle: "Arama yuzeyi",
    filterSurfaceDescription:
      "Calisma ritmini bozmadan icerik, etiket, platform ve koleksiyona gore filtrele.",
    resultsHeading: "Kutuphane sonuclari",
    editorWorkspaceTitle: "Yazma alani",
    editorWorkspaceDescription:
      "Once istemi sekillendir, sonra notlari, degiskenleri ve hedeflemeyi uretim hazir seviyeye getir.",
    editorMetaTitle: "Metaveri ve hedefleme",
    editorMetaDescription:
      "Istemleri koleksiyonlar, modeller ve gelecekteki surumler boyunca yeniden kullanilabilir tut.",
    detailOverviewTitle: "Istem genel gorunumu",
    detailOverviewDescription:
      "Bu isteme ait yeniden kullanilabilir metaveri, hedefleme ve kaynak baglami.",
    updatedAt: "Guncellendi",
    source: "Kaynak",
    recentActivityTitle: "Son hareket",
    recentActivityDescription:
      "Panelden ayrilmadan son duzenlemeleri ve kayitlari gor.",
    notesWorkspaceTitle: "Notlar ve calisma baglami",
    notesWorkspaceDescription:
      "Neyin ise yaradigini, neyin zayif kaldigini ve hangi varyasyonlarin korunmaya deger oldugunu taslagin yaninda tut.",
    promptSystemTitle: "Hedefleme ve yeniden kullanilabilir baglam",
    promptSystemDescription:
      "Etiketleri, platform uyumunu, degiskenleri ve kaynak baglamini istemi sekillendirirken birlikte tut.",
    collectionsWorkspaceTitle: "Koleksiyon studyosu",
    collectionsWorkspaceDescription:
      "Ana kasayi karmastirmadan ilgili istemleri proje kutuphanelerinde bir araya getir.",
    versionHistoryDescription:
      "Her iyilestirme gorunur kalir; boylece orijinali ezmeden gelisimi karsilastirabilirsin.",
    variablesDescription:
      "Sablon degiskenleri isteme yakin kalir, boylece her cihazda yeniden kullanim hizli olur.",
    tagsDescription: "Etiketler kutuphaneyi koleksiyonlar, kategoriler ve model hedefleri arasinda aranabilir tutar."
  },
  settings: {
    appearance: "Gorunum",
    defaults: "Varsayilanlar",
    account: "Hesap",
    security: "Guvenlik",
    backups: "Yedekler",
    themeSystem: "Sistem",
    themeLight: "Acik",
    themeDark: "Koyu",
    densityComfortable: "Rahat",
    densityCompact: "Kompakt",
    languageEnglish: "English",
    languageTurkish: "Turkce",
    live: "Canli",
    preview: "Onizleme",
    density: "Yogunluk",
    defaultLibraryView: "Varsayilan kutuphane gorunumu",
    viewList: "Liste",
    viewGrid: "Kart",
    accountReadySupabase:
      "Supabase kimlik dogrulamasi etkin. Bu bolum profil, odeme ve guvenlik tercihleri icin hazir.",
    accountReadyPreview:
      "Supabase bilgileri eklenene kadar onizleme modu etkin. Hesap alani guvenli oturumlar icin hazir.",
    resetPreviewData: "Onizleme verisini sifirla",
    appearanceDescription: "Uzun istem oturumlari icin gerekli sakin kontrasti korurken tema ve yogunlugu ayarla.",
    defaultsDescription: "Prompt Vault acildiginda seni her seferinde karsilayacak kutuphane davranisini belirle.",
    backupsDescription: "Kutuphane her zaman guvende ve geri alinabilir hissettirsin diye tasinabilir disa aktarmalari yakin tut.",
    accountDescription:
      "Onizleme modunda olsan da canli Supabase kimliginde olsan da hesap hazirligi net gorunur kalsin."
  }
} satisfies MessageDictionary;

export const messages = { en, tr } as const;

function getValue(dictionary: MessageDictionary, path: string): MessageValue | undefined {
  return path.split(".").reduce<MessageValue | undefined>((current, segment) => {
    if (!current || typeof current === "string" || Array.isArray(current)) {
      return undefined;
    }

    return current[segment];
  }, dictionary);
}

export function getMessages(locale: Locale): MessageDictionary {
  return messages[locale] ?? messages.en;
}

export function translate(locale: Locale, path: string): string {
  const value = getValue(getMessages(locale), path) ?? getValue(messages.en, path);
  return typeof value === "string" ? value : path;
}
