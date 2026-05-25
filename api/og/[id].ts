import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  const { data: event } = await supabase
    .from("events")
    .select("title, description, image_url, date, location, start_time")
    .eq("id", id)
    .single();

  const baseUrl = "https://gatherr-one.vercel.app";
  const title = event?.title || "Gatherr Event";
  const rawDesc = event?.description
    ? event.description.slice(0, 200)
    : `Join us for ${title} on Gatherr — find local community events near you.`;
  const image = event?.image_url || `${baseUrl}/Gatherr.jpg`;
  const eventPath = `/event/${id}`;
  const url = `${baseUrl}${eventPath}`;

  // Build a nice description with date + location
  let dateStr = "";
  if (event?.date) {
    const [y, m, d] = event.date.split("-").map(Number);
    dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  const description = [
    dateStr,
    event?.location,
    rawDesc,
  ]
    .filter(Boolean)
    .join(" · ");

  // Human visitors get a JS redirect to the real app URL using ?direct=1
  // which bypasses this rewrite rule (see vercel.json).
  // Bots don't execute JS so they stay and read the OG tags.
  const redirectUrl = `${eventPath}?direct=1`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} | Gatherr</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph — Facebook, iMessage, WhatsApp, Slack -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Gatherr" />
  <meta property="og:title"       content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image"       content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"         content="${escapeHtml(url)}" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image"       content="${escapeHtml(image)}" />

  <!-- Redirect human visitors instantly into the React app -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
  <script>window.location.replace("${redirectUrl}");</script>
</head>
<body>
  <p>Loading <a href="${escapeHtml(redirectUrl)}">${escapeHtml(title)}</a>…</p>
</body>
</html>`);
}
