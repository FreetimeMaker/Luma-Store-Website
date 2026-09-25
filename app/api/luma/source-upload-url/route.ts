import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "luma-source-archives";

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[^A-Za-z0-9._+-]+/g, "_").replace(/^_+|_+$/g, "").slice(-140);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

    const supabase = createAdminClient();
    const accessToken = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });

    const body = await request.json().catch(() => null) as { fileName?: string; size?: number } | null;
    const fileName = safeFileName(body?.fileName || "");
    const size = Number(body?.size || 0);
    if (!fileName.toLowerCase().endsWith(".zip")) return NextResponse.json({ error: "Closed-source submissions require a .zip source archive." }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > 100 * 1024 * 1024) return NextResponse.json({ error: "The source ZIP must be between 1 byte and 100 MB." }, { status: 400 });

    const objectPath = ["developer-source", authData.user.id, Date.now().toString(), crypto.randomUUID(), fileName].join("/");
    const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(objectPath);
    if (signError || !signed?.token) throw signError || new Error("Could not create source upload URL.");

    return NextResponse.json({ path: objectPath, token: signed.token });
  } catch (error) {
    console.error("Luma source upload URL failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare source upload." }, { status: 500 });
  }
}
