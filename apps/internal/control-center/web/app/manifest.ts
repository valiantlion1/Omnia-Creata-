import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OCOS",
    short_name: "OCOS",
    description: "OmniaCreata internal incident operating system.",
    start_url: "/",
    display: "standalone",
    background_color: "#081313",
    theme_color: "#0b1514",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
