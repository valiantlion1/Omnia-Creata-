import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import { AppShellHeader } from "@/components/app/app-shell-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { DemoModeBanner } from "@/components/app/demo-mode-banner";
import { getAppShellState } from "@/lib/server/app-data";
import { getDevicePipelineMode } from "@/lib/runtime";

export default async function DashboardLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const shell = await getAppShellState(locale);
  const devicePipelineMode = getDevicePipelineMode();

  return (
    <div className="min-h-screen px-3 py-3 lg:px-4 lg:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1640px] flex-col overflow-hidden rounded-[34px] border border-line/50 bg-[#09101d]/90 shadow-[0_30px_120px_rgba(3,7,18,0.6)] backdrop-blur-xl">
        <AppShellHeader
          devicePipelineMode={devicePipelineMode}
          dictionary={dictionary}
          locale={locale}
          shell={shell}
        />
        <div className="grid min-h-0 flex-1 lg:grid-cols-[290px_minmax(0,1fr)]">
          <AppSidebar
            devicePipelineMode={devicePipelineMode}
            dictionary={dictionary}
            locale={locale}
            shell={shell}
          />
          <main className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(16,24,40,0.5),rgba(9,16,29,0.86))] p-3 lg:p-5">
            <div className="space-y-4">
              <DemoModeBanner dictionary={dictionary} mode={shell.mode} />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
