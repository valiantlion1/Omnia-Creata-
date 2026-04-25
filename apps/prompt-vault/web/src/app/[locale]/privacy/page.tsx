import { support } from "@prompt-vault/config";
import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const updatedAt = "April 25, 2026";

const copy = {
  en: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "OmniaPrompt is designed as a local-first workspace for prompts, notes, projects, and reusable ideas. This policy explains what the app stores, when data can leave your device, and how to contact OmniaCreata about privacy requests.",
    updated: `Last updated: ${updatedAt}`,
    sections: [
      {
        title: "Who provides OmniaPrompt",
        body: [
          "OmniaPrompt is provided by OmniaCreata. You can contact us at hello@omniacreata.com for privacy, deletion, access, correction, export, safety, or store-listing questions.",
          "This policy covers the OmniaPrompt web app, installed PWA experience, and Android shell."
        ]
      },
      {
        title: "Information you create in the app",
        body: [
          "The app stores the entries you create, including titles, prompt bodies, notes, result notes, summaries, projects, tags, categories, platform labels, source links, ratings, favorites, archive status, drafts, versions, and local preferences.",
          "If you paste personal, sensitive, confidential, or third-party information into an entry, that content becomes part of your workspace. Avoid storing material you do not have permission to keep."
        ]
      },
      {
        title: "Local-first storage",
        body: [
          "You can use OmniaPrompt without creating an account. In local mode, workspace data is saved in browser or app storage on the device you are using.",
          "Local data can be lost if you clear browser storage, uninstall the app, reset the workspace, use private browsing, or switch devices without exporting or syncing first."
        ]
      },
      {
        title: "Account sync",
        body: [
          "If account sync is available and you sign in, OmniaPrompt may save your workspace data to cloud storage so it can be restored across sessions or devices.",
          "Cloud sync requires account identifiers such as email address, user id, session tokens, and sync metadata. Guest use does not require an account."
        ]
      },
      {
        title: "AI assistance",
        body: [
          "AI help is optional and may be disabled. If enabled, the text you choose to send for AI assistance can be processed by OmniaPrompt and the configured AI provider to generate suggestions.",
          "Do not send secrets, passwords, payment information, private health information, or confidential third-party material to AI features unless you have permission and understand the risk."
        ]
      },
      {
        title: "Ads, analytics, and purchases",
        body: [
          "The current app is configured so ads, analytics, billing, and paid plans are not active unless they are clearly enabled for users.",
          "If ads, analytics, subscriptions, in-app purchases, or third-party tracking are enabled later, the store listing, data disclosures, and this policy must be updated before launch of that behavior."
        ]
      },
      {
        title: "Device, technical, and safety data",
        body: [
          "OmniaPrompt may process technical information needed to run the app, such as session state, sync status, local storage keys, request timing, error logs, security events, and approximate device or browser information.",
          "We use this information to keep the app working, prevent abuse, diagnose errors, and protect user trust."
        ]
      },
      {
        title: "Sharing",
        body: [
          "We do not sell your prompt library. Data is shared only when needed to operate the app, provide optional account sync or AI assistance, comply with law, prevent abuse, or respond to your request.",
          "When third-party services are used, they should receive only the data needed for the feature they provide."
        ]
      },
      {
        title: "Retention and deletion",
        body: [
          "Local workspace data remains on your device until you delete entries, reset local data, clear app/browser storage, or uninstall the app.",
          "For account sync data, email hello@omniacreata.com from the account email and ask for export, correction, or deletion. We will respond as soon as reasonably possible and may need to verify account ownership."
        ]
      },
      {
        title: "Your choices",
        body: [
          "You can export your workspace from Settings, use the app without an account, avoid AI features, avoid entering sensitive information, delete local data, or contact us for account-data requests.",
          "If your region gives you additional privacy rights, contact us and we will handle the request according to applicable law."
        ]
      },
      {
        title: "Children",
        body: [
          "OmniaPrompt is not designed for children. Do not use the app if you are not old enough to use software services in your country without parent or guardian consent."
        ]
      },
      {
        title: "Changes to this policy",
        body: [
          "We may update this policy when the product changes. Material changes should be reflected in the app or store listing before the related behavior is used."
        ]
      }
    ]
  },
  tr: {
    eyebrow: "Gizlilik",
    title: "Gizlilik Politikasi",
    intro:
      "OmniaPrompt promptlar, notlar, projeler ve tekrar kullanilabilir fikirler icin yerel-oncelikli bir calisma alanidir. Bu politika uygulamanin ne sakladigini, verinin ne zaman cihazindan cikabilecegini ve OmniaCreata ile nasil iletisime gececegini aciklar.",
    updated: "Son guncelleme: 25 Nisan 2026",
    sections: [
      {
        title: "OmniaPrompt'u kim sunar",
        body: [
          "OmniaPrompt OmniaCreata tarafindan sunulur. Gizlilik, silme, erisim, duzeltme, disa aktarma, guvenlik veya magaza listesi sorulari icin hello@omniacreata.com adresine yazabilirsin.",
          "Bu politika OmniaPrompt web app, yuklenebilir PWA deneyimi ve Android kabugu icin gecerlidir."
        ]
      },
      {
        title: "Uygulamada olusturdugun bilgiler",
        body: [
          "Uygulama olusturdugun basliklari, prompt govdelerini, notlari, sonuc notlarini, ozetleri, projeleri, etiketleri, kategorileri, platform etiketlerini, kaynak linklerini, puanlari, favorileri, arsiv durumunu, taslaklari, surumleri ve yerel tercihleri saklar.",
          "Bir kayda kisisel, hassas, gizli veya ucuncu tarafa ait bilgi yapistirirsan bu bilgi calisma alaninin parcasi olur. Saklama iznin olmayan materyalleri ekleme."
        ]
      },
      {
        title: "Yerel-oncelikli saklama",
        body: [
          "OmniaPrompt'u hesap olusturmadan kullanabilirsin. Yerel modda calisma alani verisi kullandigin cihazdaki browser veya app deposunda saklanir.",
          "Browser deposunu temizlersen, uygulamayi kaldirirsan, calisma alanini sifirlarsan, gizli sekme kullanirsan veya disa aktarma/sync olmadan cihaz degistirirsen yerel veri kaybolabilir."
        ]
      },
      {
        title: "Hesap esitlemesi",
        body: [
          "Hesap esitlemesi kullanima aciksa ve giris yaparsan OmniaPrompt calisma alanini oturumlar veya cihazlar arasinda geri yuklemek icin bulut deposuna kaydedebilir.",
          "Bulut esitlemesi e-posta adresi, kullanici id, oturum tokenlari ve sync metaverisi gibi hesap tanimlayicilari gerektirir. Misafir kullanim hesap gerektirmez."
        ]
      },
      {
        title: "AI yardimi",
        body: [
          "AI yardimi opsiyoneldir ve kapali olabilir. Acildiginda AI yardimi icin gondermeyi sectigin metin, oneri uretmek amaciyla OmniaPrompt ve yapilandirilmis AI saglayicisi tarafindan islenebilir.",
          "Sirlari, sifreleri, odeme bilgilerini, ozel saglik bilgilerini veya gizli ucuncu taraf materyallerini AI ozelliklerine gonderme."
        ]
      },
      {
        title: "Reklam, analiz ve odemeler",
        body: [
          "Mevcut uygulama reklam, analiz, odeme ve ucretli planlar acik olmayacak sekilde yapilandirilmistir; bu davranis ancak acikca etkinlestirilirse degisir.",
          "Reklam, analiz, abonelik, uygulama ici satin alma veya ucuncu taraf takip davranisi daha sonra acilirsa magaza listesi, veri beyanlari ve bu politika ilgili davranis yayina alinmadan once guncellenmelidir."
        ]
      },
      {
        title: "Cihaz, teknik ve guvenlik verisi",
        body: [
          "OmniaPrompt uygulamayi calistirmak icin gerekli teknik bilgileri isleyebilir: oturum durumu, sync durumu, yerel depolama anahtarlari, istek zamanlamasi, hata kayitlari, guvenlik olaylari ve yaklasik cihaz/browser bilgisi.",
          "Bu bilgiler uygulamayi calisir tutmak, kotuye kullanimi onlemek, hatalari anlamak ve kullanici guvenini korumak icin kullanilir."
        ]
      },
      {
        title: "Paylasim",
        body: [
          "Prompt kutuphaneni satmayiz. Veri yalnizca uygulamayi calistirmak, opsiyonel hesap sync veya AI yardimi saglamak, yasaya uymak, kotuye kullanimi onlemek veya talebine cevap vermek icin paylasilir.",
          "Ucuncu taraf servisler kullanildiginda yalnizca sunduklari ozellik icin gerekli veriyi almalidir."
        ]
      },
      {
        title: "Saklama ve silme",
        body: [
          "Yerel calisma alani verisi kayitlari silene, yerel veriyi sifirlayana, app/browser deposunu temizleyene veya uygulamayi kaldirana kadar cihazinda kalir.",
          "Hesap sync verisi icin hesap e-postandan hello@omniacreata.com adresine yazip disa aktarma, duzeltme veya silme isteyebilirsin. Hesap sahipligini dogrulamamiz gerekebilir."
        ]
      },
      {
        title: "Secimlerin",
        body: [
          "Ayarlar'dan calisma alanini disa aktarabilir, uygulamayi hesapsiz kullanabilir, AI ozelliklerini kullanmayabilir, hassas bilgi girmeyebilir, yerel veriyi silebilir veya hesap verisi talepleri icin bize yazabilirsin.",
          "Bulundugun bolge ek gizlilik haklari veriyorsa bizimle iletisime gec; talebi uygulanabilir hukuka gore ele aliriz."
        ]
      },
      {
        title: "Cocuklar",
        body: [
          "OmniaPrompt cocuklar icin tasarlanmamistir. Ulkende yazilim servislerini veli izni olmadan kullanmak icin yeterli yasta degilsen uygulamayi kullanma."
        ]
      },
      {
        title: "Politika degisiklikleri",
        body: [
          "Urun degistikce bu politikayi guncelleyebiliriz. Onemli degisiklikler ilgili davranis kullanilmadan once uygulama veya magaza listesinde gorunmelidir."
        ]
      }
    ]
  }
} as const;

export default async function PrivacyPage({
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
