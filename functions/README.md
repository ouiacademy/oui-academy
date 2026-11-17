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

## TCF Task 2 AI examiner (`api/tcf-examiner.js`)

Backend for the standalone exam room `/luyen-thi-tcf-task-2` (+ `-en`),
introduced on `/giam-khao-ai-tcf` (+ `-en`). It uses the same `AI` binding
as the chat widget, so there's no extra setup.

- `GET /api/tcf-examiner`: the list of sujets (no AI call).
- `POST {mode:"turn", scenarioId, history}`: the examiner's next line.
- `POST {mode:"feedback", scenarioId, history, lang}`: the end-of-exam evaluation.

The sujets, plus the private role brief the examiner plays for each one, live in
`api/_tcf-scenarios.js` (the leading `_` keeps Pages from routing it). To add a
sujet, copy an entry there. The frontend picks it up automatically. The page
itself is `tcf-task2.js` + `tcf-task2.css` at the site root. Voice input and
the examiner's voice use the browser's built-in speech APIs, so they're free
and don't use any Workers AI quota.
