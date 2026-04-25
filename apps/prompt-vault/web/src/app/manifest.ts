import { brand } from "@prompt-vault/config";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description:
      `${brand.name} is a fast mobile-first idea system for saving prompts, notes, projects, and reusable thinking.`,
    id: "/app",
    start_url: "/en/app",
    scope: "/",
    display: "standalone",
    background_color: "#f6efe3",
    theme_color: "#f6efe3",
    lang: "en",
    orientation: "portrait",
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
