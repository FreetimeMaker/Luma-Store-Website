import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectSourceZip } from "@/lib/luma/sourceArchive";

const BUCKET = "luma-source-archives";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const supabase = createAdminClient();
    const accessToken = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });

    const body = await request.json().catch(() => null) as { path?: string } | null;
    const path = body?.path?.trim() || "";
    const expectedPrefix = `developer-source/${authData.user.id}/`;
    if (!path.startsWith(expectedPrefix) || !path.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "Invalid source archive path." }, { status: 400 });

    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) throw error || new Error("Source archive could not be read.");
    if (data.size > 100 * 1024 * 1024) return NextResponse.json({ error: "The source ZIP exceeds 100 MB." }, { status: 400 });

    const inspection = inspectSourceZip(new Uint8Array(await data.arrayBuffer()));
    return NextResponse.json({ verified: true, size: data.size, inspection, reviewStatus: "Pending" });
  } catch (error) {
    console.error("Luma source archive verification failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Source ZIP verification failed." }, { status: 400 });
  }
}
