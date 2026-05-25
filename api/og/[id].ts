import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

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
  const url = `${baseUrl}/event/${id}`;

  let dateStr = "";
  if (event?.date) {
    const [y, m, d] = event.date.split("-").map(Number);
    dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  let timeStr = "";
  if (event?.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    timeStr = `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const description = [
    dateStr && timeStr ? `${dateStr} at ${timeStr}` : dateStr || timeStr,
    event?.location,
    rawDesc,
  ]
    .filter(Boolean)
    .join(" · ");

  // Read the built React app HTML and inject event-specific OG tags.
  // This way ALL clients (bots, iMessage, WhatsApp, real browsers) get
  // the correct preview — no redirect needed, the React app loads normally.
  let html: string;
  try {
    html = readFileSync(join(process.cwd(), "dist", "index.html"), "utf-8");
  } catch {
    // Fallback: serve a minimal OG page if dist/index.html isn't available
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!DOCTYPE html><html><head>
      <meta property="og:title" content="${escapeHtml(title)}" />
      <meta property="og:description" content="${escapeHtml(description)}" />
      <meta property="og:image" content="${escapeHtml(image)}" />
      <meta property="og:url" content="${escapeHtml(url)}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeHtml(title)}" />
      <meta name="twitter:image" content="${escapeHtml(image)}" />
    </head><body><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></body></html>`);
  }

  // Replace the generic OG tags with event-specific ones
  html = html
    .replace(
      /(<title>)[^<]*/,
      `$1${escapeHtml(title)} | Gatherr`
    )
    .replace(
      /(<meta property="og:title" content=")[^"]*/,
      `$1${escapeHtml(title)}`
    )
    .replace(
      /(<meta property="og:description" content=")[^"]*/,
      `$1${escapeHtml(description)}`
    )
    .replace(
      /(<meta property="og:image" content=")[^"]*/,
      `$1${escapeHtml(image)}`
    )
    .replace(
      /(<meta name="twitter:image" content=")[^"]*/,
      `$1${escapeHtml(image)}`
    )
    // Add og:url + twitter title/description right before </head>
    .replace(
      "</head>",
      `  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Gatherr" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
</head>`
    );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.send(html);
}
