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
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 22% 18%, rgba(240,210,157,0.18), transparent 30%), radial-gradient(circle at 78% 85%, rgba(160,112,45,0.15), transparent 38%), linear-gradient(165deg, #060605 0%, #0f0d0b 48%, #17130f 100%)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 350,
            height: 350,
            borderRadius: 108,
            border: "2px solid rgba(240,210,157,0.44)",
            background:
              "linear-gradient(180deg, rgba(26,21,16,0.96) 0%, rgba(14,11,8,0.98) 100%)",
            boxShadow:
              "0 0 0 1px rgba(240,210,157,0.2) inset, 0 28px 58px rgba(0,0,0,0.35), 0 10px 22px rgba(178,129,63,0.25)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 188,
              height: 188,
              borderRadius: 56,
              border: "10px solid #d9b171",
              background:
                "radial-gradient(circle at 40% 30%, rgba(255,240,207,0.22), rgba(45,31,16,0.86) 65%)",
              boxShadow: "0 0 0 1px rgba(255,236,198,0.35) inset"
            }}
          >
            <div
              style={{
                width: 26,
                height: 54,
                borderRadius: 999,
                background: "#d9b171",
                boxShadow: "0 0 0 8px rgba(217,177,113,0.18)"
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
