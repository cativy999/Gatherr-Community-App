import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

export default async function handler(req, res) {
  const { id } = req.query;

  const { data: event } = await supabase
    .from("events")
    .select("title, description, image_url, date")
    .eq("id", id)
    .single();

  if (!event) {
    return res.status(404).send("Event not found");
  }

  const title = event.title ?? "Gatherrr Event";
  const description = event.description?.slice(0, 150) ?? "Join us for this event!";
  const image = event.image_url ?? "https://gatherr-one.vercel.app/og-default.png";
  const url = `https://gatherr-one.vercel.app/event/${id}`;

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${url}" />
  </head>
  <body>Redirecting...</body>
</html>`);
}