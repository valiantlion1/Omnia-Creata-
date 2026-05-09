import { Link } from 'react-router-dom'

import {
  LegalList,
  LegalPage,
  LegalPlaceholder,
  LegalSection,
  LegalSubsection,
  type LegalTocItem,
} from '@/components/LegalPage'
import { LEGAL_EFFECTIVE_DATE_LABEL, LEGAL_LAST_UPDATED_LABEL } from '@/lib/legalConfig'

const TOC: LegalTocItem[] = [
  { id: 'overview', title: '1. Overview' },
  { id: 'what', title: '2. What cookies are' },
  { id: 'principles', title: '3. Our cookie principles' },
  { id: 'categories', title: '4. Categories we use' },
  { id: 'inventory', title: '5. Current browser storage inventory' },
  { id: 'third-party', title: '6. Third-party storage' },
  { id: 'consent', title: '7. Consent, withdrawal, and proof' },
  { id: 'browser', title: '8. Browser controls' },
  { id: 'gpc', title: '9. Global Privacy Control' },
  { id: 'regional', title: '10. Regional notes' },
  { id: 'changes', title: '11. Changes' },
  { id: 'contact', title: '12. Contact' },
]

const COOKIE_INVENTORY = [
  {
    name: 'sb-<project-ref>-auth-token',
    category: 'Strictly necessary',
    purpose: 'Supabase-managed authentication storage that keeps the signed-in account active and lets the app refresh the session safely.',
    duration: 'Session and refresh-token lifetime, or until sign-out / browser storage deletion',
    party: 'Supabase / first-party app storage',
  },
  {
    name: 'oc-studio-cookie-preferences-v1',
    category: 'Strictly necessary',
    purpose: 'Records whether this browser chose essential-only mode or allowed optional analytics.',
    duration: 'Until changed, cleared, or superseded by a newer consent version',
    party: 'First-party local storage',
  },
  {
    name: 'i18nextLng',
    category: 'Preference',
    purpose: 'Remembers the language selected by the browser or user so the interface opens in the expected language.',
    duration: 'Until changed or browser storage is cleared',
    party: 'First-party local storage',
  },
  {
    name: 'oc-studio-rail-collapsed',
    category: 'Preference',
    purpose: 'Remembers whether the desktop sidebar was collapsed.',
    duration: 'Until changed or browser storage is cleared',
    party: 'First-party local storage',
  },
  {
    name: 'studio-library-views / studio-library-sort:*',
    category: 'Preference',
    purpose: 'Remembers Library view mode and sort order so repeat visits do not reset your workspace.',
    duration: 'Until changed or browser storage is cleared',
    party: 'First-party local storage',
  },
  {
    name: 'omnia-prompt-history:*',
    category: 'Preference / workspace continuity',
    purpose: 'Keeps recent Create prompts in this browser so you can reuse prior work without retyping.',
    duration: 'Until cleared by the browser, account reset, or future product controls',
    party: 'First-party local storage',
  },
  {
    name: 'omnia-create-active-session:*',
    category: 'Preference / workspace continuity',
    purpose: 'Remembers the most recent active Create run for this browser so refreshes can resume the right context.',
    duration: 'Until the run changes, completes, is cleared, or browser storage is deleted',
    party: 'First-party local storage',
  },
  {
    name: 'oc-chat-visual-messages-v1',
    category: 'Preference / workspace continuity',
    purpose: 'Keeps lightweight local references to visual messages shown inside Chat for continuity in this browser.',
    duration: 'Until cleared by the browser or replaced by a future server-backed preference model',
    party: 'First-party local storage',
  },
  {
    name: 'oc-chat-project-map-v1',
    category: 'Preference / workspace continuity',
    purpose: 'Remembers which project a local Chat conversation was associated with.',
    duration: 'Until cleared by the browser or replaced by a future server-backed preference model',
    party: 'First-party local storage',
  },
  {
    name: 'omnia_welcome_shown',
    category: 'Preference',
    purpose: 'Prevents the first-run welcome state from repeatedly appearing in the same browser session.',
    duration: 'Browser session',
    party: 'First-party session storage',
  },
  {
    name: 'ph_* / posthog_*',
    category: 'Optional analytics',
    purpose: 'PostHog telemetry for aggregate product quality, feature usage, reliability, and performance analysis. Loaded only after analytics consent.',
    duration: 'Provider-controlled, normally up to 13 months unless cleared sooner',
    party: 'PostHog / third-party analytics storage',
  },
  {
    name: 'payment-provider storage',
    category: 'Strictly necessary if paid checkout is enabled',
    purpose: 'Checkout, fraud prevention, receipt, tax, and payment-session storage set by the payment provider once public paid checkout exists.',
    duration: 'Provider-controlled checkout/session duration',
    party: 'Future disclosed payment provider',
  },
] as const

export default function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      subtitle="What OmniaCreata Studio stores in your browser, why it is stored, and how to change or refuse optional tracking."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="Studio uses strictly necessary browser storage for sign-in, security, consent records, and core workspace continuity. Optional analytics is off by default and only loads after consent, unless the browser sends Global Privacy Control, in which case analytics stays off. We do not use advertising cookies and we do not sell or share cookie data for cross-context behavioural advertising."
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Cookie Policy explains how OmniaCreata Studio uses cookies, local storage, session storage, SDK-managed
          browser identifiers, and similar technologies on omniacreata.com and inside the Studio app. In this policy,
          we call all of those technologies "cookies" unless the difference matters.
        </p>
        <p>
          This policy should be read together with our{' '}
          <Link to="/legal/privacy" className="text-white underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          , which explains the wider personal-data rules behind account data, prompts, generated images, analytics,
          security logs, and user rights.
        </p>
      </LegalSection>

      <LegalSection id="what" title="2. What cookies are">
        <p>
          A cookie is a small file or value stored by a website in your browser. Modern web apps also use local
          storage, session storage, IndexedDB, pixels, SDK identifiers, and browser-accessed device signals for similar
          purposes. Some values disappear when the browser closes. Others remain until they expire, you clear them, or
          the app replaces them.
        </p>
        <p>
          Some storage is first-party, meaning it is controlled by Studio on the Studio domain. Some is third-party,
          meaning it is set by a service we use, such as Supabase for authentication, PostHog for optional analytics,
          or a future disclosed payment provider for checkout.
        </p>
      </LegalSection>

      <LegalSection id="principles" title="3. Our cookie principles">
        <LegalList
          items={[
            'No advertising cookies. We do not use browser storage to build ad audiences.',
            'No sale of cookie data. We do not sell personal information and we do not share it for cross-context behavioural advertising.',
            'Optional analytics stays off until consent. If analytics keys are not configured, the app runs in essential-only mode.',
            'Core security and sign-in storage stays on because Studio cannot safely operate without it.',
            'Global Privacy Control is respected as an opt-out signal for optional analytics and sale/share-style processing.',
            'Policy and product must match. If we add a new SDK or browser storage family, this policy and the consent flow must be updated.',
          ]}
        />
      </LegalSection>

      <LegalSection id="categories" title="4. Categories we use">
        <LegalSubsection title="4.1 Strictly necessary storage">
          <p>
            Required for authentication, security, abuse prevention, routing, consent proof, and basic app operation.
            This storage cannot be switched off inside Studio because the app would not be able to keep accounts
            secure, remember consent, or serve protected surfaces correctly.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.2 Preference and workspace-continuity storage">
          <p>
            Remembers choices such as language, sidebar state, Library view, prompt history, active Create session, and
            lightweight Chat continuity. These values are meant to make the app feel stable in the same browser. They
            do not give public users access to your backend data, and clearing them only resets local convenience
            state.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.3 Optional analytics and performance storage">
          <p>
            Helps us understand aggregate feature usage, page quality, reliability, and performance. Studio currently
            uses PostHog only after analytics consent. We configure analytics for product improvement, not advertising,
            and we avoid collecting full prompt text or generated images as analytics events.
          </p>
        </LegalSubsection>
        <LegalSubsection title="4.4 Payment and fraud storage">
          <p>
            Paid checkout is closed during hidden beta. If public paid checkout opens later, the disclosed payment
            provider may set strictly necessary checkout, tax, fraud-prevention, and receipt storage. We will update
            this inventory and the checkout disclosures before any payment details are accepted.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="inventory" title="5. Current browser storage inventory">
        <p>
          The table below is the practical inventory for the current Studio web app. Provider names and exact keys can
          change when SDKs update, so we group variable provider keys by family where needed.
        </p>
        <div className="mt-4 overflow-x-auto rounded-[12px] border border-white/[0.08]">
          <table className="w-full min-w-[840px] text-left text-[12.5px]">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Name or family</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Purpose</th>
                <th className="px-3 py-2 font-semibold">Duration</th>
                <th className="px-3 py-2 font-semibold">Party</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {COOKIE_INVENTORY.map((item) => (
                <tr key={item.name} className="border-t border-white/[0.06]">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{item.name}</td>
                  <td className="px-3 py-2">{item.category}</td>
                  <td className="px-3 py-2">{item.purpose}</td>
                  <td className="px-3 py-2">{item.duration}</td>
                  <td className="px-3 py-2">{item.party}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-zinc-500">
          The browser developer tools or site-data panel may show additional low-level values created by the browser,
          hosting platform, or SDK internals. If a value becomes part of Studio's stable product behavior, we document
          it here.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="6. Third-party storage">
        <p>Third-party services may set or read browser storage only for the role they perform for Studio:</p>
        <LegalList
          items={[
            <>
              <strong>Supabase</strong> - account authentication, session refresh, and secure access to user-owned data.
            </>,
            <>
              <strong>PostHog</strong> (<LegalPlaceholder>Analytics/Monitoring Provider</LegalPlaceholder>) - optional
              analytics and performance telemetry after consent.
            </>,
            <>
              <strong>Vercel / Cloudflare</strong> (<LegalPlaceholder>CDN Provider</LegalPlaceholder>) - routing,
              transport security, edge protection, DDoS protection, bot mitigation, and availability.
            </>,
            <>
              <strong>Future payment provider</strong> - checkout and fraud-prevention storage only if paid checkout
              opens and only after the provider is disclosed.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="consent" title="7. Consent, withdrawal, and proof">
        <p>
          In regions that require consent before non-essential storage, Studio asks before optional analytics runs. You
          can choose essential-only mode, allow analytics, or reopen the preference panel later from the footer or from
          account settings.
        </p>
        <LegalList
          items={[
            'Withdrawing consent stops new optional analytics capture for that browser.',
            'Withdrawing consent does not undo processing that already happened while valid consent was active.',
            'Consent is browser-specific. If you use another browser, device, profile, or private window, you may need to choose again.',
            'Clearing browser data removes the local consent record, so Studio may ask again on the next visit.',
            'We keep enough consent evidence to prove the choice, time, and policy version where required.',
          ]}
        />
      </LegalSection>

      <LegalSection id="browser" title="8. Browser controls">
        <p>
          You can also block or clear cookies through your browser settings. Blocking strictly necessary cookies will
          break sign-in, protected app routes, generation, Library access, billing/account surfaces, and security
          controls. Blocking optional analytics will not stop you from using the core service.
        </p>
        <LegalList
          items={[
            'Chrome: Privacy and security > Third-party cookies or Site settings.',
            'Edge: Cookies and site permissions.',
            'Safari: Privacy settings and website data.',
            'Firefox: Privacy & Security > Cookies and Site Data.',
          ]}
        />
      </LegalSection>

      <LegalSection id="gpc" title="9. Global Privacy Control">
        <p>
          Global Privacy Control (GPC) is a browser or extension signal that communicates a privacy opt-out. Studio
          treats an active GPC signal as an instruction to keep optional analytics off for that browser. If GPC is
          active, the cookie preference panel will show analytics as blocked by GPC.
        </p>
        <p>
          "Do Not Track" is different from GPC and does not have a single standard legal meaning across browsers. We
          prioritize GPC because it is the clearer modern opt-out signal for sale/share-style processing and optional
          tracking.
        </p>
      </LegalSection>

      <LegalSection id="regional" title="10. Regional notes">
        <LegalSubsection title="10.1 EEA and United Kingdom">
          <p>
            Where ePrivacy, PECR, or similar rules require prior consent for non-essential storage, Studio asks before
            optional analytics runs and lets you withdraw consent later.
          </p>
        </LegalSubsection>
        <LegalSubsection title="10.2 Turkiye">
          <p>
            For users in Turkiye, cookie choices may also involve KVKK notice and explicit-consent rules depending on
            the storage category and purpose. We keep strictly necessary storage separate from analytics consent and
            provide this policy as the detailed explanation of categories, purposes, parties, and controls.
          </p>
        </LegalSubsection>
        <LegalSubsection title="10.3 California and other US states">
          <p>
            Studio does not sell personal information and does not share browser data for cross-context behavioural
            advertising. If future integrations create a sale/share-style use, we will provide the required opt-out
            controls before enabling that use.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes">
        <p>
          We update this policy when browser storage changes materially, when a new analytics, security, auth, or
          checkout provider is introduced, or when regional law requires clearer notice. Material changes to optional
          storage will trigger a refreshed consent request where required.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Questions, access requests, deletion requests, or cookie objections can be sent to{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
