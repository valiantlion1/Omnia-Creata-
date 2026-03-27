import { AppPage, Surface } from '@/components/StudioPrimitives'

const sections = [
  {
    id: 'faq',
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      ['What is Studio?', 'Studio is Omnia Creata’s visual workspace for exploring, creating, editing, and organizing image-based work.'],
      ['What is the difference between Chat and Create?', 'Chat helps you think through a prompt or edit plan. Create is for direct generation and controlled image work.'],
      ['Can I use local models?', 'Yes. Owner mode can expose local checkpoints and route jobs through your machine.'],
    ],
  },
  {
    id: 'terms',
    eyebrow: 'Terms',
    title: 'Terms of use',
    items: [
      ['Usage', 'You may use Studio for lawful visual creation and editing within the limits of your plan and credits.'],
      ['Accounts', 'You are responsible for activity under your account and for securing your access credentials.'],
      ['Availability', 'Features, models, and limits can change as the product evolves.'],
    ],
  },
  {
    id: 'privacy',
    eyebrow: 'Privacy',
    title: 'Privacy',
    items: [
      ['Profile data', 'We store account details needed to operate access, billing, projects, and media history.'],
      ['Uploads', 'Uploaded files and generated outputs may be stored so they remain available in your library and project history.'],
      ['Control', 'Privacy, retention, and deletion behavior should be surfaced clearly in account and library controls.'],
    ],
  },
  {
    id: 'policy',
    eyebrow: 'Policy',
    title: 'Usage policy',
    items: [
      ['Safe use', 'Do not use Studio for illegal, abusive, deceptive, or harmful content workflows.'],
      ['Ownership', 'Respect the rights of third parties when uploading references, logos, faces, brands, or copyrighted material.'],
      ['Enforcement', 'Access, features, and quotas may be restricted when usage violates policy or platform rules.'],
    ],
  },
]

export default function DocumentationPage() {
  return (
    <AppPage className="max-w-[1320px]">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Documentation</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[2rem]">Documentation</h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Surface tone="muted" className="h-fit">
          <div className="space-y-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
              >
                {section.eyebrow}
              </a>
            ))}
          </div>
        </Surface>

        <div className="space-y-5">
          {sections.map((section) => (
            <Surface key={section.id} id={section.id} tone="muted">
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{section.eyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{section.title}</h2>
              <div className="mt-4 divide-y divide-white/[0.06] rounded-[20px] border border-white/[0.06] bg-black/20">
                {section.items.map(([label, body]) => (
                  <div key={label} className="px-4 py-3.5">
                    <div className="text-sm font-medium text-white">{label}</div>
                    <div className="mt-1 text-sm leading-6 text-zinc-400">{body}</div>
                  </div>
                ))}
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </AppPage>
  )
}
