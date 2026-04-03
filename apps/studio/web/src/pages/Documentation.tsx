import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter } from '@/components/StudioPrimitives'

type HelpItem = { title: string; body: string }
type HelpSection = { id: string; label: string; title: string; intro: string; lastUpdated?: string; items: HelpItem[] }

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'Start with the surfaces that matter.',
    intro: 'OmniaCreata keeps the core flow simple: browse, compose, chat, and keep the results organized.',
    items: [
      { title: 'Explore', body: 'Browse public work, trending directions, and style-driven examples before you start making your own. No account required.' },
      { title: 'Compose', body: 'Write a prompt, pick a model, choose the aspect ratio, and generate. The interface stays clean so you can focus on the creative work.' },
      { title: 'Chat', body: 'Use Chat when you want prompt help, edit direction, or a more guided creative workflow. You can upload images and have the AI help you refine or reimagine them.' },
      { title: 'Library', body: 'My Images, Collections, Favorites, and Trash keep every result tied to your account. Organize your work into projects, search by prompt or style, and revisit anything.' },
      { title: 'Profile', body: 'Your public profile showcases your published work. You control what is visible and what stays private. Other users can discover your work through Explore.' },
      { title: 'Subscription', body: 'View plan details, compare tiers, and manage credit top-ups. Pricing is always visible — even before sign-up.' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Frequently asked questions',
    intro: 'Short answers for the questions people usually ask before they trust a new creative platform.',
    items: [
      { title: 'Do I need an account to look around?', body: 'No. Landing, Help, Explore, and public profiles can be viewed without signing up. Only generation and personal features require an account.' },
      { title: 'What requires sign in?', body: 'Compose, Chat, personal Library areas, Subscription management, Account settings, and private settings all require authentication.' },
      { title: 'Can I keep my work private?', body: 'Yes. You can mark any generation as private, and you can set your default visibility preference in Account settings. Private work is only visible to you.' },
      { title: 'How do credits work?', body: 'Every generation costs a set number of credits depending on the model. Free accounts receive a monthly allowance that resets on cycle. Pro and Creator tiers include more credits and can purchase top-ups.' },
      { title: 'What models are available?', body: 'OmniaCreata offers multiple generation models with different strengths. Core models are available to all plans. Advanced and early-access models unlock with higher tiers.' },
      { title: 'Can I use generated images commercially?', body: 'Commercial usage rights are included in Pro and Creator plans. Free tier images are for personal/non-commercial use. Check the Usage Policy for detailed terms.' },
      { title: 'How do I delete my account?', body: 'You can request account deletion through your Account settings page. All data, including generated images and personal information, will be permanently removed within 30 days.' },
      { title: 'Is there an API?', body: 'API access is planned for the Creator tier and will be available in a future release. Join the waitlist through your account dashboard.' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety and platform integrity',
    intro: 'We are committed to providing a safe, responsible platform for creative expression. The following guidelines define our approach to safety and content moderation.',
    items: [
      { title: 'Content moderation', body: 'All generated content passes through automated safety checks. Content that violates our policies may be flagged, blocked, or removed. Repeated violations may result in account restrictions.' },
      { title: 'Prohibited content', body: 'Content depicting or promoting violence, exploitation, hate speech, harassment, illegal activities, or non-consensual intimate imagery is strictly prohibited and will result in immediate account action.' },
      { title: 'Intellectual property', body: 'Respect brand identity, likeness rights, copyrighted material, and third-party intellectual property when uploading references or generating content. Do not create content designed to infringe on others\' rights.' },
      { title: 'Deepfakes and impersonation', body: 'Creating realistic depictions of identifiable individuals without their consent is prohibited. This includes political figures, celebrities, and private individuals.' },
      { title: 'Minor safety', body: 'Any content involving or sexualizing minors is absolutely prohibited, will be immediately removed, and will result in permanent account termination and reporting to relevant authorities.' },
      { title: 'Account responsibility', body: 'You are responsible for all activity on your account, including content generated, shared through links, and made publicly visible. Secure your credentials and report unauthorized access immediately.' },
      { title: 'Reporting', body: 'If you encounter content that violates our policies or discover a safety vulnerability, please report it through the support channel. We investigate all reports promptly.' },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'April 2026 (Draft — subject to final legal review)',
    intro: 'These Terms of Service ("Terms") govern your access to and use of OmniaCreata ("the Service"). By accessing or using the Service, you agree to be bound by these Terms.',
    items: [
      { title: '1. Acceptance of Terms', body: 'By creating an account, accessing, or using OmniaCreata, you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and our Usage Policy. If you do not agree, you must not use the Service.' },
      { title: '2. Eligibility', body: 'You must be at least 18 years old, or the age of majority in your jurisdiction, to use the Service. By using OmniaCreata, you represent and warrant that you meet these eligibility requirements.' },
      { title: '3. Account Registration', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.' },
      { title: '4. Service Description', body: 'OmniaCreata provides AI-powered image generation tools, a creative workspace, and community features. The Service includes but is not limited to: image generation (Compose), AI-assisted creative chat (Chat), image library management, public galleries, and subscription management.' },
      { title: '5. Credits and Billing', body: 'Access to generation features requires credits. Free accounts receive a monthly credit allowance. Paid subscriptions provide additional credits, features, and priority access. Credit purchases and subscription fees are non-refundable except as required by applicable law.' },
      { title: '6. Content Ownership', body: 'You retain ownership of the prompts and reference materials you provide. Generated images are licensed to you according to your subscription tier. Free tier outputs are licensed for personal use. Pro and Creator tier outputs include commercial usage rights, subject to the restrictions in our Usage Policy.' },
      { title: '7. Acceptable Use', body: 'You agree to use the Service in compliance with all applicable laws and our Usage Policy. You may not use the Service to generate content that is illegal, harmful, deceptive, or violates the rights of others. We reserve the right to remove content and restrict accounts that violate these terms.' },
      { title: '8. Service Availability', body: 'We strive to maintain high availability but do not guarantee uninterrupted access. The Service, including available models, quotas, speed, and features, may change as the platform evolves. We will provide reasonable notice of material changes when possible.' },
      { title: '9. Termination', body: 'We may suspend or terminate your account if you violate these Terms, our Usage Policy, or engage in conduct that we determine is harmful to the Service or its users. You may terminate your account at any time through the Account settings page.' },
      { title: '10. Limitation of Liability', body: 'To the maximum extent permitted by applicable law, OmniaCreata and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.' },
      { title: '11. Changes to Terms', body: 'We reserve the right to modify these Terms at any time. Material changes will be communicated through the Service or via email. Your continued use of the Service after changes take effect constitutes acceptance of the modified Terms.' },
      { title: '12. Governing Law', body: 'These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which OmniaCreata operates, without regard to conflict of law principles.' },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2026 (Draft — subject to final legal review)',
    intro: 'This Privacy Policy describes how OmniaCreata ("we", "us", "our") collects, uses, stores, and protects your personal information when you use our Service.',
    items: [
      { title: '1. Information We Collect', body: 'We collect information you provide directly: account registration details (name, email, password), profile information (display name, bio, avatar), prompts and generation parameters, uploaded reference images, and billing information for paid subscriptions.' },
      { title: '2. Automatically Collected Data', body: 'We automatically collect certain technical information including: device type and browser information, IP address and approximate location, usage patterns and feature interactions, error logs and performance data. This data helps us improve the Service and diagnose issues.' },
      { title: '3. How We Use Your Information', body: 'We use collected information to: provide and maintain the Service, process transactions and manage subscriptions, improve our AI models and user experience, communicate service updates and important notices, enforce our Terms and Usage Policy, and comply with legal obligations.' },
      { title: '4. Generated Content Storage', body: 'Images you generate are stored securely and associated with your account. Private images are accessible only to you. Public images may appear in Explore and on your public profile. You can delete your generated images at any time through the Library.' },
      { title: '5. Data Sharing', body: 'We do not sell your personal information. We may share information with: service providers who assist in operating the Service (hosting, payment processing), law enforcement when required by valid legal process, parties involved in a merger, acquisition, or asset sale, with user consent for specific purposes.' },
      { title: '6. Data Security', body: 'We implement industry-standard security measures to protect your information, including encryption in transit and at rest, secure authentication protocols, and regular security assessments. However, no method of transmission over the Internet is 100% secure.' },
      { title: '7. Data Retention', body: 'We retain your account data for as long as your account is active. Upon account deletion, personal data and generated content will be removed within 30 days. Aggregated, anonymized data may be retained for analytics and service improvement purposes.' },
      { title: '8. Your Rights', body: 'Depending on your jurisdiction, you may have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to or restrict processing, data portability, and withdraw consent where processing is based on consent.' },
      { title: '9. Cookies and Tracking', body: 'We use essential cookies for authentication and session management. We may use analytics cookies to understand usage patterns. You can control cookie preferences through your browser settings.' },
      { title: '10. Children\'s Privacy', body: 'The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we become aware of such collection, we will take steps to delete the information promptly.' },
      { title: '11. International Transfers', body: 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable data protection laws.' },
      { title: '12. Policy Updates', body: 'We may update this Privacy Policy periodically. Material changes will be communicated through the Service or via email. The "Last Updated" date reflects the most recent revision.' },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Acceptable Use Policy',
    lastUpdated: 'April 2026 (Draft — subject to final legal review)',
    intro: 'This Acceptable Use Policy outlines the rules and guidelines for using OmniaCreata. It exists to protect our users, our platform, and the broader community.',
    items: [
      { title: '1. General Principles', body: 'OmniaCreata is designed for legitimate creative work. Use the platform responsibly, respect others\' rights, and contribute positively to the community. The creative freedom we offer comes with the responsibility to use it ethically.' },
      { title: '2. Prohibited Content Categories', body: 'You may not use the Service to generate: sexually explicit or pornographic content, content sexualizing or exploiting minors, realistic violence or gore, content promoting terrorism or extremism, hate speech targeting protected groups, content designed to harass or bully specific individuals.' },
      { title: '3. Deceptive and Misleading Use', body: 'Do not use OmniaCreata to create: misleading or fraudulent content, deepfakes or convincing impersonations without consent, fake news or disinformation, deceptive marketing materials, content designed to manipulate or deceive others.' },
      { title: '4. Intellectual Property Compliance', body: 'Respect the intellectual property rights of others. Do not: upload copyrighted materials you don\'t have rights to use, generate content that infringes on trademarks or brands, create derivative works without appropriate authorization, circumvent content attribution requirements.' },
      { title: '5. Technical Restrictions', body: 'You may not: attempt to reverse engineer or extract our AI models, use automated tools to scrape or harvest content, exceed rate limits or abuse the credit system, attempt to bypass safety filters or content moderation, share account credentials or resell access.' },
      { title: '6. Commercial Use Guidelines', body: 'Commercial usage rights vary by subscription tier. Free tier outputs are for personal and non-commercial use only. Pro and Creator tier outputs may be used commercially, subject to: not creating competing AI services, respecting third-party rights, maintaining attribution where required.' },
      { title: '7. Community Standards', body: 'When sharing work publicly: provide accurate descriptions, respect other creators\' styles and ideas, do not spam or flood public galleries, report policy violations when you see them, engage constructively with the community.' },
      { title: '8. Enforcement and Consequences', body: 'Violations of this policy may result in: content removal, temporary account suspension, permanent account termination, reporting to law enforcement where applicable. The severity of action depends on the nature and frequency of violations.' },
      { title: '9. Appeals Process', body: 'If you believe enforcement action was taken in error, you may submit an appeal through the support channel. Appeals will be reviewed within a reasonable timeframe, and we will communicate the outcome.' },
      { title: '10. Policy Updates', body: 'This policy may be updated to reflect changes in our Service, legal requirements, or community standards. We will notify users of material changes through the Service or via email.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Contact and support',
    intro: 'We are building out our support infrastructure. Here is how to reach us.',
    items: [
      { title: 'General support', body: 'For product questions, account issues, or technical problems, contact us at support@omniacreata.com. Response times may vary during the alpha period.' },
      { title: 'Policy and safety reports', body: 'To report content violations, safety concerns, or abuse, email safety@omniacreata.com. Include relevant details and screenshots when possible. All reports are investigated promptly and confidentially.' },
      { title: 'Business inquiries', body: 'For partnership, enterprise, or press inquiries, reach out to business@omniacreata.com.' },
      { title: 'Legal requests', body: 'Legal notices and law enforcement requests should be directed to legal@omniacreata.com.' },
    ],
  },
]

/* ─── Accordion Item ─── */
function AccordionItem({ item, defaultOpen = false }: { item: HelpItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="text-sm font-medium text-white">{item.title}</div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '300px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="pb-4 text-sm leading-7 text-zinc-400">{item.body}</div>
      </div>
    </div>
  )
}

export default function DocumentationPage() {
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  return (
    <>
      {!canRenderWithShell && (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07111a]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
            <Link to="/landing" className="flex items-center gap-3">
              <img src="/omnia-crest.png" alt="OmniaCreata" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
              </div>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-300">
              <Link to="/explore" className="transition hover:text-white">Explore</Link>
              <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
              <Link to="/help" className="text-white">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90">Start Free</Link>
            </nav>
          </div>
        </header>
      )}
    <AppPage className="max-w-[1380px] gap-10 py-8">
      <section className="border-b border-white/[0.06] pb-8">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Help & Legal</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            The essential guide to how OmniaCreata works.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Help stays public on purpose. People should be able to understand the product, its boundaries, and its policies before they ever create an account.
          </p>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-10 xl:h-fit">
          <div className="space-y-1 border-l border-white/[0.06] pl-4">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block py-1.5 text-sm text-zinc-500 transition hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="border-b border-white/[0.06] pb-10 last:border-b-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">{section.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{section.title}</div>
              {section.lastUpdated ? (
                <div className="mt-2 text-xs text-zinc-600">Last updated: {section.lastUpdated}</div>
              ) : null}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{section.intro}</p>

              {/* Use accordion for legal sections, grid for others */}
              {['terms', 'privacy', 'usage-policy'].includes(section.id) ? (
                <div className="mt-6 rounded-[16px] border border-white/[0.06] bg-white/[0.01] px-5">
                  {section.items.map((item, i) => (
                    <AccordionItem key={item.title} item={item} defaultOpen={i === 0} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {section.items.map((item) => (
                    <div key={item.title} className="grid gap-3 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="text-sm leading-7 text-zinc-400">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {!canRenderWithShell ? <LegalFooter /> : null}
    </AppPage>
    </>
  )
}
