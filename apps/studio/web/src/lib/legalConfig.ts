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
  'Omnia Creata Studio is currently a founder-operated prelaunch service. Full registered company details, billing registrations, and any required regional representatives will be published before the broader public paid launch.'

const LEGAL_PLACEHOLDER_MAP: Record<string, string> = {
  'Omnia Creata Legal Entity Name': 'Omnia Creata (founder-operated prelaunch service)',
  'Registered Address': 'Full registered address will be published before the broader public paid launch.',
  'Company Registration No.': 'Formal registration details will be published before the broader public paid launch.',
  'Governing Jurisdiction — e.g. Republic of Türkiye': 'Republic of Türkiye',
  'City, Country': 'Istanbul, Türkiye',
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
  'Upstream Model Provider(s)': 'Runware, OpenAI, OpenRouter, and enabled Google provider lanes',
  'Email Provider': 'Resend when transactional email is enabled',
  'Analytics/Monitoring Provider': 'PostHog, only after analytics consent',
  'Support Tool': 'Direct email support plus internal operator tooling',
  'Primary Operating Jurisdiction': 'Republic of Türkiye',
  'analytics_provider_*': 'PostHog-managed analytics storage',
  'paddle_*': 'Paddle checkout storage when billing is enabled',
}

export function resolveLegalPlaceholder(label: string) {
  return LEGAL_PLACEHOLDER_MAP[label.trim()] ?? null
}
