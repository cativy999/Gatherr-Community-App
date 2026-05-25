import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const BOT_AGENTS = [
  "facebookexternalhit",
  "facebookcatalog",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "slackbot",
  "telegrambot",
  "discordbot",
  "googlebot",
  "bingbot",
  "applebot",
  "iframely",
  "embedly",
  "crawler",
  "spider",
  "bot",
];

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
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const isBot = BOT_AGENTS.some((b) => ua.includes(b));

  // Non-bots: serve the React SPA directly so the app loads normally
  if (!isBot) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const indexUrl = `${proto}://${host}/index.html`;
    try {
      const upstream = await fetch(indexUrl);
      const html = await upstream.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.send(html);
    } catch {
      // Fallback redirect if fetch fails
      res.setHeader("Location", "/");
      return res.status(302).end();
    }
  }

  // Bots: fetch event data and return OG-rich HTML
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

  // Format date if available
  let dateStr = "";
  if (event?.date) {
    const [y, m, d] = event.date.split("-").map(Number);
    dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  const description = dateStr
    ? `${dateStr}${event?.location ? ` · ${event.location}` : ""} — ${rawDesc}`
    : rawDesc;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} | Gatherr</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph (Facebook, iMessage, WhatsApp) -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Gatherr" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(url)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <p>Loading <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>…</p>
</body>
</html>`);
}
