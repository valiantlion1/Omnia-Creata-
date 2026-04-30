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
  { id: 'controller', title: '2. Controller and contact' },
  { id: 'scope', title: '3. Scope of this notice' },
  { id: 'data-we-collect', title: '4. Data we collect' },
  { id: 'purposes', title: '5. Purposes and legal bases' },
  { id: 'prompts-outputs', title: '6. Prompts and generated outputs' },
  { id: 'cookies', title: '7. Cookies and similar technologies' },
  { id: 'sub-processors', title: '8. Service providers and sub-processors' },
  { id: 'international', title: '9. International transfers' },
  { id: 'retention', title: '10. Retention' },
  { id: 'security', title: '11. Security' },
  { id: 'your-rights', title: '12. Your rights (EU / UK / EEA)' },
  { id: 'kvkk', title: '13. Turkiye - KVKK rights' },
  { id: 'ccpa', title: '14. California - CCPA / CPRA rights' },
  { id: 'children', title: '15. Children' },
  { id: 'automated', title: '16. Automated decision-making' },
  { id: 'marketing', title: '17. Marketing communications' },
  { id: 'third-party-links', title: '18. Third-party links' },
  { id: 'changes', title: '19. Changes to this notice' },
  { id: 'complaints', title: '20. How to complain' },
  { id: 'contact', title: '21. Contact us' },
]

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How Omnia Creata Studio collects, uses, protects, and shares personal data - and the choices you have."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="We collect the minimum data needed to run the Service: your account details, your prompts and generated images, billing records via Paddle, and basic technical logs. We do not sell your data, we do not use your content to train third-party AI models, and we honour the rights granted to you under the GDPR, Turkiye's KVKK, and the CCPA. You can request access, correction, export, or deletion at any time."
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Privacy Policy explains how <LegalPlaceholder>Omnia Creata Legal Entity Name</LegalPlaceholder>{' '}
          ("<strong>Omnia Creata</strong>," "we," "us," "our") processes
          personal data when you visit omniacreata.com, create an account, subscribe to a plan, generate images, or
          otherwise interact with the Omnia Creata Studio service (the "<strong>Service</strong>").
        </p>
        <p>
          We wrote this notice to be readable. It is still a legal document. Where a specific regional law applies to
          you (GDPR in the EEA, UK GDPR and the Data Protection Act 2018 in the United Kingdom, the KVKK in Turkiye,
          the CCPA/CPRA in California), the section addressed to your region applies in addition to the general terms.
        </p>
        <p>
          If anything in this notice is unclear, email{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder> and a human will reply.
        </p>
      </LegalSection>

      <LegalSection id="controller" title="2. Controller and contact">
        <p>The controller of your personal data is:</p>
        <LegalList
          items={[
            <>
              Entity: <LegalPlaceholder>Omnia Creata Legal Entity Name</LegalPlaceholder>
            </>,
            <>
              Registered address: <LegalPlaceholder>Registered Address</LegalPlaceholder>
            </>,
            <>
              Registration number: <LegalPlaceholder>Company Registration No.</LegalPlaceholder>
            </>,
            <>
              General privacy contact: <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>
            </>,
            <>
              Data Protection contact: <LegalPlaceholder>dpo@omniacreata.com</LegalPlaceholder>
            </>,
          ]}
        />
        <p>
          Where we are required to register with a data protection authority or appoint a representative — including
          under Article 27 GDPR for EU representation or VERBIS registration in Turkiye - the designated contact point
          will be listed here.
        </p>
      </LegalSection>

      <LegalSection id="scope" title="3. Scope of this notice">
        <p>This notice covers personal data we process when you:</p>
        <LegalList
          items={[
            'Visit any public Omnia Creata Studio page;',
            'Register for, sign in to, or use an Omnia Creata Studio account;',
            'Purchase or manage a subscription via our payment processor, Paddle;',
            'Submit prompts, upload reference images, or generate outputs in the Service;',
            'Contact our support channels or engage with our marketing.',
          ]}
        />
        <p>
          It does not cover websites, platforms, or services operated by third parties, even where we link to them.
          Those operators have their own privacy practices.
        </p>
      </LegalSection>

      <LegalSection id="data-we-collect" title="4. Data we collect">
        <LegalSubsection title="4.1 Data you give us">
          <LegalList
            items={[
              'Account data: email, display name, password (hashed), profile picture if you upload one, preferred language.',
              'Billing data: plan selected, subscription status, purchase history, invoice metadata, VAT/tax identifier where you provide one. Card numbers and banking details are handled exclusively by Paddle; we never see or store them.',
              'Content: prompts you write, negative prompts, seeds, parameters, reference images you upload, and the generated images we produce for you.',
              'Support data: the content of messages you send us, and any attachments you include.',
            ]}
          />
        </LegalSubsection>
        <LegalSubsection title="4.2 Data we collect automatically">
          <LegalList
            items={[
              'Technical data: IP address, user-agent string, device and browser information, approximate location (derived from IP at city/country level), time zone.',
              'Usage data: pages visited, features used, number of generations, response times, error logs, session duration.',
              'Security data: login attempts, session tokens, fingerprints used to detect abuse, and records of blocked requests (including the reason for blocking).',
              'Cookies and similar technologies — see Section 7 and our Cookie Policy.',
            ]}
          />
        </LegalSubsection>
        <LegalSubsection title="4.3 Data from third parties">
          <LegalList
            items={[
              'Payment confirmations, tax residency, currency, and subscription lifecycle events from Paddle.',
              'Authentication signals (if you sign in with a third-party identity provider) — limited to the identifiers that provider releases to us.',
              'Abuse and fraud signals from upstream infrastructure providers (e.g., CDN, DDoS protection).',
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="purposes" title="5. Purposes and legal bases">
        <p>
          Under the GDPR and UK GDPR, we must have a lawful basis for each processing activity. The table below
          summarises what we do, why, and on what basis.
        </p>
        <LegalSubsection title="5.1 Provide and operate the Service">
          <p>
            Creating and authenticating your account, serving generations, tracking credits, showing your history,
            providing customer support. <strong>Legal basis:</strong> performance of the contract between you and us
            (Art. 6(1)(b) GDPR).
          </p>
        </LegalSubsection>
        <LegalSubsection title="5.2 Billing and financial records">
          <p>
            Processing subscriptions via Paddle, issuing invoices, keeping accounting records.{' '}
            <strong>Legal basis:</strong> performance of a contract (Art. 6(1)(b)) and compliance with legal obligations
            (Art. 6(1)(c)) — including tax and accounting laws.
          </p>
        </LegalSubsection>
        <LegalSubsection title="5.3 Security, abuse prevention, and fraud detection">
          <p>
            Detecting unauthorised access, rate-limiting, blocking prompts that violate the Acceptable Use Policy,
            investigating abuse reports. <strong>Legal basis:</strong> legitimate interests (Art. 6(1)(f)) — our
            interest in keeping the Service safe and usable, balanced against your interests.
          </p>
        </LegalSubsection>
        <LegalSubsection title="5.4 Service improvement and analytics">
          <p>
            Understanding which features are used, measuring quality of results, investigating bugs, performance
            tuning. We use aggregated or pseudonymised data where possible. <strong>Legal basis:</strong> legitimate
            interests (Art. 6(1)(f)) and, where we use non-essential analytics cookies, your consent (Art. 6(1)(a)).
          </p>
        </LegalSubsection>
        <LegalSubsection title="5.5 Legal compliance and dispute handling">
          <p>
            Responding to lawful requests from authorities, enforcing our Terms, defending against claims, complying
            with tax, anti-money-laundering, sanctions, and consumer-protection law.{' '}
            <strong>Legal basis:</strong> legal obligation (Art. 6(1)(c)) and legitimate interests (Art. 6(1)(f)).
          </p>
        </LegalSubsection>
        <LegalSubsection title="5.6 Marketing">
          <p>
            Sending product updates and occasional announcements. <strong>Legal basis:</strong> consent (Art. 6(1)(a))
            where required, or legitimate interest (soft opt-in) for existing customers who have not opted out. You can
            unsubscribe at any time (see Section 17).
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="prompts-outputs" title="6. Prompts, reference images, and generated outputs">
        <p>
          This is the part people usually ask about. We take it seriously.
        </p>
        <LegalList
          items={[
            'We store your prompts, reference images, parameters, and generated outputs so that your history, credits, and billing reconcile correctly, and so that abuse investigations can be carried out if a report is filed.',
            'We do not sell your prompts or outputs, and we do not share them with third-party AI model vendors for training their models.',
            'We may process prompts and outputs through our upstream generation providers solely for the purpose of producing the image you requested. These providers act as processors under contract and are bound to use the data only for that purpose.',
            'We may use aggregated, de-identified telemetry about generations (e.g., distribution of resolutions, failure rates) to improve the Service. Aggregated telemetry cannot be linked back to you.',
            'We may review prompts and outputs flagged by automated safety systems or by user reports to enforce our Acceptable Use Policy. Access is limited to staff who need it.',
            'If you delete content or your account, we delete or anonymise associated prompts and outputs on the schedule in Section 10.',
          ]}
        />
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies and similar technologies">
        <p>
          We use cookies, local storage, and similar technologies to keep you signed in, remember preferences, measure
          usage, and keep the Service secure. Strictly necessary cookies are set without consent because the Service
          cannot function without them. Non-essential analytics and preference cookies are set only with your consent
          where the law requires it.
        </p>
        <p>
          Full detail - including a list of each cookie, its purpose, and its duration - is in our{' '}
          <Link to="/legal/cookies" className="text-white underline-offset-4 hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="sub-processors" title="8. Service providers and sub-processors">
        <p>
          We rely on a small number of vendors to run the Service. Each is bound by a written agreement that restricts
          their use of personal data to our instructions. The current list includes:
        </p>
        <LegalList
          items={[
            <>
              <strong>Paddle.com Market Limited</strong> (United Kingdom) - merchant of record, payment processing,
              invoicing, tax collection and remittance.
            </>,
            <>
              <strong>Cloud hosting provider</strong> (<LegalPlaceholder>Hosting Provider Name, Region</LegalPlaceholder>
              ) — application hosting, databases, object storage for generated images.
            </>,
            <>
              <strong>CDN &amp; DDoS protection</strong> (<LegalPlaceholder>CDN Provider, Region</LegalPlaceholder>) —
              edge caching, traffic security.
            </>,
            <>
              <strong>Generation infrastructure</strong> (
              <LegalPlaceholder>Upstream Model Provider(s)</LegalPlaceholder>) — executing the generation request you
              submit. Bound by contract not to reuse your prompts or outputs for model training.
            </>,
            <>
              <strong>Transactional email</strong> (<LegalPlaceholder>Email Provider</LegalPlaceholder>) — sign-in
              links, receipts, security alerts.
            </>,
            <>
              <strong>Product analytics and error monitoring</strong> (
              <LegalPlaceholder>Analytics/Monitoring Provider</LegalPlaceholder>) — only where consent is obtained, and
              scoped to pseudonymous identifiers.
            </>,
            <>
              <strong>Customer support tooling</strong> (<LegalPlaceholder>Support Tool</LegalPlaceholder>) — handling
              and tracking support conversations.
            </>,
          ]}
        />
        <p>
          An up-to-date list — including entity names and regions — is available on request at{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>. We notify subscribers of material changes to
          the sub-processor list where required.
        </p>
      </LegalSection>

      <LegalSection id="international" title="9. International data transfers">
        <p>
          Omnia Creata Studio is operated from{' '}
          <LegalPlaceholder>Primary Operating Jurisdiction</LegalPlaceholder>. Some of our sub-processors are located in
          other countries, including countries outside the European Economic Area or the United Kingdom.
        </p>
        <p>Where we transfer personal data internationally, we rely on one or more of the following safeguards:</p>
        <LegalList
          items={[
            'European Commission adequacy decisions, where applicable;',
            'Standard Contractual Clauses (SCCs) approved by the European Commission, supplemented by the UK International Data Transfer Addendum where relevant;',
            'Equivalent mechanisms under Turkiye\'s KVKK (Article 9), including explicit consent or Board-approved undertakings, where required.',
          ]}
        />
        <p>
          You can request a copy of the safeguards we rely on for a specific transfer by contacting{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="10. Retention">
        <p>We keep personal data only as long as we need it. Indicative retention periods:</p>
        <LegalList
          items={[
            'Account data — while your account is active. Deleted or anonymised within 30 days after account closure, subject to Section 10.1.',
            'Content (prompts, uploads, outputs) — while your account is active. You can delete individual items at any time. Deleted items are removed from active storage immediately and from backups on rolling schedule (typically up to 35 days).',
            'Billing and tax records — retained for the period required by applicable tax and accounting law (generally 7–10 years).',
            'Security logs — up to 12 months, extended only where needed for an active investigation.',
            'Marketing preferences and suppression lists — until you ask us to delete them or for as long as needed to honour an opt-out.',
            'Support conversations — up to 24 months after the conversation is closed.',
          ]}
        />
        <LegalSubsection title="10.1 Legal holds">
          <p>
            Where we are legally required to preserve data (e.g., in response to a valid court order, ongoing fraud
            investigation, or pending legal claim), we may retain it beyond the periods above until the obligation
            ends.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="security" title="11. Security">
        <p>We apply layered security measures appropriate to the risks of the data we process:</p>
        <LegalList
          items={[
            'Encryption in transit (TLS 1.2+) for all client–server traffic.',
            'Encryption at rest for databases and object storage.',
            'Hashed and salted password storage. We never see your password in plaintext.',
            'Role-based access control, least-privilege defaults, multi-factor authentication for staff access to production systems.',
            'Logging and anomaly detection on authentication, billing, and admin actions.',
            'Regular backups with tested restoration procedures.',
            'Incident response procedures. Where a personal data breach is likely to result in risk to your rights, we notify the competent supervisory authority within 72 hours where required and notify affected users without undue delay.',
          ]}
        />
        <p>
          No system is immune to attack. You are responsible for keeping your password confidential and for reporting
          suspected unauthorised access to <LegalPlaceholder>security@omniacreata.com</LegalPlaceholder>.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="12. Your rights (EU / UK / EEA)">
        <p>
          If you are in the EEA or the United Kingdom, you have the following rights under the GDPR and UK GDPR:
        </p>
        <LegalList
          items={[
            <>
              <strong>Access</strong> — a copy of the personal data we hold about you.
            </>,
            <>
              <strong>Rectification</strong> — correction of inaccurate or incomplete data.
            </>,
            <>
              <strong>Erasure</strong> ("right to be forgotten") — deletion where no overriding ground for
              retention applies.
            </>,
            <>
              <strong>Restriction</strong> — limit how we process your data in specified circumstances.
            </>,
            <>
              <strong>Portability</strong> — receive your data in a structured, commonly used, machine-readable format,
              and transmit it to another controller.
            </>,
            <>
              <strong>Objection</strong> — object to processing based on legitimate interest, including profiling and
              direct marketing.
            </>,
            <>
              <strong>Withdraw consent</strong> — where we rely on consent, you can withdraw it at any time without
              affecting the lawfulness of prior processing.
            </>,
            <>
              <strong>Lodge a complaint</strong> - with your local supervisory authority (see Section 20).
            </>,
          ]}
        />
        <p>
          To exercise any of these rights, email <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>. We
          respond within one month. We may ask for identity verification before acting on a request, and in complex
          cases may extend the deadline by up to two further months, notifying you of the reason. We do not charge a
          fee unless requests are manifestly unfounded or excessive.
        </p>
      </LegalSection>

      <LegalSection id="kvkk" title="13. Turkiye - KVKK rights">
        <p>
          If you are in Turkiye, the Personal Data Protection Law No. 6698 ("KVKK") applies to you. Under
          Article 11, you have the right to:
        </p>
        <LegalList
          items={[
            'Learn whether your personal data are processed;',
            'Request information about the processing, its purposes, and whether data is used in line with the purpose;',
            'Know the third parties (in Turkiye or abroad) to whom your data are transferred;',
            'Request correction of incomplete or inaccurate data;',
            'Request erasure or destruction under the conditions set out in Article 7 KVKK;',
            'Request notification of third parties about corrections, erasure, or destruction;',
            'Object to outcomes arising from the analysis of your data solely by automated means where they result in an adverse consequence;',
            'Claim compensation for damages arising from unlawful processing.',
          ]}
        />
        <p>
          Requests may be submitted to <LegalPlaceholder>kvkk@omniacreata.com</LegalPlaceholder> or by written
          application to the registered address in Section 2. We respond within thirty (30) days, free of charge
          unless the request requires an additional cost, in which case we may apply the tariff set by the Personal
          Data Protection Board.
        </p>
        <p>
          You have the right to lodge a complaint with the Turkish Personal Data Protection Authority (
          <em>Kişisel Verileri Koruma Kurumu</em>) if you believe your rights under the KVKK have been infringed.
        </p>
      </LegalSection>

      <LegalSection id="ccpa" title="14. California - CCPA / CPRA rights">
        <p>
          If you are a California resident, the California Consumer Privacy Act (as amended by the CPRA) gives you the
          right to:
        </p>
        <LegalList
          items={[
            'Know what personal information we collect, use, disclose, and (if applicable) sell or share;',
            'Request a copy of the personal information we have collected about you in the last 12 months;',
            'Request deletion of your personal information, subject to exceptions permitted by law;',
            'Correct inaccurate personal information;',
            'Limit the use and disclosure of sensitive personal information;',
            'Opt out of the sale or sharing of personal information (we do not sell personal information and do not share it for cross-context behavioural advertising);',
            'Non-discrimination — we will not deny service or charge you a different price for exercising these rights.',
          ]}
        />
        <p>
          You may submit a verifiable consumer request by emailing{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>. You may designate an authorised agent, in which
          case we will require proof of authorisation and may verify the request directly with you.
        </p>
      </LegalSection>

      <LegalSection id="children" title="15. Children">
        <p>
          The Service is not directed to children under sixteen (16) and we do not knowingly collect personal data
          from them. If you believe a child has provided us personal data, contact{' '}
          <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder> and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="automated" title="16. Automated decision-making">
        <p>
          We use automated systems to (a) moderate prompts and outputs against our Acceptable Use Policy, (b) detect
          fraud and abuse, and (c) enforce rate limits. These systems can block a specific request, suspend an
          account flagged for abuse, or require additional verification.
        </p>
        <p>
          Where an automated decision produces legal or similarly significant effects on you, you have the right to
          obtain human review. Contact <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder> and a staff member
          will review the decision and reply.
        </p>
      </LegalSection>

      <LegalSection id="marketing" title="17. Marketing communications">
        <p>
          We send product announcements and occasional updates to users who have opted in, or who qualify for soft
          opt-in under applicable law (existing customers for similar products, with a clear opt-out on every message).
        </p>
        <p>
          You can opt out at any time using the unsubscribe link in any marketing email, from the settings page of your
          account, or by emailing <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>. Transactional messages
          (billing receipts, security alerts, service notices) are not marketing and you cannot opt out of them while
          your account is active.
        </p>
      </LegalSection>

      <LegalSection id="third-party-links" title="18. Third-party links">
        <p>
          The Service may link to third-party websites, tools, or integrations. We are not responsible for their
          privacy practices. Review their privacy notices before providing them with data.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="19. Changes to this notice">
        <p>
          We update this notice from time to time. The "Last updated" date at the top of the page always
          reflects the current version. For material changes, we provide notice in-app, by email, or by any other
          means we reasonably determine to be effective, at least fourteen (14) days before the change takes effect,
          unless the change must be made sooner to comply with law.
        </p>
      </LegalSection>

      <LegalSection id="complaints" title="20. How to complain">
        <p>
          We hope you will come to us first at <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder> so we can
          try to resolve the issue. You also have the right to lodge a complaint with a supervisory authority:
        </p>
        <LegalList
          items={[
            'EEA — the authority in the Member State of your habitual residence, place of work, or place of the alleged infringement (list: edpb.europa.eu).',
            'United Kingdom — the Information Commissioner\'s Office (ico.org.uk).',
            'Türkiye — the Personal Data Protection Authority (kvkk.gov.tr).',
            'California — the California Privacy Protection Agency or the Attorney General\'s office.',
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" title="21. Contact us">
        <p>For any privacy request, question, or complaint:</p>
        <LegalList
          items={[
            <>
              Email: <LegalPlaceholder>privacy@omniacreata.com</LegalPlaceholder>
            </>,
            <>
              Data Protection contact: <LegalPlaceholder>dpo@omniacreata.com</LegalPlaceholder>
            </>,
            <>
              Postal address: <LegalPlaceholder>Registered Address</LegalPlaceholder>
            </>,
          ]}
        />
        <p>
          For information about your agreement with us and how we run the Service, see the{' '}
          <Link to="/legal/terms" className="text-white underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          . For rules about what you can and cannot do with the Service, see the{' '}
          <Link to="/legal/acceptable-use" className="text-white underline-offset-4 hover:underline">
            Acceptable Use Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
