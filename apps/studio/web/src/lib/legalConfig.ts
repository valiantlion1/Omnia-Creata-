export const LEGAL_LAST_UPDATED_LABEL = 'April 18, 2026'
export const LEGAL_EFFECTIVE_DATE_LABEL = 'April 18, 2026'

export const LEGAL_CONTACTS = {
  support: 'support@omniacreata.com',
  billing: 'billing@omniacreata.com',
  safety: 'safety@omniacreata.com',
  privacy: 'privacy@omniacreata.com',
  legal: 'legal@omniacreata.com',
  security: 'security@omniacreata.com',
} as const

export const LEGAL_PRELAUNCH_DISCLOSURE =
  'Omnia Creata Studio is currently operated directly by its founder while formal company registration and public billing details are being finalized. Registered business details and any required regional representatives will be published before the self-serve public paid launch opens.'

const LEGAL_PLACEHOLDER_MAP: Record<string, string> = {
  'Omnia Creata Legal Entity Name': 'Omnia Creata, a founder-operated service',
  'Registered Address': 'Our registered business address will be published before the self-serve public paid launch opens.',
  'Company Registration No.': 'Formal company registration details will be published before the self-serve public paid launch opens.',
  'Governing Jurisdiction — e.g. Republic of Türkiye': 'Republic of Turkiye',
  'Governing Jurisdiction - e.g. Republic of Turkiye': 'Republic of Turkiye',
  'City, Country': 'Istanbul, Turkiye',
  'privacy@omniacreata.com': LEGAL_CONTACTS.privacy,
  'dpo@omniacreata.com': LEGAL_CONTACTS.privacy,
  'kvkk@omniacreata.com': LEGAL_CONTACTS.privacy,
  'security@omniacreata.com': LEGAL_CONTACTS.security,
  'help.omniacreata.com/wellbeing': '/help',
  'partnerships@omniacreata.com': LEGAL_CONTACTS.support,
  'child-safety@omniacreata.com': LEGAL_CONTACTS.safety,
  'abuse@omniacreata.com': LEGAL_CONTACTS.safety,
  'appeals@omniacreata.com': LEGAL_CONTACTS.safety,
  'policy@omniacreata.com': LEGAL_CONTACTS.legal,
  'Hosting Provider Name, Region': 'Render and Supabase (region varies by deployment environment)',
  'CDN Provider, Region': 'Vercel Edge Network and Cloudflare security services when enabled',
  'CDN Provider': 'Vercel Edge Network and Cloudflare security services when enabled',
  'Upstream Model Provider(s)': 'OpenAI, OpenRouter, Runware, and any explicitly enabled Google provider lanes',
  'Email Provider': 'Resend when transactional email is enabled',
  'Analytics/Monitoring Provider': 'PostHog, only after analytics consent',
  'Support Tool': 'Direct email support plus internal operator tooling',
  'Primary Operating Jurisdiction': 'Republic of Turkiye',
  'analytics_provider_*': 'PostHog-managed analytics storage',
  'paddle_*': 'Paddle checkout storage when billing is enabled',
}

export function resolveLegalPlaceholder(label: string) {
  return LEGAL_PLACEHOLDER_MAP[label.trim()] ?? null
}
