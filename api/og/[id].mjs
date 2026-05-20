export default async function handler(req, res) {
  const { id } = req.query;

  const appUrl = `https://gatherr-one.vercel.app/e/${id}`;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    const eventRes = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${id}&select=title,description,image_url,date,location`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await eventRes.json();
    const event = data?.[0];

    const title = event?.title ? event.title.replace(/"/g, '&quot;') : 'Gatherr Event';
    const image = event?.image_url || 'https://gatherr-one.vercel.app/Gatherr.jpg';
    const date = event?.date
      ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })
      : '';
    const location = event?.location || '';
    const description = [date, location].filter(Boolean).join(' · ');
    const canonicalUrl = `https://gatherr-one.vercel.app/event/${id}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gatherr" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <script>window.location.replace("${appUrl}");</script>
    <p><a href="${appUrl}">${title}</a></p>
  </body>
</html>`);
  } catch (e) {
    console.error(e);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Gatherr Event</title>
    <meta property="og:title" content="Gatherr Event" />
    <meta property="og:image" content="https://gatherr-one.vercel.app/Gatherr.jpg" />
    <meta property="og:site_name" content="Gatherr" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <script>window.location.replace("${appUrl}");</script>
  </body>
</html>`);
  }
}
