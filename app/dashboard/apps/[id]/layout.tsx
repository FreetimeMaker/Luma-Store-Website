import Link from "next/link";
import type { ReactNode } from "react";

export default async function AppLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="glass-page space-y-5">
      <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 border-b border-white/10 pb-2">
        <Link href={`/dashboard/apps/${id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">App details</Link>
        <Link href={`/dashboard/apps/${id}/metadata`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">App metadata</Link>
      </nav>
      {children}
    </div>
  );
}
