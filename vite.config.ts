import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ ones like ANTHROPIC_API_KEY)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Dev-only: handle /api/scan-poster in the Vite dev server
      // (In production, Vercel serves this from api/scan-poster.ts)
      mode === "development" && {
        name: "api-routes-dev",
        configureServer(server) {
          server.middlewares.use(
            "/api/scan-poster",
            async (req: any, res: any, next: any) => {
              if (req.method !== "POST") {
                next();
                return;
              }

              let body = "";
              req.on("data", (chunk: any) => (body += chunk));
              req.on("end", async () => {
                try {
                  const apiKey = env.ANTHROPIC_API_KEY;
                  if (!apiKey || apiKey.startsWith("paste-your")) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(
                      JSON.stringify({
                        error:
                          "ANTHROPIC_API_KEY is not set. Add a real key to .env.local",
                      })
                    );
                    return;
                  }

                  const { imageBase64, mediaType } = JSON.parse(body);
                  if (!imageBase64) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Missing imageBase64" }));
                    return;
                  }

                  const today = new Date();
                  const todayLong = today.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  });
                  const todayISO = today.toISOString().split("T")[0];
                  const year = today.getFullYear();

                  const anthropicRes = await fetch(
                    "https://api.anthropic.com/v1/messages",
                    {
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
                                text: `Today's date is ${todayLong}. Extract event details from this flyer or poster image and return ONLY a JSON object with these fields (use null if not found):\n{\n  "title": "event name",\n  "description": "full description or details shown on the flyer. Write each sentence on its own line separated by a newline character.",\n  "date": "YYYY-MM-DD format only, null if not found. Today is ${todayISO}. If no year is shown on the poster, you MUST use ${year} as the year. Never use any other year unless the poster explicitly shows a different year.",\n  "end_date": "YYYY-MM-DD format only if the event spans multiple days and an end date is shown, otherwise null. Same rule: use ${year} if no year shown.",\n  "start_time": "HH:MM 24-hour format only, null if not found",\n  "end_time": "HH:MM 24-hour format only, null if not found",\n  "location": "venue or address text, null if not found"\n}\nReturn only the JSON, no explanation.`,
                              },
                            ],
                          },
                        ],
                      }),
                    }
                  );

                  if (!anthropicRes.ok) {
                    const errText = await anthropicRes.text();
                    console.error(
                      "[scan-poster] Anthropic error:",
                      anthropicRes.status,
                      errText
                    );
                    res.writeHead(502, { "Content-Type": "application/json" });
                    res.end(
                      JSON.stringify({ error: "Failed to analyze poster" })
                    );
                    return;
                  }

                  const data = await anthropicRes.json();
                  const text = data.content?.[0]?.text ?? "";
                  const jsonMatch = text.match(/\{[\s\S]*\}/);
                  if (!jsonMatch) {
                    res.writeHead(422, { "Content-Type": "application/json" });
                    res.end(
                      JSON.stringify({
                        error: "No event details found in image",
                      })
                    );
                    return;
                  }

                  const extracted = JSON.parse(jsonMatch[0]);
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify(extracted));
                } catch (e) {
                  console.error("[scan-poster] Error:", e);
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Internal error" }));
                }
              });
            }
          );
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
