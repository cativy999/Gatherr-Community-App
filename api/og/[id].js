export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Fetch event data from Supabase
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

    const title = event?.title || 'Gatherr Event';
    const description = event?.description
      ? event.description.replace(/\n/g, ' ').slice(0, 200)
      : 'Join us for this event on Gatherr!';
    const image = event?.image_url || 'https://gatherr-one.vercel.app/Peoplebeach.png';
    const date = event?.date
      ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric',
        })
      : '';
    const location = event?.location || '';
    const fullDescription = [date, location, description].filter(Boolean).join(' · ');
    const url = `https://gatherr-one.vercel.app/event/${id}`;

    // Fetch the React app's index.html from the root (not /event/:id to avoid loop)
    const spaRes = await fetch('https://gatherr-one.vercel.app/');
    const spaHtml = await spaRes.text();

    // Inject OG meta tags right after <head>
    const ogTags = `
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${fullDescription.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gatherr" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${fullDescription.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />`;

    const finalHtml = spaHtml.replace('<head>', `<head>${ogTags}`);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.send(finalHtml);
  } catch (e) {
    console.error(e);
    // Fallback: just serve the React app normally
    const spaRes = await fetch('https://gatherr-one.vercel.app/');
    const spaHtml = await spaRes.text();
    res.setHeader('Content-Type', 'text/html');
    res.send(spaHtml);
  }
}
