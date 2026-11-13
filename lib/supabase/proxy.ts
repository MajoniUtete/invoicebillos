import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Legacy recovery links are exchanged on the server before any browser client initializes.
  if (
    request.nextUrl.pathname === "/auth/confirm" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const target = request.nextUrl.clone();
    target.pathname = "/auth/recovery";
    target.search = "";
    target.searchParams.set(
      "code",
      request.nextUrl.searchParams.get("code") || "",
    );
    const redirected = new NextResponse(null, {
      status: 303,
      headers: { Location: target.pathname + target.search },
    });
    redirected.headers.set("Cache-Control", "private, no-store");
    redirected.headers.set("Referrer-Policy", "no-referrer");
    return redirected;
  }
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
