export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_IDEOGRAM_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Ideogram API key not configured' });
  }

  try {
    const { prompt } = req.body;
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          aspect_ratio: 'ASPECT_16_9',
          model: 'V_2_TURBO',
          magic_prompt_option: 'AUTO',
        }
      })
    });

    const data = await response.json();
    const url = data?.data?.[0]?.url;

    // While we have the URL server-side, download the image and return it as base64
    // so the client never has to deal with CORS or expiring URLs
    if (url) {
      try {
        const imgRes = await fetch(url);
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        return res.status(200).json({
          ...data,
          imageBase64: base64,
          imageContentType: contentType,
        });
      } catch (imgErr) {
        // If download fails, still return the URL (client will handle fallback)
        console.error('Failed to download generated image:', imgErr);
      }
    }

    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Image generation failed' });
  }
}
