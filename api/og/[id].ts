import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

function esc(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  const { data: event } = await supabase
    .from("events")
    .select("title, description, image_url, date, location, start_time")
    .eq("id", id)
    .single();

  const baseUrl = "https://gatherr-one.vercel.app";
  const title  = event?.title || "Beyond Sunday Event";
  const image  = event?.image_url || `${baseUrl}/byond%20sunsay%20Ig%202.png`;

  // Preserve any cache-busting query params (e.g. ?v=5) in og:url so
  // Messenger/Facebook treat each cache-busted link as a distinct object
  // to re-crawl, instead of deduping to the bare canonical URL.
  const extraParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "id" || key === "direct") continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) extraParams.set(key, v);
  }
  const queryString = extraParams.toString();
  const url = `${baseUrl}/event/${id}${queryString ? `?${queryString}` : ""}`;

  // Build description: "Saturday, May 30 at 10:00 AM · Los Angeles · ..."
  let dateStr = "";
  if (event?.date) {
    const [y, m, d] = event.date.split("-").map(Number);
    dateStr = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
  }
  let timeStr = "";
  if (event?.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    timeStr = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  const when = dateStr && timeStr ? `${dateStr} at ${timeStr}` : dateStr || timeStr;
  const rawDesc = event?.description ? event.description.slice(0, 160) : `Join us on Beyond Sunday`;
  const description = [when, event?.location, rawDesc].filter(Boolean).join(" · ");

  // ?direct=1 bypasses this rewrite so the React SPA loads normally
  const appUrl = `/event/${id}?direct=1`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)} | Beyond Sunday</title>
  <meta name="description" content="${esc(description)}"/>

  <meta property="og:type"        content="website"/>
  <meta property="og:site_name"   content="Beyond Sunday"/>
  <meta property="og:url"         content="${esc(url)}"/>
  <meta property="og:title"       content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image"       content="${esc(image)}"/>
  <meta property="og:image:secure_url" content="${esc(image)}"/>
  <meta property="og:image:type"  content="image/jpeg"/>

  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image"       content="${esc(image)}"/>

  <script>window.location.replace("${appUrl}");</script>
</head>
<body>
  <p><a href="${esc(appUrl)}">${esc(title)}</a></p>
  <p>${esc(description)}</p>
  <img src="${esc(image)}" alt="${esc(title)}" style="max-width:600px"/>
</body>
</html>`);
}
