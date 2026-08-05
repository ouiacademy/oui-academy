# Oui Academy chatbot — deploy

One-time setup to make the AI chat bubble on the site actually work. Uses
Cloudflare Workers AI, which is free up to 10,000 "neurons" a day (resets
daily at 00:00 UTC) — past that it just stops answering until the next day,
no charge, no auto-upgrade.

## Deploy

```bash
cd chatbot-worker
npx wrangler login      # opens a browser to log into your Cloudflare account
npx wrangler deploy
```

That's it. The site already calls `https://ouiacademy.net/api/chat`
(configured in `wrangler.toml`), so as long as `ouiacademy.net` is on your
Cloudflare account, the chat bubble will start working right after deploy —
no other file needs to change.

## If the route fails to attach

`wrangler deploy` will tell you if `ouiacademy.net` isn't on this Cloudflare
account. If that happens:

1. Delete the `routes = [...]` block in `wrangler.toml`.
2. Run `npx wrangler deploy` again — it'll print a URL like
   `https://oui-academy-chatbot.<your-subdomain>.workers.dev`.
3. Open `/chatbot-widget.js` at the site root and change the `ENDPOINT`
   constant near the top to `https://oui-academy-chatbot.<your-subdomain>.workers.dev/api/chat`.

## Updating what the bot knows

All of the bot's facts (pricing, teacher bio, contact info) live in one
place: the `SYSTEM_PROMPT` constant at the top of `src/index.js`. Edit that,
then re-run `npx wrangler deploy` to publish the change. The bot is
instructed to say "I'm not sure, contact us directly" for anything not
listed there, rather than guess — keep it that way when editing.
