import entries from '../../../releases/public-whats-new.json'

export type PublicWhatsNewEntry = {
  version: string
  channel: string
  date: string
  title: string
  notes: string[]
}

export const PUBLIC_WHATS_NEW = entries as PublicWhatsNewEntry[]
export const LATEST_WHATS_NEW = PUBLIC_WHATS_NEW[0] ?? null
