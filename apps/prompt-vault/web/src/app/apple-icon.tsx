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
            "radial-gradient(circle at 25% 22%, rgba(213,121,85,0.24), transparent 32%), linear-gradient(165deg, #fbf4e8 0%, #f6efe3 58%, #e7d8c1 100%)"
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
            border: "2px solid rgba(47,111,98,0.22)",
            background:
              "linear-gradient(180deg, rgba(255,252,245,0.97) 0%, rgba(246,239,227,0.98) 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.7) inset, 0 10px 24px rgba(69,51,31,0.18), 0 8px 14px rgba(47,111,98,0.16)"
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
              border: "4px solid #2f6f62",
              background:
                "radial-gradient(circle at 42% 30%, rgba(255,255,255,0.72), rgba(47,111,98,0.16) 68%)",
              boxShadow: "0 0 0 1px rgba(47,111,98,0.14) inset"
            }}
          >
            <div
              style={{
                width: 10,
                height: 22,
                borderRadius: 999,
                background: "#2f6f62",
                boxShadow: "0 0 0 4px rgba(47,111,98,0.14)"
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
