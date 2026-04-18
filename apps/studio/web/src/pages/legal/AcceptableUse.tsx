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
  { id: 'who', title: '2. Who this applies to' },
  { id: 'prohibited-content', title: '3. Prohibited content' },
  { id: 'people', title: '4. Real people and identity' },
  { id: 'ip', title: '5. Intellectual property' },
  { id: 'prohibited-conduct', title: '6. Prohibited conduct' },
  { id: 'security', title: '7. Platform integrity and security' },
  { id: 'automation', title: '8. Automation and scraping' },
  { id: 'reselling', title: '9. Resale and multi-tenant use' },
  { id: 'regulated', title: '10. Regulated and sensitive industries' },
  { id: 'disclosures', title: '11. Disclosure of AI-generated media' },
  { id: 'moderation', title: '12. Moderation and filters' },
  { id: 'reporting', title: '13. Reporting abuse' },
  { id: 'enforcement', title: '14. Enforcement' },
  { id: 'appeals', title: '15. Appeals' },
  { id: 'changes', title: '16. Changes to this policy' },
  { id: 'contact', title: '17. Contact' },
]

export default function AcceptableUsePolicy() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      subtitle="What you can and cannot do with Omnia Creata Studio. Clear rules, clear consequences, consistent enforcement."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      effectiveDate={LEGAL_EFFECTIVE_DATE_LABEL}
      summary="Don't generate sexual content involving minors, don't build realistic images of identifiable people without permission, don't produce content intended to deceive, harass, harm, or break the law. Don't attack our systems. Don't resell raw access. We run automated filters and human review; violations lead to content takedown, credit forfeiture, suspension, or termination depending on severity."
      toc={TOC}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Acceptable Use Policy ("<strong>AUP</strong>") sets out the rules for using Omnia Creata
          Studio (the "<strong>Service</strong>"). It forms part of our{' '}
          <Link to="/legal/terms" className="text-white underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          . Capitalised terms not defined here have the meaning given in the Terms.
        </p>
        <p>
          The AUP exists for three reasons: to protect people who could be harmed by generative imagery, to keep the
          Service available to legitimate users, and to meet our legal obligations. We enforce it even when
          enforcement is commercially inconvenient.
        </p>
      </LegalSection>

      <LegalSection id="who" title="2. Who this applies to">
        <p>
          This AUP applies to anyone who accesses or uses the Service — account holders, guests, free-tier users,
          paying subscribers, enterprise customers, and any end user of a tool built with our output. Account holders
          are responsible for their own use and for the use of anyone acting with their credentials.
        </p>
      </LegalSection>

      <LegalSection id="prohibited-content" title="3. Prohibited content">
        <p>
          You must not use the Service to create, upload, store, transmit, or distribute content that falls into any
          of the following categories.
        </p>

        <LegalSubsection title="3.1 Child sexual abuse material (CSAM)">
          <p>
            Absolute prohibition. You must not generate, request, upload, store, transmit, or attempt to obtain any
            sexual or sexualised depiction of a minor, or any depiction that could be interpreted as such —
            photorealistic, illustrated, stylised, de-aged, anime, or otherwise. This includes:
          </p>
          <LegalList
            items={[
              'Any nudity or sexual activity involving a person under 18 or a character depicted as under 18;',
              'Sexualised depictions of minors in suggestive poses, clothing, or contexts, even without explicit nudity;',
              'Age regression, "de-aging," or similar framings used to sexualise a minor;',
              'Requests that imply a real minor as the subject, even where the generated image is non-sexual.',
            ]}
          />
          <p>
            Violations are reported to the competent authorities (including, where applicable, NCMEC and national
            hotlines) and result in immediate, permanent termination without refund.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3.2 Non-consensual intimate imagery">
          <p>
            You must not generate nude, sexual, or sexually suggestive images of real identifiable adults without their
            explicit, informed, documented consent. This includes "deepfake nude" content, "undress"
            transformations, or any imagery that places a real person in an intimate situation without their
            permission.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3.3 Sexual content involving animals or non-consenting subjects">
          <p>Strictly prohibited. No bestiality, no depictions of sexual violence, no non-consensual scenarios.</p>
        </LegalSubsection>

        <LegalSubsection title="3.4 Violent and graphic content">
          <p>You must not generate:</p>
          <LegalList
            items={[
              'Gore, dismemberment, torture, or realistic depictions of lethal violence against identifiable real people;',
              'Content that glorifies mass violence, genocide, terrorism, or specific violent attacks;',
              'Content that incites, celebrates, or instructs actual violence against a person or group.',
            ]}
          />
          <p>
            Stylised or artistic depictions of violence in clearly fictional contexts may be permitted, subject to
            our automated filters and human review.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3.5 Terrorism and extremism">
          <p>
            You must not use the Service to promote, recruit for, or glorify designated terrorist organisations or
            violent extremist movements; to produce propaganda, logos, or recruitment material for such groups; or to
            provide instruction on committing acts of terrorism.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3.6 Hate and harassment">
          <p>You must not generate content that:</p>
          <LegalList
            items={[
              'Dehumanises, incites hatred against, or calls for violence toward people based on protected characteristics (race, ethnicity, national origin, religion, caste, sexual orientation, gender, gender identity, disability, serious disease);',
              'Targets an individual for harassment, intimidation, stalking, or bullying;',
              'Revives or mocks victims of a tragedy, genocide, or atrocity in a manner that denies their dignity;',
              'Includes slurs or stereotypes used to demean a protected group.',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.7 Self-harm and dangerous acts">
          <p>
            You must not generate content that promotes, glorifies, or provides instruction for suicide, self-harm,
            eating disorders, or other seriously dangerous acts. If you are struggling, help is available — local
            resources are listed at <LegalPlaceholder>help.omniacreata.com/wellbeing</LegalPlaceholder>.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3.8 Illegal goods, weapons, and dangerous information">
          <p>You must not use the Service to:</p>
          <LegalList
            items={[
              'Facilitate the manufacture, sale, or use of weapons of mass destruction (biological, chemical, radiological, nuclear) or their delivery systems;',
              'Produce operational imagery intended to aid manufacture of firearms, explosives, or other regulated weapons;',
              'Promote or facilitate trafficking in illegal drugs, human beings, endangered species, or stolen goods;',
              'Generate counterfeit currency, counterfeit identity documents, or counterfeit trademarks.',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.9 Deception and fraud">
          <p>You must not use the Service to:</p>
          <LegalList
            items={[
              'Produce images intended to deceive viewers about identity, events, or authenticity, where the deception could cause harm (financial, reputational, political, safety);',
              'Fabricate evidence for legal, regulatory, journalistic, insurance, or academic proceedings;',
              'Impersonate a real person, company, or official body in a manner likely to mislead;',
              'Generate political disinformation — including fabricated imagery of political figures, election materials, or officials timed to mislead voters;',
              'Run scams, phishing campaigns, or similar fraudulent schemes.',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.10 Privacy violations">
          <p>You must not use the Service to:</p>
          <LegalList
            items={[
              'Reconstruct or reveal private information about an identifiable individual (doxxing);',
              'Generate imagery of a private residence, private workplace, or other non-public location in a manner that reveals the location of a specific person;',
              'Circumvent privacy protections such as blurring on official imagery (e.g., pixelated witnesses, redacted documents).',
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="3.11 Other illegal content">
          <p>
            Content that is illegal in the jurisdiction where you reside or where the output will be published is
            prohibited regardless of whether it is specifically listed above. Where local law is stricter than this
            AUP, local law controls.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="people" title="4. Real people and identity">
        <p>
          Generative imagery of real people raises unique risks. The following rules apply in addition to Section 3.
        </p>
        <LegalList
          items={[
            'Do not generate realistic images of a private individual (someone who is not a public figure) without their documented consent.',
            'Public figures (politicians, celebrities, athletes, widely known creators) may be depicted in clearly satirical, editorial, or fan-creative contexts, but not in content that (a) is sexual, (b) implies endorsement they have not given, (c) places them in a fabricated newsworthy situation likely to deceive, or (d) portrays them committing crimes or acts they have not committed.',
            'Do not use the Service to circumvent image-rights licensing, publicity rights, or likeness protections.',
            'Do not produce biometric templates or face embeddings usable for surveillance, identification, or tracking of individuals.',
            'If a real person requests removal of content depicting them, we may remove the content without prior notice to the uploader while we investigate.',
          ]}
        />
      </LegalSection>

      <LegalSection id="ip" title="5. Intellectual property">
        <LegalList
          items={[
            'Do not upload images you do not have the right to use. If you use a reference image, you represent that you own it, have permission, or it is properly licensed for your use.',
            'Do not attempt to reproduce copyrighted works wholesale (character designs, scene compositions, or illustrations of identifiable artists or franchises in a way that amounts to copying rather than inspiration). Style inspiration is permitted; reproduction is not.',
            'Do not use prompts designed to replicate the distinctive, recognisable style of a specific living artist where the intent is to pass the output off as that artist\'s work or to compete with them commercially using their identity.',
            'Do not use the Service to produce counterfeit goods, mock-ups of trademarked logos presented as genuine, or fake branded packaging.',
          ]}
        />
      </LegalSection>

      <LegalSection id="prohibited-conduct" title="6. Prohibited conduct">
        <p>Independent of the content produced, you must not:</p>
        <LegalList
          items={[
            'Share, sell, trade, or publish your account credentials;',
            'Let multiple people use a single seat in violation of your plan, except via features we provide for teams;',
            'Attempt to circumvent our moderation, safety filters, or rate limits, including by adversarial prompting, jailbreaks, prompt smuggling, or disguising prohibited requests in other languages;',
            'Submit known-toxic, malicious, or exploit payloads as prompts, uploads, or API input;',
            'Use the Service in a way that could reasonably cause material harm to another person or to a third party;',
            'Misrepresent your age, identity, or legal capacity to register an account.',
          ]}
        />
      </LegalSection>

      <LegalSection id="security" title="7. Platform integrity and security">
        <p>You must not:</p>
        <LegalList
          items={[
            'Probe, scan, or test the vulnerability of the Service or related systems without our prior written consent via a published disclosure programme;',
            'Breach, circumvent, or tamper with security, authentication, or access controls;',
            'Introduce malware, ransomware, spyware, or other malicious code;',
            'Interfere with or disrupt the Service, servers, networks, or other users — including by denial-of-service attacks or by flooding the Service with requests;',
            'Access areas of the Service to which you have not been granted access;',
            'Use the Service to attack other systems.',
          ]}
        />
      </LegalSection>

      <LegalSection id="automation" title="8. Automation and scraping">
        <p>
          You may use the Service programmatically only through interfaces we expose for that purpose and under the
          rate and concurrency limits we document. You must not scrape, crawl, or index the Service, nor use scripts
          to automate web UI usage, except for accessibility tools. You must not harvest other users' content or
          metadata.
        </p>
      </LegalSection>

      <LegalSection id="reselling" title="9. Resale and multi-tenant use">
        <p>
          You must not resell raw generation access, repackage the Service as a competing product, or build a
          multi-tenant service on top of your single-user plan. If you want to build a product on top of Omnia Creata
          Studio, contact <LegalPlaceholder>partnerships@omniacreata.com</LegalPlaceholder> about an appropriate
          agreement.
        </p>
      </LegalSection>

      <LegalSection id="regulated" title="10. Regulated and sensitive industries">
        <p>
          Outputs of the Service are not certified or cleared for:
        </p>
        <LegalList
          items={[
            'Medical diagnosis, treatment planning, or any clinical use;',
            'Legal advice, the drafting of binding legal instruments, or evidentiary use;',
            'Safety-of-life systems, critical infrastructure control, or autonomous vehicle operation;',
            'Biometric identification of individuals;',
            'Financial advice or regulated financial product recommendations;',
            'Any use where an automated decision has legal or similarly significant effect on a person, unless you put appropriate human oversight in place.',
          ]}
        />
        <p>
          You remain responsible for compliance with any industry-specific regulation that applies to how you use the
          outputs.
        </p>
      </LegalSection>

      <LegalSection id="disclosures" title="11. Disclosure of AI-generated media">
        <p>
          Where the jurisdiction or platform you publish to requires disclosure that content is AI-generated
          (including under the EU AI Act provisions on synthetic media, election-period rules, platform policies, or
          advertising standards), you are responsible for providing that disclosure. We may embed provenance metadata
          (e.g., C2PA) or visible markers in outputs; you must not remove or alter them where doing so would
          circumvent a disclosure obligation.
        </p>
      </LegalSection>

      <LegalSection id="moderation" title="12. Moderation and filters">
        <p>
          We operate automated safety classifiers on prompts, reference images, and outputs. We additionally sample
          content for human review where a classifier flags a risk, where a report is received, or where
          investigation is otherwise warranted.
        </p>
        <p>
          Classifiers are imperfect. They sometimes block legitimate content and sometimes miss prohibited content.
          When a legitimate prompt is blocked, you may revise it or appeal. When prohibited content slips through, we
          enforce on it once it is identified. Automated blocking does not consume credits.
        </p>
      </LegalSection>

      <LegalSection id="reporting" title="13. Reporting abuse">
        <p>
          If you encounter content on the Service that you believe violates this AUP or the law, report it:
        </p>
        <LegalList
          items={[
            <>
              For CSAM or child safety: <LegalPlaceholder>child-safety@omniacreata.com</LegalPlaceholder>. We treat
              these reports as priority and cooperate with competent authorities.
            </>,
            <>
              For non-consensual intimate imagery, harassment, or other urgent harms:{' '}
              <LegalPlaceholder>abuse@omniacreata.com</LegalPlaceholder>.
            </>,
            <>
              For copyright or trademark infringement: see Section 11 of the{' '}
              <Link to="/legal/terms" className="text-white underline-offset-4 hover:underline">
                Terms of Service
              </Link>{' '}
              for the notice procedure.
            </>,
            <>
              For anything else: <LegalPlaceholder>support@omniacreata.com</LegalPlaceholder>.
            </>,
          ]}
        />
        <p>Include, where possible, URLs, account handles, timestamps, and a description of the issue.</p>
      </LegalSection>

      <LegalSection id="enforcement" title="14. Enforcement">
        <p>
          We take a graduated approach, calibrated to severity, history, and intent:
        </p>
        <LegalList
          items={[
            'Blocking of the specific request at generation time (no credit consumed);',
            'Removal of the offending output, including from public galleries;',
            'Forfeiture of credits associated with the violating activity;',
            'Feature restrictions (e.g., rate limits, ineligibility for public publishing);',
            'Temporary suspension of the account, pending investigation or cooling-off;',
            'Permanent termination, without refund of unused credits, for serious or repeated violations;',
            'Reporting to law enforcement or regulators where legally required or where harm to third parties necessitates it.',
          ]}
        />
        <p>
          For the most serious violations (in particular those set out in Section 3.1, 3.2, 3.3, 3.5, and 3.8), we
          enforce immediately and without prior notice.
        </p>
      </LegalSection>

      <LegalSection id="appeals" title="15. Appeals">
        <p>
          If you believe an enforcement action was made in error, you may appeal by replying to the enforcement
          notice or emailing <LegalPlaceholder>appeals@omniacreata.com</LegalPlaceholder> within thirty (30) days.
          Include your account identifier, the decision you are appealing, and any evidence you wish us to consider.
          A staff member not involved in the original decision will review the appeal and respond in writing.
        </p>
        <p>
          For Union users, your rights under the EU Digital Services Act — including the right to use certified
          out-of-court dispute settlement bodies — are preserved.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="16. Changes to this policy">
        <p>
          We update this AUP as the Service, the threat landscape, and the law evolve. The "Last updated"
          date at the top of the page reflects the current version. Material changes are announced in-app or by email
          with reasonable notice; changes required for safety or legal reasons may take effect immediately.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="17. Contact">
        <p>
          Questions about this AUP: <LegalPlaceholder>policy@omniacreata.com</LegalPlaceholder>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
