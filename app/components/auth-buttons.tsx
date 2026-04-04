"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);
      router.refresh();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
    setBusy(false);
  }

  if (loading) {
    return <div className="text-sm text-slate-400">Checking account...</div>;
  }

  if (!email) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname || "/dashboard")}`}
        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-400 md:inline">{email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
      >
        {busy ? "Signing out..." : "Logout"}
      </button>
    </div>
  );
}