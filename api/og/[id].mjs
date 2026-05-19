export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    const eventRes = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${id}&select=title,description,image_url,date,location,start_time,end_time`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await eventRes.json();
    const event = data?.[0];

    const eventTitle = event?.title ? event.title.replace(/"/g, '&quot;') : 'Gatherr Event';
    const description = event?.description
      ? event.description.replace(/\n/g, ' ').replace(/"/g, '&quot;').slice(0, 200)
      : 'Join us for this event on Gatherr!';
    const image = event?.image_url || 'https://gatherr-one.vercel.app/Gatherr.jpg';
    const date = event?.date
      ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        })
      : '';
    const formatTime = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
    };
    const startTime = formatTime(event?.start_time);
    const endTime = formatTime(event?.end_time);
    const timeStr = startTime && endTime ? `${startTime}–${endTime}` : startTime;
    const location = event?.location || '';
    // Include date + time in title so iMessage/Messenger shows them
    const datePart = [date, timeStr].filter(Boolean).join(' at ');
    const title = datePart ? `${eventTitle} · ${datePart}` : eventTitle;
    // Time goes first in description so FB shows it even if title is truncated
    const fullDescription = [timeStr, location, description].filter(Boolean).join(' · ');
    const canonicalUrl = `https://gatherr-one.vercel.app/event/${id}`;
    // Regular users get redirected to /e/:id (served by React app via catch-all)
    const appUrl = `https://gatherr-one.vercel.app/e/${id}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${fullDescription}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gatherr" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${fullDescription}" />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <script>window.location.replace("${appUrl}");</script>
    <p><a href="${appUrl}">${title}</a></p>
  </body>
</html>`);
  } catch (e) {
    console.error(e);
    // Never 302 redirect — bots follow it and land on generic React app
    // Use JS-only redirect so bots stay here and read the fallback OG tags
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Gatherr Event</title>
    <meta property="og:title" content="Gatherr Event" />
    <meta property="og:description" content="Join us for this event on Gatherr!" />
    <meta property="og:image" content="https://gatherr-one.vercel.app/Gatherr.jpg" />
    <meta property="og:site_name" content="Gatherr" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <script>window.location.replace("https://gatherr-one.vercel.app/e/${id}");</script>
  </body>
</html>`);
  }
}
