import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "Terms",
    title: "Nolra beta is offered as an evolving product workspace.",
    intro:
      "The beta is intentionally narrow: fast capture, projects, local persistence, and version-aware editing. Some features shown in the product are marked as coming soon and may change before public release.",
    sections: [
      {
        title: "Beta scope",
        body: "Nolra beta is provided for testing the core workflow: capture, organize, revisit, and refine entries in a lightweight system."
      },
      {
        title: "No guarantee of permanent availability",
        body: "Features, limits, naming, visuals, and integrations may change while the product is still in beta."
      },
      {
        title: "Account and local usage",
        body: "Guest mode may keep data locally on device. Signed-in experiences may later add sync and entitlement checks as the infrastructure matures."
      },
      {
        title: "Commercial terms",
        body: "The beta may remain free or ad-supported. Pro and paid AI features are presented only as future roadmap items unless explicitly enabled."
      }
    ]
  },
  tr: {
    eyebrow: "Kosullar",
    title: "Nolra beta gelisen bir urun calisma alani olarak sunulur.",
    intro:
      "Beta bilerek dar tutulur: hizli capture, projeler, lokal kalicilik ve versiyon farkindalikli duzenleme. Urunde gorunen bazi ozellikler yakinda etiketiyle gelir ve yayin oncesi degisebilir.",
    sections: [
      {
        title: "Beta kapsami",
        body: "Nolra beta; capture, duzenleme, geri donme ve yeniden kullanma akislarini test etmek icin sunulur."
      },
      {
        title: "Kalici erisilebilirlik garantisi yoktur",
        body: "Ozellikler, limitler, isimlendirme, gorsel dil ve entegrasyonlar beta surecinde degisebilir."
      },
      {
        title: "Hesap ve lokal kullanim",
        body: "Misafir mod veriyi cihazda lokal tutabilir. Girisli deneyimlere ileride sync ve entitlement kontrolleri eklenebilir."
      },
      {
        title: "Ticari kosullar",
        body: "Beta ucretsiz veya reklam destekli kalabilir. Pro ve ucretli AI ozellikleri ancak acikca aktif edildiginde kullanima sunulur."
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

