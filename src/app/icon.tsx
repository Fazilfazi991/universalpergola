import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a09", color: "#d4b47f", borderTop: "4px solid #b68a45", fontSize: 22, fontWeight: 700, letterSpacing: "-2px" }}>UP</div>,
    size,
  );
}
