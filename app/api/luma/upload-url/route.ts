import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "luma-apps";
const ALLOWED = {
  apk: { platform: "Android", extension: ".apk" },
  exe: { platform: "Windows", extension: ".exe" },
  deb: { platform: "Linux", extension: ".deb" },
  rpm: { platform: "Linux", extension: ".rpm" },
} as const;

type PackageType = keyof typeof ALLOWED;

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._+-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-160);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const accessToken = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your Luma Store session is invalid or expired." }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as {
      fileName?: string;
      platform?: string;
      packageType?: string;
    } | null;

    const packageType = body?.packageType as PackageType | undefined;
    const config = packageType ? ALLOWED[packageType] : undefined;
    if (!config || body?.platform !== config.platform) {
      return NextResponse.json({ error: "Unsupported platform or file type." }, { status: 400 });
    }

    const fileName = safeFileName(body?.fileName || "");
    if (!fileName || !fileName.toLowerCase().endsWith(config.extension)) {
      return NextResponse.json(
        { error: `The selected file must use the ${config.extension} extension.` },
        { status: 400 },
      );
    }

    const objectPath = [
      "developer-uploads",
      authData.user.id,
      Date.now().toString(),
      crypto.randomUUID(),
      fileName,
    ].join("/");

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signError || !signed?.token) {
      throw signError || new Error("Could not create upload URL.");
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    return NextResponse.json({
      path: objectPath,
      token: signed.token,
      publicUrl: publicData.publicUrl,
    });
  } catch (error) {
    console.error("Luma artifact upload URL failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare upload." },
      { status: 500 },
    );
  }
}
