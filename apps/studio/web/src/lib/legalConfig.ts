export const LEGAL_LAST_UPDATED_LABEL = 'April 19, 2026'
export const LEGAL_EFFECTIVE_DATE_LABEL = 'April 19, 2026'

/**
 * All contact addresses currently route to founder@omniacreata.com.
 * When department aliases (Google Workspace groups or additional mailboxes)
 * are set up, update only the values below - every legal page, help page,
 * and signup flow pulls from this single source.
 */
export const LEGAL_CONTACTS = {
  support: 'founder@omniacreata.com',
  billing: 'founder@omniacreata.com',
  safety: 'founder@omniacreata.com',
  privacy: 'founder@omniacreata.com',
  legal: 'founder@omniacreata.com',
  security: 'founder@omniacreata.com',
} as const

export const LEGAL_PRELAUNCH_DISCLOSURE =
  'OmniaCreata Studio operates under the OmniaCreata brand. Required public business details will be listed where legally required.'

const LEGAL_PLACEHOLDER_MAP: Record<string, string> = {
  'Omnia Creata Legal Entity Name': 'Omnia Creata, a founder-operated service',
  'Registered Address': 'Address details will be provided where legally required.',
  'Company Registration No.': 'Registration details will be provided where legally required.',
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
  'Hosting Provider Name, Region': 'Render and Supabase',
  'CDN Provider, Region': 'Vercel Edge Network and Cloudflare security services when enabled',
  'CDN Provider': 'Vercel Edge Network and Cloudflare security services when enabled',
  'Upstream Model Provider(s)': 'OpenAI, OpenRouter, Runware, and enabled image partners',
  'Email Provider': 'Resend when transactional email is enabled',
  'Analytics/Monitoring Provider': 'Optional analytics, only after consent',
  'Support Tool': 'Direct email support',
  'Primary Operating Jurisdiction': 'Republic of Turkiye',
  'analytics_provider_*': 'Optional analytics storage',
  'paddle_*': 'Paddle checkout storage when billing is enabled',
}

export function resolveLegalPlaceholder(label: string) {
  return LEGAL_PLACEHOLDER_MAP[label.trim()] ?? null
}
