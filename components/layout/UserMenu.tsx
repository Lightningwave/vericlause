"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "../providers/language-provider";

export function UserMenu({ onSignOut }: { onSignOut?: () => void | Promise<void> }) {
  const { t } = useLanguage();
  const router = useRouter();
  /** `null` = still checking session */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (signedIn === null) {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-slate-100" aria-hidden />;
  }

  if (signedIn) {
    return (
      <button
        type="button"
        onClick={async () => {
          if (onSignOut) {
            await onSignOut();
          }
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        }}
        className="text-sm font-medium text-slate-600 transition-colors hover:text-navy-950"
      >
        {t("dash_sign_out")}
      </button>
    );
  }

  return (
    <Link
      href="/auth/sign-in"
      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {t("sign_in")}
    </Link>
  );
}
