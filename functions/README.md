# Pages Functions

`api/chat.js` is the backend for the AI chat widget on every page
(`/chatbot-widget.js` at the site root calls `POST /api/chat`). Cloudflare
Pages auto-detects this `functions/` folder and deploys it on every push —
no separate deploy step needed.

## One-time setup: add the Workers AI binding

This only needs to be done once, in the Cloudflare dashboard (not
something that can be set from a config file here without risking
overwriting other settings on the Pages project that aren't visible from
this repo):

1. Go to **Workers & Pages** in the Cloudflare dashboard.
2. Select the **oui-academy** Pages project → **Settings**.
3. Go to **Functions** → **Bindings** → **Add** → **Workers AI**.
4. Set the **Variable name** to `AI` (must match exactly — the code reads
   `env.AI`).
5. Save, then trigger a new deployment (the dashboard will prompt you, or
   just push any commit) for the binding to take effect.

Until that binding is added, `/api/chat` will return a 500-style error and
the chat widget will fall back to its "something went wrong, message us on
WhatsApp/Zalo" reply — the rest of the site is unaffected either way.

Workers AI is free up to 10,000 "neurons"/day (resets daily at 00:00 UTC);
past that it just stops answering until the next day, no charge.

## Editing what the bot knows

All of its facts (pricing, teacher bio, contact info) live in one place:
the `SYSTEM_PROMPT` constant at the top of `api/chat.js`. It's instructed
to say "not sure, contact us directly" for anything not listed there
rather than guess — keep that instruction when editing.
