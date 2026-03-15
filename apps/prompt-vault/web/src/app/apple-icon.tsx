import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            "radial-gradient(circle at 25% 22%, rgba(240,210,157,0.18), transparent 32%), linear-gradient(165deg, #080706 0%, #120f0d 52%, #1a1511 100%)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 124,
            height: 124,
            borderRadius: 38,
            border: "2px solid rgba(240,210,157,0.46)",
            background:
              "linear-gradient(180deg, rgba(30,23,17,0.97) 0%, rgba(15,11,8,0.98) 100%)",
            boxShadow:
              "0 0 0 1px rgba(240,210,157,0.2) inset, 0 10px 24px rgba(0,0,0,0.38), 0 8px 14px rgba(168,116,49,0.22)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 20,
              border: "4px solid #d9b171",
              background:
                "radial-gradient(circle at 42% 30%, rgba(255,240,207,0.24), rgba(45,31,16,0.88) 68%)",
              boxShadow: "0 0 0 1px rgba(255,236,198,0.32) inset"
            }}
          >
            <div
              style={{
                width: 10,
                height: 22,
                borderRadius: 999,
                background: "#d9b171",
                boxShadow: "0 0 0 4px rgba(217,177,113,0.2)"
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
