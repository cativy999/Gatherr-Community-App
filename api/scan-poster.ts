import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "Server is not configured for poster scanning" });
  }

  try {
    const { imageBase64, mediaType } = (req.body || {}) as {
      imageBase64?: string;
      mediaType?: string;
    };

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const today = new Date();
    const todayLong = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const todayISO = today.toISOString().split("T")[0];
    const year = today.getFullYear();

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Today's date is ${todayLong}. Extract event details from this flyer or poster image and return ONLY a JSON object with these fields (use null if not found):
{
  "title": "event name",
  "description": "full description or details shown on the flyer. Write each sentence on its own line separated by a newline character.",
  "date": "YYYY-MM-DD format only, null if not found. Today is ${todayISO}. If no year is shown on the poster, you MUST use ${year} as the year. Never use any other year unless the poster explicitly shows a different year.",
  "end_date": "YYYY-MM-DD format only if the event spans multiple days and an end date is shown, otherwise null. Same rule: use ${year} if no year shown.",
  "start_time": "HH:MM 24-hour format only, null if not found",
  "end_time": "HH:MM 24-hour format only, null if not found",
  "location": "venue or address text, null if not found"
}
Return only the JSON, no explanation.`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return res.status(502).json({ error: "Failed to analyze poster" });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: "No event details found in image" });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return res.status(200).json(extracted);
  } catch (e) {
    console.error("scan-poster error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
