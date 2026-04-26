import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /facebookexternalhit|twitterbot|slackbot|whatsapp|telegram|discord|linkedinbot|applebot/i.test(userAgent);

  const { id } = req.query;
  const url = `https://gatherr-one.vercel.app/event/${id}`;

  if (!isBot) {
    return res.redirect(302, url);
  }

  const { data: event } = await supabase
    .from("events")
    .select("title, description, image_url, date")
    .eq("id", id)
    .single();

  if (!event) {
    return res.status(404).send("Event not found");
  }

  const title = event.title ?? "Gatherrr Event";
  const dateFormatted = event.date
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const description = dateFormatted
    ? `${dateFormatted} · ${event.description?.slice(0, 100) ?? ""}`
    : event.description?.slice(0, 150) ?? "Join us for this event!";
  const image = event.image_url ?? "https://gatherr-one.vercel.app/Gatherrlogo.png";

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gatherrr" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <script>window.location.replace("${url}");</script>
    <noscript><a href="${url}">Click here to view the event</a></noscript>
  </body>
</html>`);
}