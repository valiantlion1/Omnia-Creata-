import { Badge, Surface } from "@/components/ui/primitives";
import { MarketingShell } from "@/components/site/marketing-shell";
import { assertLocale } from "@/lib/locale";

const copy = {
  en: {
    eyebrow: "OmniaPrompt features",
    title: "Built for fast capture, clean organization, and daily reuse.",
    description:
      "OmniaPrompt keeps the flow focused: capture ideas quickly, organize them into projects, and return without fighting a bloated workspace.",
    features: [
      {
        title: "Fast capture",
        description: "Save ideas, prompts, notes, workflows, and research fragments in seconds."
      },
      {
        title: "Project-aware library",
        description: "Keep entries grouped by project, category, and tag without losing browsing speed."
      },
      {
        title: "Offline-first flow",
        description: "Keep capturing locally first, then connect cloud sync when you are ready."
      },
      {
        title: "Version-friendly editing",
        description: "Keep refining important entries over time instead of overwriting the original."
      },
      {
        title: "Lightweight mobile UI",
        description: "Designed to feel calmer and faster than heavy productivity tools on mobile."
      },
      {
        title: "AI-ready foundation",
        description: "AI help is shown only when it is available, so the core app stays fast and predictable."
      }
    ]
  },
  tr: {
    eyebrow: "OmniaPrompt ozellikleri",
    title: "Hizli capture, temiz duzen ve gunluk tekrar kullanim icin tasarlandi.",
    description:
      "OmniaPrompt ilk surumde odagi dar tutar: fikirleri hizlica kaydet, projelerde duzenle ve agir bir workspace ile ugrasmadan geri don.",
    features: [
      {
        title: "Hizli capture",
        description: "Fikirleri, promptlari, notlari, workflow'lari ve arastirma kirintilarini saniyeler icinde kaydet."
      },
      {
        title: "Proje odakli kutuphane",
        description: "Kayitlarini proje, kategori ve etiketlere gore grupla; gezinme hizini kaybetme."
      },
      {
        title: "Offline-oncelikli akis",
        description: "Once lokal kaydet, hazir oldugunda cloud sync bagla."
      },
      {
        title: "Versiyon dostu editor",
        description: "Onemli kayitlari ustune yazmak yerine zamanla gelistir."
      },
      {
        title: "Hafif mobil arayuz",
        description: "Mobilde agir productivity araclarindan daha sakin ve daha hizli hissettirecek sekilde tasarlandi."
      },
      {
        title: "AI hazir temel",
        description: "AI yardimi yalnizca kullanima acildiginda gorunur; cekirdek app hizli ve ongorulebilir kalir."
      }
    ]
  }
} as const;

export default async function FeaturesPage({
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {content.features.map((feature) => (
            <Surface key={feature.title} className="space-y-3 p-6">
              <h2 className="font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {feature.title}
              </h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {feature.description}
              </p>
            </Surface>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

