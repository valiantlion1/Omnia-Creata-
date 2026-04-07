import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "radial-gradient(circle at top, rgba(61,197,163,0.45), transparent 38%), linear-gradient(180deg, #07110f 0%, #0b1817 100%)",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "112px",
          color: "#effbf7",
          fontSize: 208,
          fontWeight: 700,
          letterSpacing: "-0.08em"
        }}
      >
        OC
      </div>
    ),
    size
  );
}
