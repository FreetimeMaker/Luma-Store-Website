import Link from "next/link";
import type { ReactNode } from "react";
import AuthGate from "./AuthGate";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="glass-page min-w-0 space-y-4 sm:space-y-6">
        <div className="mx-auto max-w-6xl min-w-0 space-y-3 px-0 sm:px-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/status"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-indigo-700/50 bg-indigo-950/30 px-4 py-2.5 text-center text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-900/40 sm:w-auto"
            >
              View submission status & timeline
            </Link>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-4 sm:px-5">
            <h2 className="font-semibold text-amber-200">Automatic security scanning and publishing</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-100/80">
              Every Luma Store submission is checked automatically. A security scan and automated validation run after submission, and apps that pass are approved for publishing automatically.
            </p>
          </div>
        </div>
        {children}
      </div>
    </AuthGate>
  );
}
