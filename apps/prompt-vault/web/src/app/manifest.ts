import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prompt Vault",
    short_name: "Prompt Vault",
    description:
      "Prompt Vault is the premium prompt operating system for saving, organizing, syncing, and reusing prompts.",
    id: "/app",
    start_url: "/en/app",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#0b0a09",
    lang: "en",
    orientation: "any",
    categories: ["productivity", "utilities", "business"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
