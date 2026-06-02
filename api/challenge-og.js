const BASE_URL = "https://gatherr-one.vercel.app";

export default function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /facebookexternalhit|twitterbot|slackbot|whatsapp|telegram|discord|linkedinbot|applebot|iMessage|Messages/i.test(userAgent);

  if (!isBot) {
    return res.redirect(302, `${BASE_URL}/wards`);
  }

  const title = "Pioneer Trail Challenge 🥾";
  const description = "Walk 2.6 million steps together from Nauvoo to Salt Lake City. Join the challenge on Gatherr!";
  const image = `${BASE_URL}/pioneertrailstepchallenge.png`;
  const url = `${BASE_URL}/challenge`;

  return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
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
