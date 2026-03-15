import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@omnia-watch/design-tokens",
    "@omnia-watch/i18n",
    "@omnia-watch/types",
    "@omnia-watch/ui",
    "@omnia-watch/utils",
    "@omnia-watch/validation"
  ]
};

export default nextConfig;
