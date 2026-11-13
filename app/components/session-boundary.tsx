"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/** Discard account-scoped client state whenever the authenticated identity changes.
 * This is UI cache isolation; database RLS remains the authorization boundary.
 * Same-account refreshes preserve form state.
 */
export default function SessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [identity, setIdentity] = useState("initial");
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIdentity(session?.user.id ?? "anonymous");
    });
    return () => subscription.unsubscribe();
  }, []);
  const accountPage = [
    "/dashboard",
    "/customers",
    "/invoices",
    "/settings",
  ].some((path) => pathname === path || pathname.startsWith(path + "/"));
  // Recovery links consume one-use credentials; auth pages must not remount on their own auth events.
  if (!accountPage) return children;
  if (identity === "initial")
    return (
      <p role="status" className="p-6">
        Loading account…
      </p>
    );
  return <Fragment key={identity}>{children}</Fragment>;
}
