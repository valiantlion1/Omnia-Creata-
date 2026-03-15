import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@prompt-vault/config",
    "@prompt-vault/i18n",
    "@prompt-vault/types",
    "@prompt-vault/validation"
  ]
};

export default nextConfig;
