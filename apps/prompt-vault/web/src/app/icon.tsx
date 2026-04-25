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
            "radial-gradient(circle at 20% 18%, rgba(213,121,85,0.24), transparent 32%), radial-gradient(circle at 78% 82%, rgba(47,111,98,0.22), transparent 38%), linear-gradient(165deg, #fbf4e8 0%, #f6efe3 56%, #e7d8c1 100%)"
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
            border: "2px solid rgba(47,111,98,0.22)",
            background:
              "linear-gradient(180deg, rgba(255,252,245,0.96) 0%, rgba(246,239,227,0.98) 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.7) inset, 0 28px 58px rgba(69,51,31,0.18), 0 10px 22px rgba(47,111,98,0.16)"
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
              border: "10px solid #2f6f62",
              background:
                "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.72), rgba(47,111,98,0.16) 68%)",
              boxShadow: "0 0 0 1px rgba(47,111,98,0.14) inset"
            }}
          >
            <div
              style={{
                width: 26,
                height: 54,
                borderRadius: 999,
                background: "#2f6f62",
                boxShadow: "0 0 0 8px rgba(47,111,98,0.14)"
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
