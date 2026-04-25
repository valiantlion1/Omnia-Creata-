import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "How OmniaPrompt works",
    title: "Capture first. Organize lightly. Revisit when it matters.",
    description:
      "OmniaPrompt is built for people who think in motion. The flow stays simple so you can save now and shape later.",
    steps: [
      {
        title: "1. Capture quickly",
        description: "Open the app, write the idea, choose a type if needed, and save without slowing down."
      },
      {
        title: "2. Add structure later",
        description: "Turn quick notes into project entries with tags, categories, and cleaner titles when you have time."
      },
      {
        title: "3. Keep refining",
        description: "Return to the same entry over time, keep versions, and build something reusable instead of scattered fragments."
      },
      {
        title: "4. Add more when you need it",
        description: "Use the free workspace first. Paid or AI-powered features appear only when they are available and clearly explained."
      }
    ]
  },
  tr: {
    eyebrow: "OmniaPrompt nasil calisir",
    title: "Once kaydet. Hafifce duzenle. Gerektiginde geri don.",
    description:
      "OmniaPrompt hareket halindeyken dusunen insanlar icin tasarlandi. Akis basit kalir; hemen kaydet, sonra sekillendir.",
    steps: [
      {
        title: "1. Hizlica kaydet",
        description: "Uygulamayi ac, fikri yaz, gerekiyorsa tip sec ve yavaslamadan kaydet."
      },
      {
        title: "2. Yapilandirmayi sonra ekle",
        description: "Hizli notlari zaman buldugunda proje kayitlarina, etiketlere ve daha temiz basliklara donustur."
      },
      {
        title: "3. Zamanla gelistir",
        description: "Ayni kayda tekrar don, versiyonlarini koru ve daginik kirintilar yerine tekrar kullanilabilir bir sey olustur."
      },
      {
        title: "4. Gerektiginde fazlasini ekle",
        description: "Once ucretsiz calisma alanini kullan. Ucretli veya AI destekli ozellikler yalnizca kullanima acildiginda ve net aciklandiginda gorunur."
      }
    ]
  }
} as const;

export default async function HowItWorksPage({
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
            {content.description}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {content.steps.map((step) => (
            <Surface key={step.title} className="space-y-3 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {step.title}
              </h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {step.description}
              </p>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

