import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles, HelpCircle, ShieldCheck, FileText, Lock, ShieldAlert, Mail } from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter } from '@/components/StudioPrimitives'

type HelpItem = { title: string; body: string }
type HelpSectionId = 'getting-started' | 'faq' | 'safety' | 'terms' | 'privacy' | 'usage-policy' | 'contact'
type HelpSection = { id: HelpSectionId; label: string; title: string; intro: string; lastUpdated?: string; items: HelpItem[] }

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'How it works',
    intro: 'Omnia Creata is an AI image studio. Browse, create, chat, and organize — all in one place.',
    items: [
      { title: 'Explore', body: 'Browse public creations, trending styles, and community work. No account needed.' },
      { title: 'Create', body: 'Describe what you want, and we\'ll generate it. You can fine-tune settings like aspect ratio and model if you want, or just hit Generate.' },
      { title: 'Chat', body: 'Have a conversation with AI to get prompt ideas, refine images, or explore creative directions. You can upload photos and ask for edits right in the chat.' },
      { title: 'Library', body: 'All your images are saved automatically. Organize them into collections, mark favorites, and manage everything from one place.' },
      { title: 'Profile', body: 'Your public portfolio. Choose what to share and what stays private.' },
      { title: 'Plans', body: 'See pricing, compare plans, and manage your subscription anytime.' },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Common questions',
    intro: 'Quick answers to the things people ask most.',
    items: [
      { title: 'Do I need an account?', body: 'Not to browse. You can explore public work and read about pricing without signing up. Creating images requires a free account.' },
      { title: 'Is it free?', body: 'Yes — free accounts get a monthly credit allowance. Paid plans include more credits and features like commercial usage rights.' },
      { title: 'How do credits work?', body: 'Each image costs a few credits depending on the model and quality. Your credits reset monthly, and you can always upgrade for more.' },
      { title: 'Can I use images commercially?', body: 'Pro and Creator plans include commercial rights. Free tier images are for personal use. Check the Usage Policy for details.' },
      { title: 'Can I keep my work private?', body: 'Absolutely. Set any image as private, or change your default visibility in Settings.' },
      { title: 'How do I delete my account?', body: 'Go to Settings → Account → Delete Account. All your data will be permanently removed within 30 days.' },
      { title: 'Is there an API?', body: 'Coming soon for Creator plan members. Join the waitlist from your dashboard.' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety & moderation',
    intro: 'We take content safety seriously. Here\'s how we keep the platform safe for everyone.',
    items: [
      { title: 'Content moderation', body: 'All generated content goes through automated safety checks. Violations may be flagged, blocked, or removed.' },
      { title: 'What\'s not allowed', body: 'Violence, exploitation, hate speech, harassment, illegal content, and non-consensual intimate imagery are strictly prohibited.' },
      { title: 'Intellectual property', body: 'Respect copyrights, trademarks, and likeness rights. Don\'t create content designed to infringe on others\' work.' },
      { title: 'Deepfakes', body: 'Creating realistic depictions of real people without their consent is prohibited.' },
      { title: 'Minor safety', body: 'Any content involving minors in inappropriate contexts is absolutely prohibited and will result in immediate, permanent action.' },
      { title: 'Reporting', body: 'See something wrong? Report it through the app or email safety@omniacreata.com. We investigate every report.' },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'April 2026',
    intro: 'By using Omnia Creata, you agree to these legally binding terms.',
    items: [
      { title: '1. Acceptance of Terms', body: 'By accessing or using the Omnia Creata platform, including our website, mobile applications, APIs, and associated services (collectively the "Service"), you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you may not access the Service. These terms constitute a legally binding agreement between you and Omnia Creata. We reserve the right to update or modify these terms at any time without prior notice, and your continued use of the platform after any such changes constitutes your acceptance of the new terms.' },
      { title: '2. Eligibility and Account Registration', body: 'To access certain features of the Service, you must register for an account. By creating an account, you represent and warrant that you are at least 18 years of age, or the applicable age of majority in your jurisdiction, and possess the legal capacity to enter into a binding contract. You are entirely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.' },
      { title: '3. Description of Services', body: 'Omnia Creata provides a platform offering artificial intelligence-based creative tools, including but not limited to image generation, conversational AI interfaces for prompt engineering, image library management, and public galleries. We continually innovate and may add, alter, or remove features, capabilities, or underlying models at our sole discretion without notice or liability. We do not guarantee that any specific generative model, feature, or service level will be available at all times.' },
      { title: '4. Credits and Subscription Billing', body: 'Certain features require the use of "Credits" or an active premium subscription. Free-tier accounts may receive a limited allocation of credits that refresh periodically. Paid subscription plans are billed in advance on a recurring basis (e.g., monthly or annually). All fees are non-refundable unless legally mandated by your jurisdiction. If you exhaust your credit balance, you will not be able to generate new media until your next billing cycle or until you purchase a top-up. We reserve the right to modify our pricing structure, credit consumption rates, and subscription tiers at any time.' },
      { title: '5. Intellectual Property and Content Ownership', body: 'You retain all ownership rights to the original text prompts, reference images, and other content you submit to the Service ("User Content"). Subject to these terms and your subscription tier, you are granted a license to use the images generated by the Service. Free tier outputs are strictly limited to personal, non-commercial use. Users on upgraded plans (e.g., Pro, Creator) receive a broad commercial license to use their generated outputs. However, due to the nature of machine learning, Omnia Creata does not guarantee that the generated images are entirely unique or free from third-party copyright claims. You are solely responsible for ensuring your use of the generated content does not infringe upon any third-party rights.' },
      { title: '6. Acceptable Use and Platform Conduct', body: 'You agree not to use the Service in any manner that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable. You are strictly prohibited from reverse-engineering the platform, scraping data, attempting to bypass safety filters, or using the Service to generate deepfakes, disinformation, or sexually explicit material. Violation of these rules will result in immediate account termination without refund and possible legal action.' },
      { title: '7. Limitation of Liability and Disclaimers', body: 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. Omnia Creata specifically disclaims any warranties of merchantability, fitness for a particular purpose, or non-infringement. In no event shall Omnia Creata, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use or inability to use the Service, including but not limited to loss of profits, data, or goodwill.' },
      { title: '8. Termination and Modification of Service', body: 'We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice or liability, for any reason, including but not limited to a breach of these Terms. Upon termination, your right to use the Service will immediately cease. Sections of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.' },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2026',
    intro: 'How we handle, store, and process your data.',
    items: [
      { title: '1. Information We Collect', body: 'When you use Omnia Creata, we collect several types of information. Personal Information: This includes your name, email address, payment details, and profile information provided during account creation. User Content: We store the text prompts, reference images, chat histories, and the final generated images associated with your account. Automatically Collected Data: We automatically capture technical data such as your IP address, browser type, device information, operating system, and usage statistics (e.g., interaction timestamps, clicked links, and feature usage) through cookies and similar tracking technologies.' },
      { title: '2. How We Use Your Information', body: 'We use the collected data to provide, maintain, and improve our services. Specifically, we use your information to: authenticate your identity, process subscription payments, deliver the AI image generation features, provide customer support, and communicate essential service updates. Additionally, we may use aggregated or anonymized interaction data and prompts to train, fine-tune, or otherwise improve our underlying machine learning models and content moderation systems, unless you have explicitly opted out through an eligible enterprise agreement.' },
      { title: '3. Data Sharing and Disclosure', body: 'Omnia Creata acts as a custodian of your data and does not sell your personal information to third parties. We only share data with trusted third-party service providers acting on our behalf to facilitate operations, such as cloud hosting providers, payment processors (e.g., Stripe), and analytics platforms. We may also disclose your information if required by law, subpoena, or other legal process, or if we believe in good faith that such disclosure is necessary to protect the rights, property, or safety of Omnia Creata, our users, or the public.' },
      { title: '4. User Content Visibility and Storage', body: 'Images generated on Omnia Creata are stored securely in our cloud infrastructure. By default, your generated images and associated prompts may be accessible in public galleries or community feeds to foster a collaborative creative environment. You maintain the ability to set specific images, or your entire account, to "Private" mode depending on your subscription tier. Private images are not surfaced in public timelines, but remain stored on our servers to allow you to manage your library.' },
      { title: '5. Data Security Measures', body: 'We implement robust, industry-standard technical and organizational measures designed to secure your personal information from accidental loss, unauthorized access, alteration, or disclosure. This includes encryption in transit (HTTPS) and encryption at rest. However, no data transmission over the internet or out-of-band storage system is guaranteed to be 100% secure, and you acknowledge that you provide your information at your own risk.' },
      { title: '6. Your Rights and Data Deletion', body: 'Depending on your jurisdiction (such as under the GDPR or CCPA), you may have the right to request access to, correction of, or deletion of your personal data. You can initiate a complete account deletion directly from the Settings menu. Upon confirming account deletion, all personal data, user content, and billing records (except those required for legal or tax compliance) will be permanently and irreversibly wiped from our production systems within 30 days.' },
      { title: '7. Cookies and Tracking Technologies', body: 'We use essential cookies to maintain your login session and secure your account. We also utilize optional analytics and performance cookies to understand how our platform is used, track feature engagement, and improve load times. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent, but some parts of the platform may not function properly without essential cookies.' },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Acceptable Use',
    lastUpdated: 'April 2026',
    intro: 'Comprehensive rules for using Omnia Creata responsibly.',
    items: [
      { title: '1. Overview and Core Philosophy', body: 'Omnia Creata is built to be a safe, inspiring, and professional environment for creators of all backgrounds. This Acceptable Use Policy establishes the boundaries of what is permitted on the platform. By utilizing our AI models, chat interfaces, and community features, you agree to abide by these guidelines. We rely on a combination of automated moderation systems and human review to enforce these rules.' },
      { title: '2. Prohibited Content Categories', body: 'You are strictly prohibited from generating, uploading, or attempting to generate any of the following: (a) Explicit Content: Sexually explicit material, pornography, or non-consensual intimate imagery. (b) Violence and Gore: Gratuitous violence, extreme gore, bodily harm, or content that promotes self-harm. (c) Hate Speech: Content that demeans, attacks, or discriminates against individuals or groups based on race, religion, sexual orientation, disability, or gender identity. (d) Illegal Acts: Content that encourages, depicts, or facilitates illegal activities, terrorism, or the sale of illicit goods.' },
      { title: '3. Disinformation and Deepfakes', body: 'Omnia Creata must not be used to deceive the public or manipulate discourse. You may not generate realistic depictions of public figures, politicians, or private individuals in compromising, false, or defamatory situations ("deepfakes"). You are prohibited from generating mock news imagery, fabricated historical events, or any content designed to spread systemic disinformation, interfere with elections, or cause public panic.' },
      { title: '4. Intellectual Property Takedown and Respect', body: 'You may not use the Service to intentionally mass-reproduce copyrighted works, protected characters, or registered trademarks without authorization. If we receive a valid DMCA takedown notice or similar legal claim regarding content you have generated and made public, we will remove the content immediately and may issue a strike against your account.' },
      { title: '5. Technical Abuse and Exploitation', body: 'You may not use automated scripts, bots, or scraping tools to access the Service outside of our official API (if permitted by your plan). Attempting to "jailbreak" or bypass our safety filters, probing our network infrastructure for vulnerabilities, or using the Service in a way that disproportionately burdens our computing resources is strictly prohibited.' },
      { title: '6. Commercial Rights and Tier Restrictions', body: 'Outputs generated on the Free tier are provided under a strict Personal Use license. You may not sell, license, or monetize these outputs in any direct or indirect manner. To use generated media in commercial environments, advertisements, product designs, or client work, you must maintain an active Pro or Creator subscription at the time the material is generated.' },
      { title: '7. Policy Enforcement and Appeals', body: 'We employ automated safety systems that may proactively block prompts or blur images deemed to be in violation of this policy. Repeated attempts to breach these systems will result in an automatic account suspension. Severe violations (such as attempting to generate CSAM) will result in immediate permanent expulsion and reporting to the National Center for Missing & Exploited Children (NCMEC) or relevant authorities. If you believe your prompt was incorrectly flagged, you may contact support for a manual review.' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Get in touch',
    intro: 'We\'re here to help.',
    items: [
      { title: 'Support', body: 'Questions or issues? Email support@omniacreata.com.' },
      { title: 'Safety reports', body: 'Report content violations or abuse at safety@omniacreata.com.' },
      { title: 'Business', body: 'Partnership or press inquiries: business@omniacreata.com.' },
      { title: 'Legal', body: 'Legal notices: legal@omniacreata.com.' },
    ],
  },
]

const sectionIcons: Record<HelpSectionId, React.ElementType> = {
  'getting-started': Sparkles,
  'faq': HelpCircle,
  'safety': ShieldCheck,
  'terms': FileText,
  'privacy': Lock,
  'usage-policy': ShieldAlert,
  'contact': Mail,
}

/* ─── Accordion Item ─── */
function AccordionItem({ item, defaultOpen = false }: { item: HelpItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="text-sm font-medium text-zinc-200 transition group-hover:text-white">{item.title}</div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition duration-300 ${open ? 'rotate-180 text-white' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '400px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="pb-5 pr-8 text-[14px] leading-[1.8] text-zinc-400">{item.body}</div>
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
              <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIA CREATA</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
              </div>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-300">
              <Link to="/explore" className="transition hover:text-white">Explore</Link>
              <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
              <Link to="/help" className="text-white font-medium">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">Start Free</Link>
            </nav>
          </div>
        </header>
      )}

      <AppPage className="max-w-[1200px] gap-10 py-10">
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#111216] p-10 md:p-14 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.04),transparent_50%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary-light)/0.3)] bg-[rgb(var(--primary-light)/0.1)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--primary-light))] backdrop-blur-md mb-6">
              Support Center
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl text-balance">
              How can we help you create?
            </h1>
            <p className="mt-6 text-[16px] leading-[1.8] text-zinc-400 max-w-2xl">
              Everything you need to know about using Omnia Creata to its fullest potential, along with our policies and contact information.
            </p>
          </div>
        </section>

        <div className="grid gap-12 xl:grid-cols-[240px_minmax(0,1fr)] items-start mt-6">
          {/* Sticky Sidebar Navigation */}
          <aside className="hidden xl:block sticky top-28 w-full">
            <div className="space-y-1 rounded-[20px] border border-white/[0.04] bg-[#111216]/50 p-2 backdrop-blur-md">
              {sections.map((section) => {
                const Icon = sectionIcons[section.id]
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-white active:scale-[0.98]"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-70" />
                    {section.label}
                  </a>
                )
              })}
            </div>
          </aside>

          {/* Content Sections */}
          <div className="space-y-16 lg:space-y-24">
            {sections.map((section) => {
              const Icon = sectionIcons[section.id]
              return (
                <section key={section.id} id={section.id} className="scroll-mt-32">
                  <div className="flex items-start gap-4 md:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#111216] ring-1 ring-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                      <Icon className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--primary-light))]">
                        {section.label}
                      </div>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                        {section.title}
                      </h2>
                    </div>
                  </div>
                  
                  {section.lastUpdated && (
                    <div className="mt-4 text-[12px] font-medium text-zinc-500">
                      Last updated: {section.lastUpdated}
                    </div>
                  )}
                  
                  <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-zinc-400">
                    {section.intro}
                  </p>

                  <div className="mt-8">
                    {/* Collapsible Accordions for Legal, Simple Grid for Regular Help */}
                    {['terms', 'privacy', 'usage-policy'].includes(section.id) ? (
                      <div className="rounded-[20px] border border-white/[0.06] bg-[#0c0d12]/50 px-6 backdrop-blur-md">
                        {section.items.map((item, i) => (
                          <AccordionItem key={item.title} item={item} defaultOpen={i === 0} />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {section.items.map((item) => (
                          <div key={item.title} className="group rounded-[20px] border border-white/[0.04] bg-[#111216]/50 p-6 transition-all hover:bg-[#111216] hover:border-white/[0.08]">
                            <div className="text-[15px] font-semibold text-white transition group-hover:text-[rgb(var(--primary-light))]">{item.title}</div>
                            <div className="mt-2.5 text-[14px] leading-[1.7] text-zinc-400">{item.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {!canRenderWithShell && <LegalFooter />}
      </AppPage>
    </>
  )
}
