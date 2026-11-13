import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchange before rendering a browser client, so PKCE is consumed exactly once. */
export async function GET(request: NextRequest) {
  const codes = request.nextUrl.searchParams.getAll("code");
  let destination = "/forgot-password?recoveryError=invalid";
  if (codes.length === 1 && codes[0]) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(codes[0]);
    destination = error
      ? "/forgot-password?recoveryError=expired"
      : "/reset-password?fromRecovery=1";
  }
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: destination },
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
