export const LEGAL_LAST_UPDATED_LABEL = 'May 9, 2026'
export const LEGAL_EFFECTIVE_DATE_LABEL = 'May 9, 2026'

/**
 * Public role aliases route into the founder-operated mailbox today.
 * Keep pages on role addresses so Studio can scale without exposing hidden
 * owner/admin accounts.
 */
export const LEGAL_CONTACTS = {
  support: 'hello@omniacreata.com',
  billing: 'billing@omniacreata.com',
  safety: 'privacy@omniacreata.com',
  privacy: 'privacy@omniacreata.com',
  legal: 'privacy@omniacreata.com',
  security: 'privacy@omniacreata.com',
  partnerships: 'partnerships@omniacreata.com',
} as const

export const LEGAL_PRELAUNCH_DISCLOSURE =
  'OmniaCreata Studio is currently operating under the OmniaCreata brand while formal business registration and public billing details are being finalized. Registered business details and any required regional representatives will be published before the self-serve public paid launch opens.'

const LEGAL_PLACEHOLDER_MAP: Record<string, string> = {
  'Omnia Creata Legal Entity Name': import.meta.env.VITE_LEGAL_ENTITY_NAME || 'Omnia Creata, a founder-operated service',
  'Registered Address': import.meta.env.VITE_LEGAL_ADDRESS || 'Our registered business address will be published before the self-serve public paid launch opens.',
  'Company Registration No.': import.meta.env.VITE_LEGAL_REGISTRATION_NO || 'Registration details pending public launch.',
  'Governing Jurisdiction - e.g. Republic of Turkiye': import.meta.env.VITE_LEGAL_JURISDICTION || 'Republic of Turkiye',
  'City, Country': import.meta.env.VITE_LEGAL_CITY_COUNTRY || 'Istanbul, Turkiye',
  'privacy@omniacreata.com': LEGAL_CONTACTS.privacy,
  'dpo@omniacreata.com': LEGAL_CONTACTS.privacy,
  'kvkk@omniacreata.com': LEGAL_CONTACTS.privacy,
  'security@omniacreata.com': LEGAL_CONTACTS.security,
  'help.omniacreata.com/wellbeing': '/help',
  'partnerships@omniacreata.com': LEGAL_CONTACTS.partnerships,
  'child-safety@omniacreata.com': LEGAL_CONTACTS.safety,
  'abuse@omniacreata.com': LEGAL_CONTACTS.safety,
  'appeals@omniacreata.com': LEGAL_CONTACTS.safety,
  'policy@omniacreata.com': LEGAL_CONTACTS.legal,
  'Hosting Provider Name, Region': 'Render and Supabase (region varies by deployment environment)',
  'CDN Provider, Region': 'Vercel Edge Network and Cloudflare security services when enabled',
  'CDN Provider': 'Vercel Edge Network and Cloudflare security services when enabled',
  'Upstream Model Provider(s)': 'OpenAI, OpenRouter, Runware, and any explicitly enabled Google provider lanes',
  'Payment Provider Name, Region': 'To be published before paid checkout opens',
  'Email Provider': 'Resend when transactional email is enabled',
  'Analytics/Monitoring Provider': 'PostHog, only after analytics consent',
  'Support Tool': 'Direct email support plus internal operator tooling',
  'Primary Operating Jurisdiction': import.meta.env.VITE_LEGAL_JURISDICTION || 'Republic of Turkiye',
  'analytics_provider_*': 'PostHog-managed analytics storage',
  'payment_provider_*': 'Payment-provider checkout storage when paid billing is enabled',
}

export function resolveLegalPlaceholder(label: string) {
  return LEGAL_PLACEHOLDER_MAP[label.trim()] ?? null
}
