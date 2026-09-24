"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SavedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="glass-page flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
        Opening dashboard…
      </div>
    </div>
  );
}
