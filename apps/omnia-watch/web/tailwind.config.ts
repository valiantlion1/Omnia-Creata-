import type { Config } from "tailwindcss";
import preset from "@omnia-watch/config/tailwind-preset";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  presets: [preset]
};

export default config;
