import type { CategoryDefinition, LocalizedLabel, PlatformDefinition } from "@prompt-vault/types";

export const brand = {
  name: "OmniaVault",
  parent: "Omnia Creata",
  domain: "omniacreata.com",
  marketingUrl: "https://omniacreata.com",
  productUrl: "https://omniacreata.com/vault",
  appUrl: "https://vault.omniacreata.com",
  repoName: "prompt-vault",
};

export function buildProductUrl(path = "") {
  const normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedPath) {
    return brand.productUrl;
  }

  return `${brand.productUrl}/${normalizedPath}`;
}

export const support = {
  email: "hello@omniacreata.com",
  privacyPath: "/privacy",
  termsPath: "/terms",
};

export const primaryNavigation = [
  { href: "/", key: "home" },
  { href: "/pricing", key: "pricing" },
  { href: "/faq", key: "faq" },
] as const;

export const dashboardNavigation = [
  { href: "/app", key: "dashboard" },
  { href: "/app/library", key: "library" },
  { href: "/app/capture", key: "capture" },
  { href: "/app/projects", key: "projects" },
  { href: "/app/settings", key: "settings" },
] as const;

export interface ReleaseNoteDefinition {
  id: string;
  version: string;
  channel: "beta" | "stable" | "coming_soon";
  publishedAt: string;
  title: LocalizedLabel;
  summary: LocalizedLabel;
  highlights: LocalizedLabel[];
}

export const releaseNotes: ReleaseNoteDefinition[] = [
  {
    id: "0.3.0-beta",
    version: "0.3.0-beta",
    channel: "beta",
    publishedAt: "2026-03-19T12:00:00.000Z",
    title: {
      en: "A calmer app shell, real drafts, and safer version restores",
      tr: "Daha sakin uygulama kabugu, gercek taslaklar ve daha guvenli surum geri yukleme"
    },
    summary: {
      en: `${brand.name} now behaves more like a real app: Home is simpler, drafts autosave locally, and restoring old versions creates safe new snapshots instead of overwriting history.`,
      tr: `${brand.name} artik daha gercek bir uygulama gibi davranir: Ana ekran sadeleşti, taslaklar yerelde otomatik kaydolur ve eski surumu geri almak gecmisi ezmeden yeni bir guvenli snapshot olusturur.`
    },
    highlights: [
      {
        en: "Home now acts as a true app start surface instead of a busy dashboard.",
        tr: "Ana ekran artik kalabalik bir dashboard yerine gercek bir baslangic yuzeyi gibi davranir."
      },
      {
        en: "Capture and editor flows autosave local drafts so unfinished writing is easier to resume.",
        tr: "Capture ve editor akisi yerel taslaklari otomatik kaydeder; boylece yarim kalan yaziya geri donmek kolaylasir."
      },
      {
        en: "Version restore now creates a fresh safe snapshot instead of replacing the old history.",
        tr: "Surum geri yukleme artik eski gecmisi degistirmek yerine yeni bir guvenli snapshot olusturur."
      },
      {
        en: "Android shell, privacy pages, and Play Store prep moved closer to a real beta build.",
        tr: "Android shell, gizlilik sayfalari ve Play Store hazirligi gercek bir beta build'e daha da yaklasti."
      }
    ]
  },
  {
    id: "0.2.0-beta",
    version: "0.2.0-beta",
    channel: "beta",
    publishedAt: "2026-03-18T12:00:00.000Z",
    title: {
      en: "Mobile-first foundation and project-aware capture",
      tr: "Mobil-oncelikli temel ve proje farkindalikli capture"
    },
    summary: {
      en: "The product moved from prompt-only language toward entries, projects, and faster capture for everyday use.",
      tr: "Urun prompt merkezli dilden giriler, projeler ve gundelik hizli capture tarafina kaydi."
    },
    highlights: [
      {
        en: "Home, Library, Capture, Projects, and Settings became the core beta information architecture.",
        tr: "Home, Library, Capture, Projects ve Settings beta bilgi mimarisinin ana omurgasi oldu."
      },
      {
        en: "Collections were folded into projects so the product structure feels simpler and more coherent.",
        tr: "Collections proje mantigina yaklastirildi; boylece urun yapisi daha sade ve daha tutarli hale geldi."
      },
      {
        en: "The app can start in guest mode with local data before cloud sync is enabled.",
        tr: "Uygulama bulut sync acilmadan once misafir modunda yerel veriyle baslayabilir hale geldi."
      }
    ]
  }
] as const;

export const builtinCategories: CategoryDefinition[] = [
  {
    id: "cat-image",
    key: "image",
    label: { en: "Image", tr: "Gorsel" },
    description: {
      en: "Prompts for image generation and visual styling.",
      tr: "Gorsel uretim ve gorsel stil icin istemler.",
    },
    tone: "coral",
    icon: "sparkles",
    isSystem: true,
  },
  {
    id: "cat-video",
    key: "video",
    label: { en: "Video", tr: "Video" },
    description: {
      en: "Video scenes, camera moves, and direction prompts.",
      tr: "Video sahneleri, kamera hareketleri ve yonlendirme istemleri.",
    },
    tone: "blue",
    icon: "film",
    isSystem: true,
  },
  {
    id: "cat-music",
    key: "music",
    label: { en: "Music", tr: "Muzik" },
    description: {
      en: "Lyrics, sonic moods, and composition ideas.",
      tr: "Sarki sozleri, ses dunyalari ve kompozisyon fikirleri.",
    },
    tone: "amber",
    icon: "music",
    isSystem: true,
  },
  {
    id: "cat-chat",
    key: "chat",
    label: { en: "Chat", tr: "Sohbet" },
    description: {
      en: "General-purpose conversational and assistant prompts.",
      tr: "Genel amacli sohbet ve asistan istemleri.",
    },
    tone: "teal",
    icon: "messages",
    isSystem: true,
  },
  {
    id: "cat-coding",
    key: "coding",
    label: { en: "Coding", tr: "Kodlama" },
    description: {
      en: "Developer workflows, debugging prompts, and architecture notes.",
      tr: "Gelistirici akisleri, hata ayiklama istemleri ve mimari notlar.",
    },
    tone: "ink",
    icon: "code",
    isSystem: true,
  },
  {
    id: "cat-marketing",
    key: "marketing",
    label: { en: "Marketing", tr: "Pazarlama" },
    description: {
      en: "Campaign ideas, ad prompts, and brand messaging.",
      tr: "Kampanya fikirleri, reklam istemleri ve marka mesajlari.",
    },
    tone: "coral",
    icon: "megaphone",
    isSystem: true,
  },
  {
    id: "cat-writing",
    key: "writing",
    label: { en: "Writing", tr: "Yazma" },
    description: {
      en: "Articles, scripts, drafts, and writing frameworks.",
      tr: "Makale, senaryo, taslak ve yazma cerceveleri.",
    },
    tone: "sage",
    icon: "pen",
    isSystem: true,
  },
  {
    id: "cat-storytelling",
    key: "storytelling",
    label: { en: "Storytelling", tr: "Hikaye Anlatimi" },
    description: {
      en: "Narrative structures, character arcs, and scene building.",
      tr: "Anlati yapilari, karakter gelisimleri ve sahne kurgusu.",
    },
    tone: "amber",
    icon: "book",
    isSystem: true,
  },
  {
    id: "cat-productivity",
    key: "productivity",
    label: { en: "Productivity", tr: "Verimlilik" },
    description: {
      en: "Daily operating systems, planners, and execution prompts.",
      tr: "Gunluk calisma sistemleri, planlayicilar ve uygulama istemleri.",
    },
    tone: "sage",
    icon: "clock",
    isSystem: true,
  },
  {
    id: "cat-automation",
    key: "automation",
    label: { en: "Automation", tr: "Otomasyon" },
    description: {
      en: "Workflow automations, agents, and repeatable systems.",
      tr: "Is akis otomasyonlari, ajanlar ve tekrar kullanilabilir sistemler.",
    },
    tone: "teal",
    icon: "workflow",
    isSystem: true,
  },
  {
    id: "cat-agent",
    key: "agent_tasks",
    label: { en: "Agent Tasks", tr: "Ajan Gorevleri" },
    description: {
      en: "System instructions and operational agent prompts.",
      tr: "Sistem talimatlari ve operasyonel ajan istemleri.",
    },
    tone: "ink",
    icon: "bot",
    isSystem: true,
  },
  {
    id: "cat-uiux",
    key: "ui_ux",
    label: { en: "UI/UX", tr: "UI/UX" },
    description: {
      en: "Design prompts, UX flows, and interface critiques.",
      tr: "Tasarim istemleri, UX akisleri ve arayuz degerlendirmeleri.",
    },
    tone: "blue",
    icon: "layout",
    isSystem: true,
  },
  {
    id: "cat-research",
    key: "research",
    label: { en: "Research", tr: "Arastirma" },
    description: {
      en: "Exploration prompts, summaries, and analysis structures.",
      tr: "Kesif istemleri, ozetler ve analiz yapilari.",
    },
    tone: "teal",
    icon: "search",
    isSystem: true,
  },
  {
    id: "cat-business",
    key: "business",
    label: { en: "Business", tr: "Is" },
    description: {
      en: "Strategy, operations, sales, and business systems.",
      tr: "Strateji, operasyon, satis ve is sistemleri.",
    },
    tone: "ink",
    icon: "briefcase",
    isSystem: true,
  },
  {
    id: "cat-other",
    key: "other",
    label: { en: "Other", tr: "Diger" },
    description: {
      en: "Anything that does not fit a single clear bucket yet.",
      tr: "Henuz tek bir net kategoriye sigmayan her sey.",
    },
    tone: "sage",
    icon: "folder",
    isSystem: true,
  },
];

export const platformCatalog: PlatformDefinition[] = [
  { id: "platform-chatgpt", key: "chatgpt", label: { en: "ChatGPT", tr: "ChatGPT" }, shortLabel: { en: "GPT", tr: "GPT" } },
  { id: "platform-claude", key: "claude", label: { en: "Claude", tr: "Claude" }, shortLabel: { en: "Claude", tr: "Claude" } },
  { id: "platform-gemini", key: "gemini", label: { en: "Gemini", tr: "Gemini" }, shortLabel: { en: "Gemini", tr: "Gemini" } },
  { id: "platform-midjourney", key: "midjourney", label: { en: "Midjourney", tr: "Midjourney" }, shortLabel: { en: "MJ", tr: "MJ" } },
  { id: "platform-flux", key: "flux", label: { en: "Flux", tr: "Flux" }, shortLabel: { en: "Flux", tr: "Flux" } },
  { id: "platform-runway", key: "runway", label: { en: "Runway", tr: "Runway" }, shortLabel: { en: "Runway", tr: "Runway" } },
  { id: "platform-suno", key: "suno", label: { en: "Suno", tr: "Suno" }, shortLabel: { en: "Suno", tr: "Suno" } },
  { id: "platform-codex", key: "codex", label: { en: "Codex", tr: "Codex" }, shortLabel: { en: "Codex", tr: "Codex" } },
  { id: "platform-cursor", key: "cursor", label: { en: "Cursor", tr: "Cursor" }, shortLabel: { en: "Cursor", tr: "Cursor" } },
  { id: "platform-generic", key: "generic", label: { en: "Generic", tr: "Genel" }, shortLabel: { en: "Generic", tr: "Genel" } },
];

export const pricingTiers = [
  {
    key: "free",
    price: "$0",
    cadence: "/month",
    featured: false,
    limits: {
      prompts: "Up to 150 entries",
      collections: "Up to 8 projects",
      exports: "Local export and beta ads included",
    },
  },
  {
    key: "pro",
    price: "Soon",
    cadence: "/month",
    featured: true,
    limits: {
      prompts: "Higher limits and no ads",
      collections: "More projects and organization tools",
      exports: "AI assist and premium sync land in V1",
    },
  },
  {
    key: "studio",
    price: "Later",
    cadence: "/seat",
    featured: false,
    limits: {
      prompts: "Team workspaces and governance",
      collections: "Shared projects and approvals",
      exports: "Admin controls after the beta cycle",
    },
  },
] as const;
