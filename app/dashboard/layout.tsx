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
              className="ui-button-secondary min-h-11 w-full px-4 py-2.5 text-center text-sm sm:w-auto"
            >
              View submission status & timeline
            </Link>
          </div>
          <div className="ui-panel-muted px-4 py-4 sm:px-5">
            <h2 className="font-semibold text-slate-200">Automatic security scanning and publishing</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Every Luma Store submission is checked automatically. A security scan and automated validation run after submission, and apps that pass are approved for publishing automatically.
            </p>
          </div>
        </div>
        {children}
      </div>
    </AuthGate>
  );
}
