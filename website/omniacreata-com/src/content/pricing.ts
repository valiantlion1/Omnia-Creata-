export const studioPricing = {
  plans: {
    free: {
      priceUsd: 0,
      monthlyCredits: 0,
    },
    creator: {
      priceUsd: 12,
      monthlyCredits: 400,
    },
    pro: {
      priceUsd: 24,
      monthlyCredits: 1200,
    },
  },
  creditPacks: {
    small: {
      credits: 200,
      priceUsd: 8,
    },
    large: {
      credits: 800,
      priceUsd: 24,
    },
  },
} as const;

export function formatUsd(value: number) {
  return `$${value}`;
}

export function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
