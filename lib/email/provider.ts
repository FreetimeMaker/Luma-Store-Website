export interface LumaSubmissionNotification {
  email: string;
  developerName?: string | null;
  appName: string;
  status: "Pending" | "In Review" | "Approved" | "Rejected";
  reviewMessage?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(payload: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend failed with HTTP ${response.status}: ${details}`);
  }

  return response.json();
}

export async function sendLumaSubmissionStatusNotification(
  notification: LumaSubmissionNotification
) {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM must be configured");
  }

  const developerName = notification.developerName?.trim() || "Developer";
  const statusCopy: Record<LumaSubmissionNotification["status"], { title: string; body: string }> = {
    Pending: {
      title: "Submission received",
      body: "Your app submission has been received and is queued for automatic security scanning and validation.",
    },
    "In Review": {
      title: "Security warning requires review",
      body: "VirusTotal reported one or more suspicious detections. Automatic publishing has been paused while the submission is reviewed.",
    },
    Approved: {
      title: "Your app has been approved",
      body: "Your app has been approved and is now eligible to appear in the Luma Store API.",
    },
    Rejected: {
      title: "Your app submission was rejected",
      body: "Your app did not pass the automatic checks in its current state. Check the status details below and update your submission if needed.",
    },
  };

  const copy = statusCopy[notification.status];
  const reviewerText = notification.reviewMessage?.trim();

  return sendEmail({
    from,
    to: [notification.email],
    subject: `[Luma Store] ${notification.appName}: ${notification.status}`,
    text: [
      `Hi ${developerName},`,
      "",
      copy.body,
      `App: ${notification.appName}`,
      `Status: ${notification.status}`,
      reviewerText ? `Reviewer message: ${reviewerText}` : null,
      "",
      "You can see the latest status and full timeline in the Luma Store Developer Portal.",
    ].filter(Boolean).join("\n"),
    html: `
      <h2>${escapeHtml(copy.title)}</h2>
      <p>Hi ${escapeHtml(developerName)},</p>
      <p>${escapeHtml(copy.body)}</p>
      <p><strong>App:</strong> ${escapeHtml(notification.appName)}</p>
      <p><strong>Status:</strong> ${escapeHtml(notification.status)}</p>
      ${reviewerText ? `<div style="margin:16px 0;padding:12px;border-left:4px solid #6366f1;background:#f8fafc"><strong>Reviewer message</strong><br>${escapeHtml(reviewerText)}</div>` : ""}
      <p>You can see the latest status and full timeline in the Luma Store Developer Portal.</p>
    `,
  });
}
