import { ImageResponse } from "next/og";

type AppIconOptions = {
  size: number;
  maskable?: boolean;
};

export function renderAppIcon({
  size,
  maskable = false,
}: AppIconOptions): ImageResponse {
  const framePadding = maskable ? size * 0.08 : size * 0.16;
  const panelSize = size - framePadding * 2;
  const strokeWidth = Math.max(4, Math.round(size * 0.024));
  const lineWidth = Math.max(8, Math.round(size * 0.055));
  const lineGap = Math.round(size * 0.06);
  const lineX = panelSize * 0.42;
  const innerPadding = panelSize * 0.18;
  const lineY = panelSize * 0.32;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 52%, #134e4a 100%)",
        }}
      >
        <div
          style={{
            width: `${panelSize}px`,
            height: `${panelSize}px`,
            display: "flex",
            position: "relative",
            borderRadius: `${Math.round(size * 0.2)}px`,
            background: "#0f172a",
            border: `${strokeWidth}px solid #1e293b`,
            boxShadow: "0 24px 60px rgba(2, 6, 23, 0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0",
              background:
                "radial-gradient(circle at top right, rgba(34, 197, 94, 0.24), transparent 42%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${innerPadding}px`,
              left: `${innerPadding}px`,
              width: `${Math.round(panelSize * 0.1)}px`,
              height: `${Math.round(panelSize * 0.42)}px`,
              borderRadius: `${Math.round(size * 0.06)}px`,
              background: "#22c55e",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${lineY}px`,
              left: `${lineX}px`,
              width: `${Math.round(panelSize * 0.34)}px`,
              height: `${lineWidth}px`,
              borderRadius: `${lineWidth / 2}px`,
              background: "#f8fafc",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${lineY + lineGap}px`,
              left: `${lineX}px`,
              width: `${Math.round(panelSize * 0.26)}px`,
              height: `${lineWidth}px`,
              borderRadius: `${lineWidth / 2}px`,
              background: "#cbd5e1",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${lineY + lineGap * 2}px`,
              left: `${lineX}px`,
              width: `${Math.round(panelSize * 0.3)}px`,
              height: `${lineWidth}px`,
              borderRadius: `${lineWidth / 2}px`,
              background: "#cbd5e1",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: `${innerPadding}px`,
              bottom: `${innerPadding}px`,
              width: `${Math.round(panelSize * 0.16)}px`,
              height: `${Math.round(panelSize * 0.16)}px`,
              borderRadius: "999px",
              background: "#22c55e",
              boxShadow: "0 0 0 10px rgba(34, 197, 94, 0.14)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
