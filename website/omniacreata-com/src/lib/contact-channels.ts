export const contactChannels = {
  general: "contact@omniacreata.com",
  support: "support@omniacreata.com",
  billing: "billing@omniacreata.com",
  legal: "legal@omniacreata.com",
  partnerships: "partnerships@omniacreata.com",
  studio: "studio@omniacreata.com",
} as const;

export function mailto(address: string) {
  return `mailto:${address}`;
}
