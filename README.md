<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f8750896-bc25-450e-a603-3f703dacf3a6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

The frontend is deployed as a Vite app. Telegram endpoints under
`/api/telegram/*` are handled by the catch-all Vercel Function in
`api/[...path].ts`.

Configure these variables in **Vercel Project Settings > Environment
Variables**, then redeploy the project:

- `TELEGRAM_BOT_TOKEN` (server-only; do not prefix it with `VITE_`)
- `TELEGRAM_CHAT_ID` (optional fallback when a user has no saved connection)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server-side Telegram routing)

The in-memory reminder/report schedulers only run with the long-lived Node
server (`npm run start`). Vercel Functions can send immediate Telegram
notifications, but recurring reminders need Vercel Cron or a Supabase Edge
Function because serverless processes do not stay alive between requests.
