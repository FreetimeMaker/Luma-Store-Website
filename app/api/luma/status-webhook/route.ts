import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLumaSubmissionStatusNotification } from "@/lib/email/provider";

interface SubmissionRecord {
  id: string;
  user_id: string;
  name: string;
  status: "Pending" | "In Review" | "Approved" | "Rejected";
  review_message?: string | null;
  package_name?: string | null;
  version_code?: number | string | null;
  version?: string | null;
  short_description?: string | null;
  description?: string | null;
  changelog?: string | null;
  screenshots?: string[] | null;
  category?: string | null;
  categories?: string[] | null;
  license_type?: string | null;
  icon_url?: string | null;
  download_url?: string | null;
  website_url?: string | null;
  issue_tracker_url?: string | null;
  translation_url?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  author_website?: string | null;
  donate_url?: string | null;
  liberapay?: string | null;
  opencollective?: string | null;
  bitcoin?: string | null;
  litecoin?: string | null;
}

interface SupabaseWebhookPayload {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: SubmissionRecord;
  old_record?: Partial<SubmissionRecord> | null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function POST(request: Request) {
  const configuredSecret = process.env.LUMA_STATUS_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-luma-webhook-secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let stage = "parse-payload";

  try {
    const payload = (await request.json()) as SupabaseWebhookPayload;

    if (
      payload.table !== "luma_submissions" ||
      !payload.record ||
      !["INSERT", "UPDATE"].includes(payload.type ?? "")
    ) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const current = payload.record;

    if (payload.type === "UPDATE") {
      const previous = payload.old_record;
      const statusChanged = previous?.status !== current.status;
      const reviewMessageChanged = previous?.review_message !== current.review_message;

      if (!statusChanged && !reviewMessageChanged) {
        return NextResponse.json({ ok: true, ignored: true });
      }
    }

    stage = "resolve-developer";
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(current.user_id);
    const user = data.user;
    const email = user?.email;

    if (error || !user || !email) {
      console.error("Could not resolve submission developer:", error);
      return NextResponse.json(
        { error: "Developer account could not be resolved.", stage },
        { status: 404 }
      );
    }

    stage = "send-email";
    await sendLumaSubmissionStatusNotification({
      email,
      developerName: user.user_metadata?.full_name || user.user_metadata?.name || null,
      appName: current.name,
      status: current.status,
      reviewMessage: current.review_message || null,
    });

    return NextResponse.json({ ok: true, notificationSent: true });
  } catch (error) {
    const message = errorMessage(error);
    console.error(`Luma status webhook failed at ${stage}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed.", stage, details: message },
      { status: 500 }
    );
  }
}
