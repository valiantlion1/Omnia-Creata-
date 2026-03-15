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
    globalSite: "Global site",
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
    exploreEcosystem: "View products",
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
    flagshipStudio: "Studio spotlight",
    support: "Support",
    company: "Company",
    legal: "Legal",
  },
  home: {
    heroEyebrow: "Official public website",
    heroTitle:
      "Everything in Omnia Creata starts here.",
    heroDescription:
      "Explore products, check platform access, and move directly into the right Omnia Creata experience from one clear starting point.",
    utilityDescription:
      "omniacreata.com",
    platformBandEyebrow: "Platform access",
    platformBandTitle: "See where each product is available.",
    platformBandDescription:
      "Web, iOS, Android, PWA, and desktop availability is visible before you enter.",
    ecosystemEyebrow: "Products",
    ecosystemTitle: "Five flagship products. One clear directory.",
    ecosystemDescription:
      "Each product has a defined purpose, a direct route, and a consistent public hub.",
    accessRailEyebrow: "Product access rail",
    accessRailTitle: "Go from discovery to the right product in one step.",
    accessRailDescription:
      "Every visible action should lead somewhere useful.",
    trustEyebrow: "Trust",
    trustTitle: "Built to feel clear, stable, and ready.",
    trustDescription:
      "The public site is designed for fast decisions, reliable navigation, and a premium product experience.",
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
    helper: "Share a short note and our team will get back to you.",
  },
};

const turkish: Messages = {
  utility: {
    globalSite: "Global site",
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
    heroEyebrow: "Resmi site",
    heroTitle:
      "Guven veren yazilim deneyimleri uret.",
    heroDescription:
      "Omnia Creata ekosistemini kesfet ve dogru urune dogrudan gec.",
    utilityDescription:
      "omniacreata.com",
    platformBandEyebrow: "Platform erisimi",
    platformBandTitle: "Her amiral urun dogru yuzeyle eslestirilir.",
    platformBandDescription:
      "Web, mobil, PWA ve desktop erisimi ilk bakista gorunur.",
    ecosystemEyebrow: "Ana ekosistem",
    ecosystemTitle: "Bes amiral urun. Tek ekosistem.",
    ecosystemDescription:
      "Her urunun rolu net, gecis yolu acik.",
    accessRailEyebrow: "Urun erisim hatti",
    accessRailTitle: "Her sey tek tik uzakta.",
    accessRailDescription:
      "Her tik anlamli bir sonraki adima gider.",
    trustEyebrow: "Guven ve kalite",
    trustTitle: "Uzun vadeli urun disipliniyle insa edildi.",
    trustDescription:
      "Premium tasarim, net yapi ve cihazlar arasi tutarli deneyim.",
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
    helper: "Kisa bir not birak, ekibimiz sana donsun.",
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
