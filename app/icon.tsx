import { renderAppIcon } from "@/lib/pwa/icon-image";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon({ size: 512 });
}
