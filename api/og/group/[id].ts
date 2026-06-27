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

  const { data: group } = await supabase
    .from("groups")
    .select("name, description, good_to_know, cover_image_url, avatar_url, address")
    .eq("id", id)
    .single();

  const baseUrl = "https://gatherr-one.vercel.app";
  const title = group?.name || "Gatherr Group";
  const image = group?.cover_image_url || group?.avatar_url || `${baseUrl}/Gatherr.jpg`;
  const url = `${baseUrl}/group/${id}`;

  const rawDesc = group?.description || group?.good_to_know || "Join this community on Gatherr";
  const description = [group?.address, rawDesc.slice(0, 160)].filter(Boolean).join(" · ");

  // ?direct=1 bypasses this rewrite so the React SPA loads normally
  const appUrl = `/group/${id}?direct=1`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)} | Gatherr</title>
  <meta name="description" content="${esc(description)}"/>

  <meta property="og:type"        content="website"/>
  <meta property="og:site_name"   content="Gatherr"/>
  <meta property="og:url"         content="${esc(url)}"/>
  <meta property="og:title"       content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image"       content="${esc(image)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>

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
