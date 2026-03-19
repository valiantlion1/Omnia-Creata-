import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "Privacy",
    title: "Nolra keeps your beta usage lightweight and intentional.",
    intro:
      "Nolra currently stores beta data in your local Nolra first. Account sync, ads, and future AI upgrades are introduced gradually and documented before they are enabled for your account.",
    sections: [
      {
        title: "What data Nolra stores",
        body: "Entries, projects, preferences, and version history created inside the product. Beta builds may also keep local sync metadata so your offline work is not lost."
      },
      {
        title: "What is not enabled by default",
        body: "AI processing, paid Pro features, and aggressive cloud syncing stay disabled unless explicitly enabled in the product runtime."
      },
      {
        title: "Ads and analytics",
        body: "Beta may show lightweight ad placeholders and later ad integrations. Production data safety disclosures will be updated before a real ad network is enabled."
      },
      {
        title: "Contact",
        body: "Privacy and store questions can be routed through Omnia Creata while the policy matures for the public release."
      }
    ]
  },
  tr: {
    eyebrow: "Gizlilik",
    title: "Nolra beta kullanimini hafif ve kontrollu tutar.",
    intro:
      "Nolra su anda beta verilerini once lokal kasanda tutar. Hesap sync, reklamlar ve ilerideki AI gelistirmeleri ancak aktif edilmeden once belgelenir.",
    sections: [
      {
        title: "Nolra hangi verileri tutar",
        body: "Urun icinde olusturdugun kayitlar, projeler, tercihler ve versiyon gecmisi. Offline calismalar kaybolmasin diye lokal sync metadata'si da tutulabilir."
      },
      {
        title: "Varsayilan olarak acik olmayanlar",
        body: "AI isleme, ucretli Pro ozellikleri ve agresif cloud sync, runtime tarafinda acik edilmedigi surece kapali kalir."
      },
      {
        title: "Reklam ve analiz",
        body: "Beta yalnizca hafif reklam placeholder'lari gosterebilir. Gercek reklam agi aktif edilmeden once veri guvenligi beyanlari guncellenir."
      },
      {
        title: "Iletisim",
        body: "Gizlilik ve store sorulari, public release oncesinde Omnia Creata uzerinden yonetilir."
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
        </div>

        <div className="grid gap-6">
          {content.sections.map((section) => (
            <Surface key={section.title} className="space-y-3 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {section.title}
              </h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{section.body}</p>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

