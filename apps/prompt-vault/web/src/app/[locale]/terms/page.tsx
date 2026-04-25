import { support } from "@prompt-vault/config";
import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const updatedAt = "April 25, 2026";

const copy = {
  en: {
    eyebrow: "Terms",
    title: "Terms of Use",
    intro:
      "These terms explain how OmniaPrompt may be used. By using the app, you agree to use it responsibly and to keep your own content lawful, safe, and backed up.",
    updated: `Last updated: ${updatedAt}`,
    sections: [
      {
        title: "Service provider",
        body: [
          "OmniaPrompt is provided by OmniaCreata. Questions about these terms, account data, privacy, billing, or store listings can be sent to hello@omniacreata.com.",
          "The app may be available through the web, as a PWA, or through an Android shell."
        ]
      },
      {
        title: "What the app does",
        body: [
          "OmniaPrompt helps you capture, organize, search, export, and reuse prompts, notes, project thoughts, workflows, and related writing.",
          "Some features may depend on local device storage, account sync, browser support, network availability, or optional third-party services."
        ]
      },
      {
        title: "Your content",
        body: [
          "You keep responsibility for the prompts, notes, files, source links, tags, and other material you add to OmniaPrompt.",
          "Do not store or share content you do not have the right to use, content that violates law, content that infringes intellectual property, or content that harms other people."
        ]
      },
      {
        title: "Acceptable use",
        body: [
          "Do not use OmniaPrompt to create, store, automate, or distribute illegal material, malware, phishing content, fraud, harassment, non-consensual intimate content, or instructions intended to cause harm.",
          "Do not try to break, overload, scrape, reverse engineer, bypass limits, interfere with other users, or misuse account, sync, AI, payment, or export systems."
        ]
      },
      {
        title: "Local mode and backups",
        body: [
          "Local mode stores data on your device. You are responsible for exporting or backing up important workspace data before clearing storage, uninstalling the app, changing devices, or resetting local data.",
          "OmniaCreata cannot recover local-only data that was deleted from your device and never synced or exported."
        ]
      },
      {
        title: "Accounts and sync",
        body: [
          "If account sync is available, you are responsible for keeping your login details safe and for notifying us if you believe your account has been misused.",
          "We may limit, suspend, or remove access if we reasonably believe an account is being used abusively, unlawfully, or in a way that risks the service or other users."
        ]
      },
      {
        title: "AI features",
        body: [
          "AI features, when available, provide suggestions. You are responsible for reviewing outputs before relying on them, publishing them, or using them in client, commercial, legal, medical, financial, or safety-sensitive work.",
          "AI suggestions may be incomplete, inaccurate, or unsuitable for your purpose."
        ]
      },
      {
        title: "Free and paid features",
        body: [
          "The current app can be used for free. Paid features, subscriptions, ads, or in-app purchases may be introduced only with clear product and store disclosures before any charge.",
          "If paid features become available, pricing, renewal, cancellation, refund, and store-provider rules will be shown in the relevant checkout or store flow."
        ]
      },
      {
        title: "Third-party services",
        body: [
          "OmniaPrompt may rely on third-party services for hosting, account sync, app distribution, AI processing, payments, analytics, or other infrastructure.",
          "Third-party services may have their own terms and privacy policies. Use of those features may require accepting their rules."
        ]
      },
      {
        title: "Availability and changes",
        body: [
          "We aim to keep OmniaPrompt useful and reliable, but the app may change, pause, lose network access, or become unavailable.",
          "We may update features, limits, design, domains, pricing, supported platforms, or integrations as the product matures."
        ]
      },
      {
        title: "Disclaimers",
        body: [
          "OmniaPrompt is provided as a productivity and organization tool. It is not a legal, financial, medical, security, or professional-advice service.",
          "Use the app at your own discretion and keep independent backups of important content."
        ]
      },
      {
        title: "Liability",
        body: [
          "To the maximum extent allowed by law, OmniaCreata is not responsible for indirect, incidental, special, consequential, or lost-profit damages related to use of the app.",
          "Nothing in these terms limits rights that cannot be limited under applicable law."
        ]
      },
      {
        title: "Termination",
        body: [
          "You may stop using OmniaPrompt at any time. You can delete local data from the device and request deletion of account sync data by contacting us from the account email.",
          "We may suspend or terminate access for misuse, legal risk, non-payment if paid features exist, or behavior that threatens the service or other users."
        ]
      },
      {
        title: "Changes to these terms",
        body: [
          "We may update these terms as the product changes. Continued use after a posted update means you accept the updated terms."
        ]
      }
    ]
  },
  tr: {
    eyebrow: "Kosullar",
    title: "Kullanim Kosullari",
    intro:
      "Bu kosullar OmniaPrompt'un nasil kullanilabilecegini aciklar. Uygulamayi kullanarak onu sorumlu sekilde kullanmayi ve kendi icerigini yasal, guvenli ve yedekli tutmayi kabul edersin.",
    updated: "Son guncelleme: 25 Nisan 2026",
    sections: [
      {
        title: "Hizmet saglayici",
        body: [
          "OmniaPrompt OmniaCreata tarafindan sunulur. Bu kosullar, hesap verisi, gizlilik, odeme veya magaza listeleri hakkindaki sorular hello@omniacreata.com adresine gonderilebilir.",
          "Uygulama web, PWA veya Android kabugu uzerinden sunulabilir."
        ]
      },
      {
        title: "Uygulama ne yapar",
        body: [
          "OmniaPrompt promptlari, notlari, proje dusuncelerini, workflow'lari ve ilgili yazilari yakalamana, duzenlemene, aramana, disa aktarmana ve yeniden kullanmana yardim eder.",
          "Bazi ozellikler yerel cihaz deposuna, hesap esitlemesine, browser destegine, internet erisimine veya opsiyonel ucuncu taraf servislere bagli olabilir."
        ]
      },
      {
        title: "Icerigin",
        body: [
          "OmniaPrompt'a ekledigin promptlar, notlar, dosyalar, kaynak linkleri, etiketler ve diger materyallerden sen sorumlusun.",
          "Kullanim hakkina sahip olmadigin, yasalari ihlal eden, fikri mulkiyet haklarini ihlal eden veya baskalarina zarar veren icerikleri saklama veya paylasma."
        ]
      },
      {
        title: "Kabul edilebilir kullanim",
        body: [
          "OmniaPrompt'u yasa disi materyal, kotu amacli yazilim, phishing, dolandiricilik, taciz, riza disi mahrem icerik veya zarar vermeye yonelik talimatlar olusturmak, saklamak, otomatiklestirmek veya dagitmak icin kullanma.",
          "Servisi bozmaya, asiri yuklemeye, kazimaya, tersine muhendislik yapmaya, limitleri asmeye, diger kullanicilara mudahale etmeye veya hesap, sync, AI, odeme ya da export sistemlerini kotuye kullanmaya calisma."
        ]
      },
      {
        title: "Yerel mod ve yedekler",
        body: [
          "Yerel mod veriyi cihazinda saklar. Depoyu temizlemeden, uygulamayi kaldirmadan, cihaz degistirmeden veya yerel veriyi sifirlamadan once onemli calisma alani verilerini disa aktarmak veya yedeklemek senin sorumlulugundadir.",
          "OmniaCreata cihazindan silinen ve hic sync edilmemis veya disa aktarilmamis yerel veriyi geri getiremez."
        ]
      },
      {
        title: "Hesaplar ve sync",
        body: [
          "Hesap esitlemesi kullanima aciksa giris bilgilerini guvende tutmak ve hesabin kotuye kullanildigini dusunursen bize haber vermek senin sorumlulugundadir.",
          "Bir hesabin kotuye kullanildigina, yasa disi kullanildigina veya servis ya da diger kullanicilar icin risk yarattigina makul sekilde inanirsak erisimi sinirlayabilir, askiya alabilir veya kaldirabiliriz."
        ]
      },
      {
        title: "AI ozellikleri",
        body: [
          "AI ozellikleri kullanima acildiginda oneri sunar. Ciktilari kullanmadan, yayinlamadan veya musteri, ticari, hukuki, tibbi, finansal ya da guvenlik hassasiyeti olan islerde kullanmadan once incelemek senin sorumlulugundadir.",
          "AI onerileri eksik, hatali veya amacina uygun olmayabilir."
        ]
      },
      {
        title: "Ucretsiz ve ucretli ozellikler",
        body: [
          "Mevcut uygulama ucretsiz kullanilabilir. Ucretli ozellikler, abonelikler, reklamlar veya uygulama ici satin almalar yalnizca herhangi bir ucretten once net urun ve magaza aciklamalariyla sunulabilir.",
          "Ucretli ozellikler acilirsa fiyat, yenileme, iptal, iade ve magaza saglayicisi kurallari ilgili odeme veya magaza akisinda gosterilir."
        ]
      },
      {
        title: "Ucuncu taraf servisler",
        body: [
          "OmniaPrompt hosting, hesap esitlemesi, app dagitimi, AI isleme, odeme, analiz veya diger altyapi icin ucuncu taraf servislere dayanabilir.",
          "Ucuncu taraf servislerin kendi kosullari ve gizlilik politikalari olabilir. Bu ozellikleri kullanmak onlarin kurallarini kabul etmeyi gerektirebilir."
        ]
      },
      {
        title: "Erisilebilirlik ve degisiklikler",
        body: [
          "OmniaPrompt'u faydali ve guvenilir tutmayi hedefleriz; fakat uygulama degisebilir, duraklayabilir, internet erisimini kaybedebilir veya kullanilamaz hale gelebilir.",
          "Urun olgunlastikca ozellikleri, limitleri, tasarimi, domainleri, fiyatlandirmayi, desteklenen platformlari veya entegrasyonlari guncelleyebiliriz."
        ]
      },
      {
        title: "Sorumluluk reddi",
        body: [
          "OmniaPrompt bir verimlilik ve duzenleme aracidir. Hukuki, finansal, tibbi, guvenlik veya profesyonel danismanlik hizmeti degildir.",
          "Uygulamayi kendi takdirinle kullan ve onemli iceriklerin bagimsiz yedeklerini tut."
        ]
      },
      {
        title: "Sorumluluk siniri",
        body: [
          "Yasanin izin verdigi azami olcude OmniaCreata uygulama kullanimiyla ilgili dolayli, arizi, ozel, sonucsal veya kar kaybi zararlarindan sorumlu degildir.",
          "Bu kosullardaki hicbir sey uygulanabilir hukuk kapsaminda sinirlanamayacak haklari sinirlamaz."
        ]
      },
      {
        title: "Sonlandirma",
        body: [
          "OmniaPrompt'u kullanmayi istedigin zaman birakabilirsin. Yerel veriyi cihazdan silebilir ve hesap e-postanla bizimle iletisime gecerek hesap sync verisinin silinmesini isteyebilirsin.",
          "Kotuye kullanim, hukuki risk, ucretli ozellik varsa odeme yapilmamasi veya servis ya da diger kullanicilari tehdit eden davranislar nedeniyle erisimi askiya alabilir veya sonlandirabiliriz."
        ]
      },
      {
        title: "Kosullardaki degisiklikler",
        body: [
          "Urun degistikce bu kosullari guncelleyebiliriz. Yayinlanan guncellemeden sonra kullanima devam etmen guncel kosullari kabul ettigin anlamina gelir."
        ]
      }
    ]
  }
} as const;

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const content = copy[safeLocale];

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-5xl space-y-8 px-4 py-14 md:px-6 lg:py-20">
        <div className="space-y-4 text-center">
          <Badge tone="accent">{content.eyebrow}</Badge>
          <h1 className="font-display text-5xl tracking-[-0.06em] text-[var(--text-primary)]">
            {content.title}
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
            {content.intro}
          </p>
          <p className="text-sm font-medium text-[var(--text-tertiary)]">{content.updated}</p>
        </div>

        <div className="grid gap-5">
          {content.sections.map((section) => (
            <Surface key={section.title} className="space-y-4 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-[var(--text-secondary)]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Surface>
          ))}
        </div>

        <Surface className="p-6 text-sm leading-7 text-[var(--text-secondary)]">
          {safeLocale === "tr"
            ? `Iletisim: ${support.email}`
            : `Contact: ${support.email}`}
        </Surface>
      </section>
    </MarketingShell>
  );
}
