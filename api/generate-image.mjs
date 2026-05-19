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
          model: 'V_2',
          magic_prompt_option: 'AUTO',
        }
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Image generation failed' });
  }
}
