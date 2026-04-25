import { support } from "@prompt-vault/config";
import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "Help",
    title: "How to use OmniaPrompt safely and quickly.",
    intro:
      "This help page covers the day-to-day workflow, backups, account sync, AI availability, installation, and the fastest way to recover when something feels off.",
    sections: [
      {
        title: "Start without an account",
        items: [
          "Open the app and choose guest/local use if you do not want to sign in.",
          "Your workspace is stored on the current device until you export, sync, reset, clear storage, or uninstall.",
          "Use local mode for fast capture, but export important work before changing devices."
        ]
      },
      {
        title: "Capture an idea",
        items: [
          "Use Capture when the idea matters more than structure.",
          "Add a short title, write the prompt or note body, and save.",
          "You can add project, category, tags, source links, variables, result notes, and rating later."
        ]
      },
      {
        title: "Organize your library",
        items: [
          "Use Library search to find entries by title, body, tag, project, category, or platform.",
          "Use Projects for larger contexts such as launches, clients, research streams, content systems, or image labs.",
          "Favorite reliable entries so they stay close when you need to reuse them."
        ]
      },
      {
        title: "Versions, drafts, and recovery",
        items: [
          "Editor changes can be saved as new versions so useful history is not overwritten.",
          "Drafts are stored locally while you work, which helps recover unfinished writing on the same device.",
          "If a page looks stale, refresh once before resetting local data."
        ]
      },
      {
        title: "Export and backup",
        items: [
          "Open Settings and export as JSON, Markdown, or TXT.",
          "JSON is best for keeping structured app data. Markdown and TXT are better for reading or moving text elsewhere.",
          "Keep a separate copy of important work before clearing app storage or reinstalling."
        ]
      },
      {
        title: "Account sync",
        items: [
          "Account sync is optional and may not be available in every environment.",
          "When sync is active, entries can be restored across sessions or devices tied to the account.",
          "If sync is not active, the app will keep you in local mode instead of blocking capture."
        ]
      },
      {
        title: "AI help",
        items: [
          "AI help appears only when it is available for the workspace.",
          "Review AI suggestions before applying them. Suggestions are helpers, not final decisions.",
          "Avoid sending passwords, secrets, private health data, payment details, or confidential client material to AI tools."
        ]
      },
      {
        title: "Install on web or Android",
        items: [
          "On supported browsers, use the install button or browser menu to add OmniaPrompt to your device.",
          "The Android app uses the same workspace experience and should be tested with the production domain before store release.",
          "If install is unavailable, keep using the web app directly from the browser."
        ]
      },
      {
        title: "Troubleshooting",
        items: [
          "If the screen is blank, refresh the page and check your connection.",
          "If local data seems missing, make sure you are using the same browser profile and device.",
          "If account sync is active but data looks old, wait a moment, refresh, and then contact support if the issue remains."
        ]
      },
      {
        title: "Delete or request data help",
        items: [
          "Local data can be removed by deleting entries, resetting local workspace data, clearing browser/app storage, or uninstalling the app.",
          "For account data, email support from the account address and ask for export, correction, or deletion.",
          "Include the device, browser, app route, and a short description of the issue if you need help."
        ]
      }
    ],
    contactTitle: "Need help?",
    contactBody: `Email ${support.email} with the route you were using, what you expected, and what happened.`
  },
  tr: {
    eyebrow: "Yardim",
    title: "OmniaPrompt'u hizli ve guvenli kullanma rehberi.",
    intro:
      "Bu yardim sayfasi gunluk akisi, yedekleri, hesap esitlemesini, AI durumunu, yuklemeyi ve bir sey ters hissettiginde en hizli toparlanma yolunu anlatir.",
    sections: [
      {
        title: "Hesapsiz basla",
        items: [
          "Giris yapmak istemiyorsan uygulamayi ac ve misafir/yerel kullanimla devam et.",
          "Calisma alanin disa aktarana, sync acana, sifirlayana, depoyu temizleyene veya uygulamayi kaldirana kadar mevcut cihazda saklanir.",
          "Hizli capture icin yerel modu kullanabilirsin; cihaz degistirmeden once onemli isleri disa aktar."
        ]
      },
      {
        title: "Fikir yakala",
        items: [
          "Fikir yapidan daha onemliyse Capture ekranini kullan.",
          "Kisa bir baslik ekle, prompt veya not govdesini yaz ve kaydet.",
          "Proje, kategori, etiket, kaynak linki, degisken, sonuc notu ve puani daha sonra ekleyebilirsin."
        ]
      },
      {
        title: "Kutuphaneyi duzenle",
        items: [
          "Library aramasi baslik, govde, etiket, proje, kategori veya platforma gore kayit bulmana yardim eder.",
          "Projects alanini lansman, musteri, arastirma akisi, icerik sistemi veya gorsel lab gibi daha buyuk baglamlar icin kullan.",
          "Tekrar kullanacagin guvenilir kayitlari favorilere ekle."
        ]
      },
      {
        title: "Surumler, taslaklar ve kurtarma",
        items: [
          "Editor degisiklikleri yeni surum olarak kaydedilebilir; boylece faydali gecmis ezilmez.",
          "Taslaklar calisirken yerelde saklanir ve ayni cihazda yarim kalan yaziyi kurtarmaya yardim eder.",
          "Sayfa eski gorunuyorsa yerel veriyi sifirlamadan once bir kez yenile."
        ]
      },
      {
        title: "Disa aktar ve yedekle",
        items: [
          "Settings ekranindan JSON, Markdown veya TXT olarak disa aktar.",
          "JSON yapili app verisini korumak icin en iyisidir. Markdown ve TXT okumak veya metni baska yere tasimak icin daha uygundur.",
          "Depoyu temizlemeden veya uygulamayi yeniden kurmadan once onemli islerin ayri bir kopyasini tut."
        ]
      },
      {
        title: "Hesap esitlemesi",
        items: [
          "Hesap esitlemesi opsiyoneldir ve her ortamda acik olmayabilir.",
          "Sync aktifken kayitlar hesaba bagli oturumlar veya cihazlar arasinda geri yuklenebilir.",
          "Sync aktif degilse uygulama capture'i engellemek yerine seni yerel modda tutar."
        ]
      },
      {
        title: "AI yardimi",
        items: [
          "AI yardimi yalnizca calisma alani icin kullanima acildiginda gorunur.",
          "AI onerilerini uygulamadan once kontrol et. Oneriler yardimcidir, son karar degildir.",
          "Sifre, sir, ozel saglik verisi, odeme bilgisi veya gizli musteri materyalini AI araclarina gonderme."
        ]
      },
      {
        title: "Web veya Android'e yukle",
        items: [
          "Desteklenen browserlarda yukle butonunu veya browser menusunu kullanarak OmniaPrompt'u cihaza ekleyebilirsin.",
          "Android app ayni calisma alani deneyimini kullanir ve store yayinindan once production domain ile test edilmelidir.",
          "Yukleme secenegi yoksa web uygulamasini dogrudan browserdan kullanmaya devam et."
        ]
      },
      {
        title: "Sorun giderme",
        items: [
          "Ekran bos kalirsa sayfayi yenile ve baglantini kontrol et.",
          "Yerel veri eksik gorunuyorsa ayni browser profili ve ayni cihazda oldugundan emin ol.",
          "Hesap sync aktif ama veri eski gorunuyorsa biraz bekle, yenile ve sorun devam ederse destekle iletisime gec."
        ]
      },
      {
        title: "Silme veya veri destegi isteme",
        items: [
          "Yerel veri kayitlari silerek, yerel calisma alanini sifirlayarak, browser/app deposunu temizleyerek veya uygulamayi kaldirarak silinebilir.",
          "Hesap verisi icin hesap e-postandan destek adresine yazip disa aktarma, duzeltme veya silme isteyebilirsin.",
          "Yardim istiyorsan cihaz, browser, app route ve kisa sorun aciklamasini ekle."
        ]
      }
    ],
    contactTitle: "Yardim lazim mi?",
    contactBody: `${support.email} adresine kullandigin route'u, ne bekledigini ve ne oldugunu yaz.`
  }
} as const;

export default async function HelpPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = assertLocale(locale);
  const content = copy[safeLocale];

  return (
    <MarketingShell locale={safeLocale}>
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 md:px-6 lg:py-20">
        <div className="space-y-4 text-center">
          <Badge tone="accent">{content.eyebrow}</Badge>
          <h1 className="font-display text-5xl tracking-[-0.06em] text-[var(--text-primary)]">
            {content.title}
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
            {content.intro}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {content.sections.map((section) => (
            <Surface key={section.title} className="space-y-4 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-[var(--text-secondary)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </div>

        <Surface className="space-y-3 p-6 text-center">
          <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {content.contactTitle}
          </h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{content.contactBody}</p>
        </Surface>
      </section>
    </MarketingShell>
  );
}
