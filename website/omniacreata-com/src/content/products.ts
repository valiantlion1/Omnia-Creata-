import type { LocaleCode } from "@/i18n/config";
import type { PlatformKey, PlatformStatus } from "./platforms";

export type ProductSlug =
  | "omnia-creata-studio"
  | "omniapixels"
  | "omniaorganizer"
  | "prompt-vault"
  | "omnia-watch";

export type AccessLink = {
  platform: PlatformKey;
  status: PlatformStatus;
  href?: string;
  label?: string;
  note: string;
};

export type HubSection = {
  id: "overview" | "access" | "capabilities" | "ecosystem-role";
  title: string;
  description: string;
};

export type ProductRecord = {
  slug: ProductSlug;
  name: string;
  shortDescription: string;
  summary: string;
  status: PlatformStatus;
  badge: string;
  headline: string;
  subheadline: string;
  roleTitle: string;
  roleDescription: string;
  platformMatrix: AccessLink[];
  primaryCTA: {
    href: string;
    label: string;
  };
  accessLinks: AccessLink[];
  hubNav: HubSection[];
  surfaceType: PlatformKey[];
  capabilityHighlights: Array<{
    title: string;
    description: string;
  }>;
  ecosystemPoints: Array<{
    title: string;
    description: string;
  }>;
  companionSlugs: ProductSlug[];
};

export const products: ProductRecord[] = [
  {
    slug: "omnia-creata-studio",
    name: "OmniaCreata Studio",
    shortDescription:
      "The flagship workspace for planning, review, and release across Omnia Creata.",
    summary:
      "Studio is the main workspace of Omnia Creata, bringing planning, review, and release into one focused product surface.",
    status: "live",
    badge: "Flagship hub",
    headline: "The flagship product hub for Omnia Creata.",
    subheadline:
      "Open the ecosystem from the product that orchestrates everything else.",
    roleTitle: "Studio anchors the ecosystem.",
    roleDescription:
      "It is the environment where prompt systems, visual work, planning signals, and monitoring context become actionable. The public site should make Studio feel like the natural entry point into the platform.",
    primaryCTA: {
      href: "/products/omnia-creata-studio#access",
      label: "Open Studio",
    },
    surfaceType: ["web", "pwa", "desktop"],
    platformMatrix: [
      {
        platform: "web",
        status: "live",
        href: "/products/omnia-creata-studio#access",
        label: "Open web app",
        note: "Primary access surface for orchestration and deep workflow management.",
      },
      {
        platform: "pwa",
        status: "live",
        href: "/products/omnia-creata-studio#access",
        label: "Install PWA",
        note: "Installable browser experience for fast re-entry and persistent workflow access.",
      },
      {
        platform: "desktop",
        status: "preview",
        href: "/products/omnia-creata-studio#access",
        label: "Open desktop access",
        note: "Focused environment for longer production sessions and dense review work.",
      },
      {
        platform: "ios",
        status: "preview",
        href: "/products/omnia-creata-studio#access",
        label: "View iOS access",
        note: "Mobile companion access for approvals, quick reviews, and light control actions.",
      },
      {
        platform: "android",
        status: "preview",
        href: "/products/omnia-creata-studio#access",
        label: "View Android access",
        note: "Android companion surface for portable ecosystem visibility and action.",
      },
    ],
    accessLinks: [],
    hubNav: [
      {
        id: "overview",
        title: "Product overview",
        description: "Why Studio exists and how it anchors the Omnia Creata system.",
      },
      {
        id: "access",
        title: "Platform access",
        description: "Web, PWA, desktop, and companion mobile access points.",
      },
      {
        id: "capabilities",
        title: "Capability highlights",
        description: "The major surfaces that make Studio the central hub.",
      },
      {
        id: "ecosystem-role",
        title: "Ecosystem role",
        description: "How Studio connects to the rest of the product family.",
      },
    ],
    capabilityHighlights: [
      {
        title: "Command-center workspace",
        description:
          "Bring briefs, prompts, asset flow, review checkpoints, and direction into one cohesive workspace.",
      },
      {
        title: "Cross-product orchestration",
        description:
          "Operate Prompt Vault, OmniaPixels, OmniaOrganizer, and Omnia Watch through a single strategic environment.",
      },
      {
        title: "Premium review and release flow",
        description:
          "Move from direction to approval with stronger interface hierarchy, calmer density, and better decision visibility.",
      },
      {
        title: "Access-first hub design",
        description:
          "The Studio public page acts as an entry hub with platform signals, access actions, and product role clarity.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Receives prompt structure from Prompt Vault",
        description:
          "Prompt systems arrive with context, lineage, and reusable patterns rather than disconnected fragments.",
      },
      {
        title: "Coordinates visual work from OmniaPixels",
        description:
          "Asset creation and refinement remain attached to the same strategic view used for production decisions.",
      },
      {
        title: "Stays operationally aligned with Organizer and Watch",
        description:
          "Delivery pacing, launch status, and ecosystem intelligence stay visible in the same command surface.",
      },
    ],
    companionSlugs: [
      "omniapixels",
      "omniaorganizer",
      "prompt-vault",
      "omnia-watch",
    ],
  },
  {
    slug: "omniapixels",
    name: "OmniaPixels",
    shortDescription:
      "Visual creation and refinement for images, assets, and polished delivery.",
    summary:
      "OmniaPixels handles visual creation and refinement with direct routes for web, desktop, and future mobile access.",
    status: "live",
    badge: "Visual pipeline",
    headline: "Visual creation and refinement with a premium software posture.",
    subheadline:
      "OmniaPixels should read as a serious visual product with clear workflow value.",
    roleTitle: "OmniaPixels is the visual execution layer.",
    roleDescription:
      "It transforms direction into images, series outputs, and refined assets while staying connected to Studio, Prompt Vault, and the wider platform.",
    primaryCTA: {
      href: "/products/omniapixels#access",
      label: "Open OmniaPixels",
    },
    surfaceType: ["web", "desktop", "pwa"],
    platformMatrix: [
      {
        platform: "web",
        status: "live",
        href: "/products/omniapixels#access",
        label: "Open web app",
        note: "Browser-based generation and asset refinement workspace.",
      },
      {
        platform: "desktop",
        status: "live",
        href: "/products/omniapixels#access",
        label: "Open desktop app",
        note: "High-focus visual workspace for longer sessions and heavier processing.",
      },
      {
        platform: "pwa",
        status: "preview",
        href: "/products/omniapixels#access",
        label: "Install PWA",
        note: "Quick install path for repeat access and lightweight workflow continuation.",
      },
      {
        platform: "ios",
        status: "preview",
        href: "/products/omniapixels#access",
        label: "View iOS access",
        note: "Mobile-facing preview surface for review, selection, and quick asset handling.",
      },
      {
        platform: "android",
        status: "preview",
        href: "/products/omniapixels#access",
        label: "View Android access",
        note: "Android-facing preview surface for portable visual workflow continuity.",
      },
    ],
    accessLinks: [],
    hubNav: [
      { id: "overview", title: "Product overview", description: "What OmniaPixels is and why it exists." },
      { id: "access", title: "Platform access", description: "Where OmniaPixels lives across web, desktop, and mobile." },
      { id: "capabilities", title: "Capability highlights", description: "The key visual workflow capabilities." },
      { id: "ecosystem-role", title: "Ecosystem role", description: "How OmniaPixels connects to the rest of Omnia Creata." },
    ],
    capabilityHighlights: [
      {
        title: "Image generation with clearer direction",
        description:
          "OmniaPixels turns structured direction into faster visual output without reading like a disposable novelty tool.",
      },
      {
        title: "Refinement and enhancement",
        description:
          "Prepare assets for release with upscale, cleanup, style consistency, and finishing workflows.",
      },
      {
        title: "Series consistency",
        description:
          "Maintain alignment across sets, campaigns, and iterative asset families instead of isolated one-off generations.",
      },
      {
        title: "Studio-connected delivery",
        description:
          "Move approved outputs back into the flagship flow for review, launch, and platform-wide usage.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Consumes prompt intelligence from Prompt Vault",
        description:
          "Structured prompt families improve repeatability, clarity, and quality in visual work.",
      },
      {
        title: "Feeds final imagery into Studio",
        description:
          "Visual decisions remain attached to the same product surface used for broader direction.",
      },
      {
        title: "Works with Watch for output quality visibility",
        description:
          "Visual throughput and quality can be tracked as part of the wider ecosystem rather than in isolation.",
      },
    ],
    companionSlugs: ["omnia-creata-studio", "prompt-vault", "omnia-watch"],
  },
  {
    slug: "omniaorganizer",
    name: "OmniaOrganizer",
    shortDescription:
      "Planning, priorities, and operational flow for the Omnia Creata ecosystem.",
    summary:
      "OmniaOrganizer keeps projects, timing, and execution aligned so product work stays visible and moving.",
    status: "live",
    badge: "Operational layer",
    headline: "Operational control for a connected ecosystem.",
    subheadline:
      "Planning, timing, and execution should feel as premium as the creation layer itself.",
    roleTitle: "OmniaOrganizer keeps the ecosystem moving.",
    roleDescription:
      "It connects initiatives, ownership, checkpoints, and launch pacing to the software surfaces where the work actually happens.",
    primaryCTA: {
      href: "/products/omniaorganizer#access",
      label: "Open OmniaOrganizer",
    },
    surfaceType: ["web", "pwa", "ios", "android"],
    platformMatrix: [
      {
        platform: "web",
        status: "live",
        href: "/products/omniaorganizer#access",
        label: "Open web app",
        note: "Primary planning and visibility surface for ecosystem operations.",
      },
      {
        platform: "pwa",
        status: "live",
        href: "/products/omniaorganizer#access",
        label: "Install PWA",
        note: "Installable access for recurring workflow reviews and lightweight execution.",
      },
      {
        platform: "ios",
        status: "live",
        href: "/products/omniaorganizer#access",
        label: "View iOS access",
        note: "Mobile access for task visibility, approvals, and execution context on the move.",
      },
      {
        platform: "android",
        status: "live",
        href: "/products/omniaorganizer#access",
        label: "View Android access",
        note: "Android surface for active execution, updates, and day-to-day operational access.",
      },
      {
        platform: "desktop",
        status: "planned",
        href: "/products/omniaorganizer#access",
        label: "View desktop access",
        note: "Optional higher-density surface for deeper operational command use cases.",
      },
    ],
    accessLinks: [],
    hubNav: [
      { id: "overview", title: "Product overview", description: "What OmniaOrganizer solves inside the ecosystem." },
      { id: "access", title: "Platform access", description: "Where the organizer lives across web, PWA, and mobile." },
      { id: "capabilities", title: "Capability highlights", description: "The operational surfaces and control mechanisms." },
      { id: "ecosystem-role", title: "Ecosystem role", description: "How OmniaOrganizer connects with the other flagship products." },
    ],
    capabilityHighlights: [
      {
        title: "Calm operational visibility",
        description:
          "See what is moving, blocked, approved, or waiting without turning the interface into noisy project-management clutter.",
      },
      {
        title: "Product-aware planning",
        description:
          "Track real initiatives tied to Studio, Pixels, Prompt Vault, and Watch instead of generic isolated task lists.",
      },
      {
        title: "Mobile-first execution support",
        description:
          "Organizer should feel credible on smaller surfaces where status, updates, and approvals matter most.",
      },
      {
        title: "Rollout readiness",
        description:
          "Connect planning logic to platform launches, product readiness, and public website storytelling.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Provides execution structure for Studio",
        description:
          "Creative strategy remains connected to timing, ownership, and actual delivery rhythm.",
      },
      {
        title: "Turns product work into visible progress",
        description:
          "Prompt and visual flows become easier to manage when they connect to structured operational context.",
      },
      {
        title: "Helps Watch understand meaningful status",
        description:
          "Monitoring becomes more useful when it can reference planned work and active execution states.",
      },
    ],
    companionSlugs: ["omnia-creata-studio", "prompt-vault", "omnia-watch"],
  },
  {
    slug: "prompt-vault",
    name: "Prompt Vault",
    shortDescription:
      "Structured prompt storage, reuse, and prompt-system memory.",
    summary:
      "Prompt Vault keeps prompt knowledge structured, searchable, and ready to move across Omnia Creata.",
    status: "live",
    badge: "Prompt infrastructure",
    headline: "A product hub for reusable prompt intelligence.",
    subheadline:
      "Prompt systems become durable software infrastructure when they are organized, versioned, and connected.",
    roleTitle: "Prompt Vault is the memory layer of the ecosystem.",
    roleDescription:
      "It organizes prompt logic, iteration history, and reusable structures so every other product can operate with better context and quality.",
    primaryCTA: {
      href: "/products/prompt-vault#access",
      label: "Open Prompt Vault",
    },
    surfaceType: ["web", "pwa", "ios", "android"],
    platformMatrix: [
      {
        platform: "web",
        status: "live",
        href: "/products/prompt-vault#access",
        label: "Open web app",
        note: "Primary surface for prompt libraries, organization, and reuse across the ecosystem.",
      },
      {
        platform: "pwa",
        status: "live",
        href: "/products/prompt-vault#access",
        label: "Install PWA",
        note: "Fast re-entry for prompt lookup, lightweight editing, and shared recall.",
      },
      {
        platform: "ios",
        status: "preview",
        href: "/products/prompt-vault#access",
        label: "View iOS access",
        note: "Portable prompt retrieval and capture for mobile-first idea flow.",
      },
      {
        platform: "android",
        status: "preview",
        href: "/products/prompt-vault#access",
        label: "View Android access",
        note: "Android access for prompt lookup, capture, and on-the-go system reference.",
      },
      {
        platform: "desktop",
        status: "planned",
        href: "/products/prompt-vault#access",
        label: "View desktop access",
        note: "Optional deeper workspace for prompt-heavy teams and long-form prompt operations.",
      },
    ],
    accessLinks: [],
    hubNav: [
      { id: "overview", title: "Product overview", description: "Why Prompt Vault exists and what it replaces." },
      { id: "access", title: "Platform access", description: "How Prompt Vault should be accessed across the product family." },
      { id: "capabilities", title: "Capability highlights", description: "The features that make Prompt Vault a serious product." },
      { id: "ecosystem-role", title: "Ecosystem role", description: "How Prompt Vault improves the rest of the platform." },
    ],
    capabilityHighlights: [
      {
        title: "Structured prompt libraries",
        description:
          "Organize prompts as reusable systems with context, categorization, and durable recall.",
      },
      {
        title: "Version-aware prompt evolution",
        description:
          "Keep track of what changed, why it changed, and which prompt systems worked best.",
      },
      {
        title: "Portable knowledge layer",
        description:
          "Prompt logic can move cleanly into Studio, OmniaPixels, and future products without losing context.",
      },
      {
        title: "Serious product framing",
        description:
          "Prompt Vault should read as software infrastructure for teams, not as a collection of random prompts.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Feeds Studio with structured intelligence",
        description:
          "Prompt logic becomes a visible strategic asset instead of a hidden personal shortcut.",
      },
      {
        title: "Improves OmniaPixels quality and repeatability",
        description:
          "Visual generation benefits from reusable prompt families and clear experimentation history.",
      },
      {
        title: "Helps Watch observe quality drift",
        description:
          "Prompt changes can be related to output shifts and platform-level quality signals over time.",
      },
    ],
    companionSlugs: ["omnia-creata-studio", "omniapixels", "omnia-watch"],
  },
  {
    slug: "omnia-watch",
    name: "Omnia Watch",
    shortDescription:
      "Monitoring for product health, quality, and ecosystem awareness.",
    summary:
      "Omnia Watch helps teams stay aware of quality, performance, and product signals across the ecosystem.",
    status: "live",
    badge: "Intelligence layer",
    headline: "Ecosystem monitoring with calmer, higher-value signals.",
    subheadline:
      "System awareness should feel like product intelligence, not dashboard noise.",
    roleTitle: "Omnia Watch is the ecosystem awareness layer.",
    roleDescription:
      "It tracks health, quality, drift, and operational signals across the Omnia Creata product family so issues surface with context.",
    primaryCTA: {
      href: "/products/omnia-watch#access",
      label: "Open Omnia Watch",
    },
    surfaceType: ["web", "desktop", "ios", "android"],
    platformMatrix: [
      {
        platform: "web",
        status: "live",
        href: "/products/omnia-watch#access",
        label: "Open web app",
        note: "Main monitoring and oversight surface for ecosystem-wide health and quality visibility.",
      },
      {
        platform: "desktop",
        status: "preview",
        href: "/products/omnia-watch#access",
        label: "Open desktop access",
        note: "Higher-density visibility surface for operational teams and longer monitoring sessions.",
      },
      {
        platform: "ios",
        status: "live",
        href: "/products/omnia-watch#access",
        label: "View iOS access",
        note: "Fast awareness and mobile signal review for active product teams.",
      },
      {
        platform: "android",
        status: "live",
        href: "/products/omnia-watch#access",
        label: "View Android access",
        note: "Portable signal review and issue awareness for Android-focused access.",
      },
      {
        platform: "pwa",
        status: "preview",
        href: "/products/omnia-watch#access",
        label: "Install PWA",
        note: "Lightweight install path for quick, persistent monitoring access.",
      },
    ],
    accessLinks: [],
    hubNav: [
      { id: "overview", title: "Product overview", description: "What Omnia Watch monitors across the platform." },
      { id: "access", title: "Platform access", description: "Where Watch can be accessed for awareness and action." },
      { id: "capabilities", title: "Capability highlights", description: "The signal and intelligence surfaces that matter." },
      { id: "ecosystem-role", title: "Ecosystem role", description: "How Watch closes the loop across the wider ecosystem." },
    ],
    capabilityHighlights: [
      {
        title: "Signal-rich product awareness",
        description:
          "Stay aware of health, product quality, and operational state without collapsing into raw telemetry overload.",
      },
      {
        title: "Drift and quality visibility",
        description:
          "Surface slow ecosystem shifts before they become expensive, visible failures.",
      },
      {
        title: "Cross-product intelligence",
        description:
          "Understand how prompt logic, visual systems, workflow pacing, and product usage affect one another.",
      },
      {
        title: "Action-oriented monitoring",
        description:
          "Watch should lead to decisions and follow-up, not just dashboard browsing.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Informs Studio decisions",
        description:
          "Leadership and product owners can see whether work is healthy, blocked, drifting, or ready to move.",
      },
      {
        title: "Supports Organizer execution awareness",
        description:
          "Operational teams can compare planned motion against real ecosystem signals.",
      },
      {
        title: "Improves Prompt Vault and OmniaPixels feedback loops",
        description:
          "Upstream product inputs gain better quality feedback when connected to monitored outcomes.",
      },
    ],
    companionSlugs: ["omnia-creata-studio", "omniaorganizer", "prompt-vault"],
  },
];

const turkishHubNav: Record<HubSection["id"], { title: string; description: string }> = {
  overview: {
    title: "Urun genel bakis",
    description: "Urunun amaci, konumu ve public yuzdeki rolu.",
  },
  access: {
    title: "Platform erisimi",
    description: "Web, mobil, PWA ve desktop erisim noktalarinin dagilimi.",
  },
  capabilities: {
    title: "Kabiliyetler",
    description: "Urunu farkli kilan temel yazilim kabiliyetleri.",
  },
  "ecosystem-role": {
    title: "Ekosistem rolu",
    description: "Diger Omnia Creata urunleriyle stratejik baglanti.",
  },
};

const turkishProductCopy: Record<
  ProductSlug,
  {
    shortDescription: string;
    summary: string;
    badge: string;
    headline: string;
    subheadline: string;
    roleTitle: string;
    roleDescription: string;
    primaryCtaLabel: string;
    capabilityHighlights: ProductRecord["capabilityHighlights"];
    ecosystemPoints: ProductRecord["ecosystemPoints"];
  }
> = {
  "omnia-creata-studio": {
    shortDescription:
      "Yonetim, uretim, inceleme ve yayin kararlarini birlestiren merkezi urun ortami.",
    summary:
      "Studio, Omnia Creata ekosisteminin ana merkezi ve dogal giris noktasi olarak konumlanir.",
    badge: "Amiral merkez",
    headline: "Omnia Creata icin merkezi urun merkezi.",
    subheadline:
      "Ekosistemdeki diger urunleri tek komuta katmanindan yonetmek icin Studio'ya gecin.",
    roleTitle: "Studio ekosistemin cekirdek kontrol katmanidir.",
    roleDescription:
      "Prompt, gorsel, operasyon ve izleme katmanlarini tek yuzde birlestirir; karar surecini hizlandirir.",
    primaryCtaLabel: "Studio merkezini ac",
    capabilityHighlights: [
      {
        title: "Komuta merkezi arayuzu",
        description:
          "Yol haritasi, prompt akislari, varliklar ve yayin kararlarini tek yerde yonetin.",
      },
      {
        title: "Coklu urun orkestrasyonu",
        description:
          "Prompt Vault, OmniaPixels, Organizer ve Watch katmanlarini merkezi bir duzende baglar.",
      },
      {
        title: "Karar odakli inceleme akisi",
        description:
          "Yogun icerigi sade bir hiyerarsiyle sunarak ekiplerin daha hizli karar almasini saglar.",
      },
      {
        title: "Erisim odakli public hub",
        description:
          "Public sayfada platform durumlarini gosterir ve kullaniciyi dogru yuzeye yonlendirir.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Prompt Vault ile bagli hafiza",
        description:
          "Prompt sistemleri baglamiyla birlikte Studio'ya tasinir ve tekrar kullanimi guclenir.",
      },
      {
        title: "OmniaPixels ile gorsel surec baglantisi",
        description:
          "Gorsel uretim kararlarinin stratejik baglami korunur ve yayin akisi hizlanir.",
      },
      {
        title: "Organizer ve Watch ile operasyon gorunurlugu",
        description:
          "Yayin ritmi, saglik sinyalleri ve operasyonel durum ayni merkezde toplanir.",
      },
    ],
  },
  omniapixels: {
    shortDescription:
      "Uretim, iyilestirme ve teslim sureclerini yoneten premium gorsel isleme katmani.",
    summary:
      "OmniaPixels, Omnia Creata ekosisteminde gorsel ciktinin kalitesini ve surekliligini yurutur.",
    badge: "Gorsel hat",
    headline: "Premium gorsel uretim ve rafine sureci.",
    subheadline:
      "OmniaPixels'e gecerek gorsel akislarinizi bagli bir sekilde yonetin.",
    roleTitle: "OmniaPixels gorsel uygulama katmanidir.",
    roleDescription:
      "Stratejik yonlendirmeyi gorsel ciktıya donusturur; Studio ve Prompt Vault ile bagli calisir.",
    primaryCtaLabel: "OmniaPixels merkezini ac",
    capabilityHighlights: [
      {
        title: "Yonlendirme odakli gorsel uretim",
        description:
          "Yapisal promptlar ile daha tutarli ve hizli gorsel sonuc uretilmesini saglar.",
      },
      {
        title: "Rafine ve kalite tamamlama",
        description:
          "Yukseltme, duzeltme ve son dokunuslarla yayin kalitesine uygun cikti sunar.",
      },
      {
        title: "Seri tutarlilik",
        description:
          "Kampanya veya urun serilerinde stil, kalite ve ton tutarliligini korur.",
      },
      {
        title: "Studio baglantili teslim",
        description:
          "Onaylanan gorselleri Studio akisina geri baglayarak yayin surecini hizlandirir.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Prompt Vault altyapisini kullanir",
        description:
          "Prompt aileleri sayesinde gorsel kalitede tekrar edilebilirlik saglar.",
      },
      {
        title: "Studio karar surecine cikti tasir",
        description:
          "Gorsel sonuc, stratejik baglamdan kopmadan urun karar surecine aktarilir.",
      },
      {
        title: "Watch ile kalite gorunurlugu saglar",
        description:
          "Gorsel uretim performansi, ekosistem genelindeki kalite sinyalleriyle birlikte izlenir.",
      },
    ],
  },
  omniaorganizer: {
    shortDescription:
      "Planlama, onceliklendirme ve yayin ritmini yoneten operasyonel koordinasyon katmani.",
    summary:
      "OmniaOrganizer, ekosistemdeki islerin zaman, sorumluluk ve teslim ritmini netlestirir.",
    badge: "Operasyon katmani",
    headline: "Bagli ekosistem icin operasyonel kontrol.",
    subheadline:
      "Uretim akisi ile operasyonel yurutmeyi ayni kalite cizgisinde birlestiren merkez.",
    roleTitle: "OmniaOrganizer ekosistemin hareket ritmini korur.",
    roleDescription:
      "Yol haritalari, sahiplik, kontrol noktasi ve yayin takvimini uygulama yuzeyleriyle baglar.",
    primaryCtaLabel: "OmniaOrganizer merkezini ac",
    capabilityHighlights: [
      {
        title: "Sakin operasyon gorunurlugu",
        description:
          "Blokajlari, ilerlemeyi ve sorumluluk durumunu karmasa yaratmadan gosteren net bir katman sunar.",
      },
      {
        title: "Urun baglamli planlama",
        description:
          "Planlar Studio, Pixels, Prompt Vault ve Watch ile bagli bir sekilde ilerler.",
      },
      {
        title: "Mobil odakli yurutme",
        description:
          "Onay ve durum guncelleme gibi kritik adimlar mobil yuzeylerde de etkili calisir.",
      },
      {
        title: "Yayin hazirlik uyumu",
        description:
          "Planlama mantigini yayin zamani, platform hazirligi ve kamuya acik anlatiyla birlestirir.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Studio kararlarini operasyona indirger",
        description:
          "Stratejik kararlar zamanlama ve sahiplikle gercek bir teslim planina donusur.",
      },
      {
        title: "Uretimi gorunur ilerlemeye cevirir",
        description:
          "Prompt ve gorsel surecler operasyonel baglamla daha yonetilebilir hale gelir.",
      },
      {
        title: "Watch sinyallerini anlamlandirir",
        description:
          "Planlanan is akisi ile gercek sinyallerin farki daha erken gorulur.",
      },
    ],
  },
  "prompt-vault": {
    shortDescription:
      "Prompt sistemleri, fikirler ve tekrar kullanilabilir mantik icin yapisal hafiza katmani.",
    summary:
      "Prompt Vault, Omnia Creata urun ailesinde uzun vadeli prompt bilgisini koruyan altyapi urunudur.",
    badge: "Prompt altyapisi",
    headline: "Tekrar kullanilabilir prompt zekasi icin urun merkezi.",
    subheadline:
      "Prompt sistemleri organize, versiyonlu ve bagli oldugunda ekosistem kalitesi istikrar kazanir.",
    roleTitle: "Prompt Vault ekosistemin hafiza katmanidir.",
    roleDescription:
      "Prompt mantigi, versiyon gecmisi ve tekrar kullanilabilir yapilari urunler arasi tasinabilir hale getirir.",
    primaryCtaLabel: "Prompt Vault merkezini ac",
    capabilityHighlights: [
      {
        title: "Yapisal prompt kutuphaneleri",
        description:
          "Promptlar baglam, kategori ve tekrar kullanim mantigiyla sistemli bir yapida tutulur.",
      },
      {
        title: "Versiyon odakli gelisim",
        description:
          "Hangi degisikliklerin kaliteyi artirdigi veya dusurdugu net sekilde takip edilir.",
      },
      {
        title: "Tasinabilir bilgi katmani",
        description:
          "Prompt mantigi Studio ve OmniaPixels gibi urunlere baglam kaybetmeden aktarilir.",
      },
      {
        title: "Altyapi seviyesinde urun konumu",
        description:
          "Prompt Vault, daginik notlar yerine ekiplerin guvenebilecegi yazilim altyapisi sunar.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Studio karar kalitesini besler",
        description:
          "Prompt zekasi stratejik gorunurluk kazanir ve karar surecine dogrudan etki eder.",
      },
      {
        title: "OmniaPixels tekrar edilebilirligini guclendirir",
        description:
          "Gorsel uretim kalitesi, prompt ailelerinin duzenli kullanimiyla daha kararlilik kazanir.",
      },
      {
        title: "Watch kalite driftini takip eder",
        description:
          "Prompt degisimleri ile cikti kalitesi arasindaki baglanti daha net okunur.",
      },
    ],
  },
  "omnia-watch": {
    shortDescription:
      "Saglik, kalite ve sistem sinyallerini toplayan ekosistem izleme ve zeka katmani.",
    summary:
      "Omnia Watch, Omnia Creata urun ailesinin buyurken guvenilir kalmasini saglayan izleme urunudur.",
    badge: "Zeka katmani",
    headline: "Sakin ama guclu ekosistem izleme.",
    subheadline:
      "Sinyal yogunlugunu karar odakli bir yapida sunarak ekiplerin hizli aksiyon almasini saglar.",
    roleTitle: "Omnia Watch ekosistemin farkindalik katmanidir.",
    roleDescription:
      "Saglik, kalite drifti ve operasyon sinyallerini baglamla birlikte gosterir; dashboard gurultusunu azaltir.",
    primaryCtaLabel: "Omnia Watch merkezini ac",
    capabilityHighlights: [
      {
        title: "Sinyal odakli urun farkindaligi",
        description:
          "Ham telemetri yerine karar verebilir sinyallerle urun sagligini daha anlasilir kilar.",
      },
      {
        title: "Kalite drift gorunurlugu",
        description:
          "Yavas bozulmalari erken yakalayarak maliyetli arizalar olusmadan mudahale imkani saglar.",
      },
      {
        title: "Urunler arasi bagli zeka",
        description:
          "Prompt, gorsel, operasyon ve kullanim sinyalleri arasindaki etkilesimi ayni yerde toplar.",
      },
      {
        title: "Aksiyon odakli izleme",
        description:
          "Izleme sonucunu somut karar ve takip adimlarina donusturur.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Studio kararlarini guclendirir",
        description:
          "Liderlik ve urun ekipleri hazirlik durumunu sinyallerle birlikte gorur.",
      },
      {
        title: "Organizer yurutmesini destekler",
        description:
          "Planlanan operasyon ritmi ile gercek sinyaller arasindaki fark erken fark edilir.",
      },
      {
        title: "Prompt Vault ve Pixels geri beslemesini iyilestirir",
        description:
          "Girdi degisiklikleri ile kalite sonucunu baglayarak daha hizli ogrenme dongusu kurar.",
      },
    ],
  },
};

const turkishSurfaceNames: Record<PlatformKey, string> = {
  web: "web",
  ios: "iOS",
  android: "Android",
  pwa: "PWA",
  desktop: "desktop",
};

const turkishPlatformLabels: Record<PlatformKey, string> = {
  web: "Web uygulamasini ac",
  desktop: "Desktop erisimini gor",
  pwa: "PWA yukle",
  ios: "iOS erisimini gor",
  android: "Android erisimini gor",
};

function toTurkishPlatformNote(productName: string, platform: PlatformKey, status: PlatformStatus) {
  const surface = turkishSurfaceNames[platform];

  if (status === "live") {
    return `${productName} icin aktif ${surface} erisim yuzeyi.`;
  }

  if (status === "preview") {
    return `${surface} yuzeyi onizleme fazindadir. Canli alternatiflerden devam edebilirsiniz.`;
  }

  return `${surface} yuzeyi planlama fazindadir. Erisim detaylari icin iletisime gecebilirsiniz.`;
}

function localizeProduct(product: ProductRecord, locale: LocaleCode): ProductRecord {
  if (locale !== "tr") {
    return {
      ...product,
      accessLinks: product.accessLinks.length ? product.accessLinks : product.platformMatrix,
    };
  }

  const localized = turkishProductCopy[product.slug];
  const localizedPlatformMatrix = product.platformMatrix.map((entry) => ({
    ...entry,
    label: turkishPlatformLabels[entry.platform],
    note: toTurkishPlatformNote(product.name, entry.platform, entry.status),
  }));

  return {
    ...product,
    badge: localized.badge,
    headline: localized.headline,
    shortDescription: localized.shortDescription,
    summary: localized.summary,
    subheadline: localized.subheadline,
    roleTitle: localized.roleTitle,
    roleDescription: localized.roleDescription,
    primaryCTA: {
      ...product.primaryCTA,
      label: localized.primaryCtaLabel,
    },
    hubNav: product.hubNav.map((section) => ({
      ...section,
      title: turkishHubNav[section.id].title,
      description: turkishHubNav[section.id].description,
    })),
    platformMatrix: localizedPlatformMatrix,
    accessLinks: localizedPlatformMatrix,
    capabilityHighlights: localized.capabilityHighlights,
    ecosystemPoints: localized.ecosystemPoints,
  };
}

export function getProducts(locale: LocaleCode = "en") {
  return products.map((product) => localizeProduct(product, locale));
}

export function getProductBySlug(slug: string, locale: LocaleCode = "en") {
  return getProducts(locale).find((product) => product.slug === slug);
}
