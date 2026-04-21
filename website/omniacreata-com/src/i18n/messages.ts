import type { LocaleCode } from "./config";

export type Messages = {
  utility: {
    globalSite: string;
    localeLabel: string;
    availability: string;
  };
  nav: {
    products: string;
    platforms: string;
    pricing: string;
    company: string;
    support: string;
    about: string;
    contact: string;
    legal: string;
    privacy: string;
    terms: string;
    productHub: string;
    platformAccess: string;
    supportCenter: string;
  };
  common: {
    exploreEcosystem: string;
    openStudio: string;
    viewPricing: string;
    contactTeam: string;
    openProductHub: string;
    productAccess: string;
    productStatus: string;
    availableOn: string;
    productPlatforms: string;
    live: string;
    preview: string;
    planned: string;
    openWeb: string;
    openDesktop: string;
    installPwa: string;
    iosAccess: string;
    androidAccess: string;
    accessHub: string;
    viewProduct: string;
    learnMore: string;
    globalRollout: string;
    flagshipStudio: string;
    support: string;
    company: string;
    legal: string;
  };
  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    utilityDescription: string;
    platformBandEyebrow: string;
    platformBandTitle: string;
    platformBandDescription: string;
    ecosystemEyebrow: string;
    ecosystemTitle: string;
    ecosystemDescription: string;
    accessRailEyebrow: string;
    accessRailTitle: string;
    accessRailDescription: string;
    trustEyebrow: string;
    trustTitle: string;
    trustDescription: string;
  };
  sections: {
    overview: string;
    access: string;
    capabilities: string;
    ecosystemRole: string;
    relatedProducts: string;
  };
  accessPanel: {
    eyebrow: string;
    title: string;
    description: string;
    availableNow: string;
    openAlternative: string;
    backToHub: string;
    contactForAccess: string;
    close: string;
  };
  contactForm: {
    name: string;
    email: string;
    company: string;
    interest: string;
    message: string;
    placeholderName: string;
    placeholderEmail: string;
    placeholderCompany: string;
    placeholderInterest: string;
    placeholderMessage: string;
    submit: string;
    sending: string;
    helper: string;
  };
};

const english: Messages = {
  utility: {
    globalSite: "Public site",
    localeLabel: "Language / region",
    availability: "Worldwide access",
  },
  nav: {
    products: "Products",
    platforms: "Platforms",
    pricing: "Pricing",
    company: "Company",
    support: "Support",
    about: "About",
    contact: "Contact",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    productHub: "Products",
    platformAccess: "Platforms",
    supportCenter: "Support",
  },
  common: {
    exploreEcosystem: "View product map",
    openStudio: "Open Studio",
    viewPricing: "View pricing",
    contactTeam: "Contact",
    openProductHub: "View product",
    productAccess: "Access",
    productStatus: "Product status",
    availableOn: "Available on",
    productPlatforms: "Platforms",
    live: "Live",
    preview: "Preview",
    planned: "Planned",
    openWeb: "Open web app",
    openDesktop: "Open desktop app",
    installPwa: "Install PWA",
    iosAccess: "View iOS access",
    androidAccess: "View Android access",
    accessHub: "Access hub",
    viewProduct: "View product",
    learnMore: "Learn more",
    globalRollout: "Global ready",
    flagshipStudio: "Studio first",
    support: "Support",
    company: "Company",
    legal: "Legal",
  },
  home: {
    heroEyebrow: "Omnia Creata",
    heroTitle: "Studio ships first.",
    heroDescription:
      "The public site explains the company and routes people into the live product without duplicating the Studio landing.",
    utilityDescription:
      "omniacreata.com",
    platformBandEyebrow: "Platform visibility",
    platformBandTitle: "Availability is visible before commitment.",
    platformBandDescription:
      "Web, iOS, Android, PWA, and desktop availability stay readable before someone opens a product.",
    ecosystemEyebrow: "Product directory",
    ecosystemTitle: "One live route, more direction around it.",
    ecosystemDescription:
      "Start with the flagship, then move into the product built for the next specific job.",
    accessRailEyebrow: "Product access rail",
    accessRailTitle: "Move from discovery to the right product quickly.",
    accessRailDescription:
      "Every visible action should lead somewhere useful.",
    trustEyebrow: "Public HQ",
    trustTitle: "A public site built to feel active, clear, and honest.",
    trustDescription:
      "Direct routes, product-first copy, and restrained structure keep the site useful as the system grows.",
  },
  sections: {
    overview: "Overview",
    access: "Access",
    capabilities: "Capabilities",
    ecosystemRole: "Ecosystem role",
    relatedProducts: "Related products",
  },
  accessPanel: {
    eyebrow: "Access update",
    title: "This platform is not publicly open yet.",
    description:
      "You can continue with a live surface or contact the team for access details.",
    availableNow: "Available now",
    openAlternative: "Open alternative",
    backToHub: "Back to product hub",
    contactForAccess: "Request access details",
    close: "Close",
  },
  contactForm: {
    name: "Name",
    email: "Email",
    company: "Company",
    interest: "Area of interest",
    message: "Message",
    placeholderName: "Your name",
    placeholderEmail: "you@company.com",
    placeholderCompany: "Company or studio",
    placeholderInterest: "Studio, partnership, pricing...",
    placeholderMessage: "Tell us what you want to build with Omnia Creata.",
    submit: "Send inquiry",
    sending: "Sending...",
    helper: "Share a short note and we will send it to the right inbox.",
  },
};

const turkish: Messages = {
  utility: {
    globalSite: "Kamu sitesi",
    localeLabel: "Dil / bolge",
    availability: "Dunya capinda erisim",
  },
  nav: {
    products: "Urunler",
    platforms: "Platformlar",
    pricing: "Fiyatlandirma",
    company: "Sirket",
    support: "Destek",
    about: "Hakkinda",
    contact: "Iletisim",
    legal: "Yasal",
    privacy: "Gizlilik Politikasi",
    terms: "Hizmet Sartlari",
    productHub: "Urunler",
    platformAccess: "Platformlar",
    supportCenter: "Destek",
  },
  common: {
    exploreEcosystem: "Ekosistemi kesfet",
    openStudio: "Studio'yu ac",
    viewPricing: "Fiyatlandirmayi gor",
    contactTeam: "Ekiple iletisime gec",
    openProductHub: "Urun merkezini ac",
    productAccess: "Erisim",
    productStatus: "Urun durumu",
    availableOn: "Kullanilabilir yuzeyler",
    productPlatforms: "Platformlar",
    live: "Canli",
    preview: "Onizleme",
    planned: "Planli",
    openWeb: "Web uygulamasini ac",
    openDesktop: "Masaustu uygulamasini ac",
    installPwa: "PWA yukle",
    iosAccess: "iOS erisimini gor",
    androidAccess: "Android erisimini gor",
    accessHub: "Erisim merkezi",
    viewProduct: "Urunu gor",
    learnMore: "Daha fazla bilgi",
    globalRollout: "Global hazir",
    flagshipStudio: "Amiral Studio",
    support: "Destek",
    company: "Sirket",
    legal: "Yasal",
  },
  home: {
    heroEyebrow: "Studio merkezli public HQ",
    heroTitle:
      "Studio ile basla. Omnia'yi baglam icinde gor.",
    heroDescription:
      "Amiral urun, destek yuzeyleri ve her biri icin bir sonraki rota icin daha sakin bir public HQ.",
    utilityDescription:
      "omniacreata.com",
    platformBandEyebrow: "Platform gorunurlugu",
    platformBandTitle: "Erisim durumu karar vermeden once gorunmeli.",
    platformBandDescription:
      "Web, iOS, Android, PWA ve desktop erisimi urun acilmadan once okunabilir kalir.",
    ecosystemEyebrow: "Urun dizini",
    ecosystemTitle: "Ekosistem gercek, ama agirlik merkezi Studio.",
    ecosystemDescription:
      "Amiral urunu giris noktasi yap, daha spesifik yuzey gerektiginde disari dogru ilerle.",
    accessRailEyebrow: "Urun erisim hatti",
    accessRailTitle: "Her sey tek tik uzakta.",
    accessRailDescription:
      "Her tik anlamli bir sonraki adima gider.",
    trustEyebrow: "Public HQ",
    trustTitle: "Buyuyen bir urun sistemi icin daha sakin bir on kapi.",
    trustDescription:
      "Dogrudan rotalar, durust urun anlatimi ve kontrollu yapi ekosistem olgunlasirken siteyi faydali tutar.",
  },
  sections: {
    overview: "Genel bakis",
    access: "Erisim",
    capabilities: "Yetenekler",
    ecosystemRole: "Ekosistem rolu",
    relatedProducts: "Ilgili urunler",
  },
  accessPanel: {
    eyebrow: "Erisim guncellemesi",
    title: "Bu platform girisi henuz canli degil.",
    description:
      "Su an canli olan yuzeylerden devam edebilir veya Omnia Creata ekibinden erisim detayi talep edebilirsin.",
    availableNow: "Simdi kullanilabilir",
    openAlternative: "Alternatifi ac",
    backToHub: "Urun merkezine don",
    contactForAccess: "Erisim detayi talep et",
    close: "Kapat",
  },
  contactForm: {
    name: "Ad",
    email: "E-posta",
    company: "Sirket",
    interest: "Ilgi alani",
    message: "Mesaj",
    placeholderName: "Adiniz",
    placeholderEmail: "eposta@sirket.com",
    placeholderCompany: "Sirket veya ekip",
    placeholderInterest: "Studio, ortaklik, fiyatlandirma...",
    placeholderMessage: "Omnia Creata ile ne kurmak istediginizi yazin.",
    submit: "Mesaj gonder",
    sending: "Gonderiliyor...",
    helper: "Kisa bir not birak, dogru ekibe iletelim.",
  },
};

export const messages: Record<LocaleCode, Messages> = {
  en: english,
  tr: turkish,
  de: english,
  fr: english,
  es: english,
  "pt-BR": english,
  ar: english,
  ru: english,
  ja: english,
  "zh-CN": english,
};

export function getMessages(locale: LocaleCode) {
  return messages[locale] ?? messages.en;
}
