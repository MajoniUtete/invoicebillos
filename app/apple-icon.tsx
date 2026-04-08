import { renderAppIcon } from "@/lib/pwa/icon-image";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon({ size: 180, maskable: true });
}
