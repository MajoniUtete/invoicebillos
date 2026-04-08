import { renderAppIcon } from "@/lib/pwa/icon-image";

export const runtime = "nodejs";

export async function GET() {
  return renderAppIcon({ size: 192 });
}
