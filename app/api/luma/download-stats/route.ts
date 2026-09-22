import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const supabase = createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });
    const { data: apps, error: appsError } = await supabase.from("store_apps").select("id,luma_submission_id").eq("developer_id", authData.user.id);
    if (appsError) throw appsError;
    const stats: Record<string, { app_id: string; total: number; today: number; this_month: number; this_year: number }> = {};
    await Promise.all((apps ?? []).map(async (app: { id: string }) => {
      const { count, error } = await supabase.from("luma_download_events").select("id", { count: "exact", head: true }).eq("app_id", app.id);
      if (error) throw error;
      stats[app.id] = { app_id: app.id, total: Number(count ?? 0), today: 0, this_month: 0, this_year: 0 };
    }));
    return NextResponse.json({ stats, submissionStoreIds: Object.fromEntries((apps ?? []).filter((app: { luma_submission_id?: string | null }) => app.luma_submission_id).map((app: { id: string; luma_submission_id?: string | null }) => [app.luma_submission_id as string, app.id])) });
  } catch (error) {
    console.error("Download stats failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Download stats failed." }, { status: 500 });
  }
}
