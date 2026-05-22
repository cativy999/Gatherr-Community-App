export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_IDEOGRAM_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Ideogram API key not configured' });
  }

  try {
    const { prompt, userToken } = req.body;

    // 1. Generate image from Ideogram
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
    const ideogramUrl = data?.data?.[0]?.url;

    if (!ideogramUrl) {
      return res.status(200).json(data);
    }

    // 2. Download the image server-side (no CORS issues here)
    const imgRes = await fetch(ideogramUrl);
    if (!imgRes.ok) {
      console.error('Failed to download Ideogram image:', imgRes.status);
      return res.status(200).json(data);
    }
    const imageBuffer = await imgRes.arrayBuffer();

    // 3. Upload directly to Supabase storage using the user's auth token
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const authToken = userToken || process.env.VITE_SUPABASE_KEY;

    if (supabaseUrl && authToken) {
      const fileName = `ai-${Date.now()}.jpg`;
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/event-images/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'false',
          },
          body: imageBuffer,
        }
      );

      if (uploadRes.ok) {
        const permanentUrl = `${supabaseUrl}/storage/v1/object/public/event-images/${fileName}`;
        // Return permanent Supabase URL instead of expiring Ideogram URL
        return res.status(200).json({
          ...data,
          data: [{ ...data.data[0], url: permanentUrl }],
          permanentUrl,
        });
      } else {
        const errText = await uploadRes.text();
        console.error('Supabase upload failed:', uploadRes.status, errText);
      }
    }

    // Fallback: return original Ideogram URL
    return res.status(200).json(data);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Image generation failed' });
  }
}
