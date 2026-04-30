/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "OmniaCreata";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function getLogoDataUrl() {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-transparent.png");
  const logoBuffer = await readFile(logoPath);

  return `data:image/png;base64,${logoBuffer.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const logoDataUrl = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top, rgba(217,181,109,0.22), transparent 32%), linear-gradient(180deg, #0b0b0b 0%, #040404 100%)",
          padding: "56px 64px",
          color: "#f8f4ec",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 30,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 5,
                textTransform: "uppercase",
                color: "#d9b56d",
              }}
            >
              omniacreata.com
            </div>
            <div style={{ fontSize: 32, fontWeight: 600 }}>
              Creative software for image work
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 250,
              borderRadius: 30,
              border: "1px solid rgba(217,181,109,0.32)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              padding: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            }}
          >
            <img
              alt="OmniaCreata logo"
              src={logoDataUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 78,
              lineHeight: 1.03,
              fontWeight: 700,
              maxWidth: "88%",
            }}
          >
            OmniaCreata
          </div>
          <div style={{ display: "flex", gap: 18, color: "#d9d1c1", fontSize: 26 }}>
            <div>OmniaCreata Studio</div>
            <div>Software for image work with taste.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
