// AI examiner for TCF Canada — Expression orale, Tâche 2 (interaction).
// Used by the standalone practice page /luyen-thi-tcf-task-2.html (and -en).
//
// GET  /api/tcf-examiner                      → list of sujets (no AI call)
// POST /api/tcf-examiner {mode:"turn", ...}   → the examiner's next line
// POST /api/tcf-examiner {mode:"feedback",...}→ evaluation of the whole exchange
//
// Uses the same Workers AI binding (env.AI) as /api/chat — see README.md.

import { publicScenarios, findScenario } from "./_tcf-scenarios.js";

const TURN_MODELS = ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/zai-org/glm-4.7-flash"];
const FEEDBACK_MODELS = ["@cf/zai-org/glm-4.7-flash", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"];

function examinerPrompt(s) {
  const address = s.tu
    ? "Dans cette situation, tu TUTOIES le candidat (vous êtes amis ou collègues proches) et il doit te tutoyer aussi."
    : "Dans cette situation, tu VOUVOIES le candidat, registre poli et standard.";
  return `Tu es examinateur/examinatrice certifié(e) du TCF Canada. Tu fais passer l'épreuve d'expression orale, tâche 2 (exercice en interaction). Le candidat a lu cette consigne :
« ${s.consigne} »

Tu joues ce rôle :
${s.role}

${address}

RÈGLES — respecte-les strictement :
- Tu parles UNIQUEMENT français, toujours, même si le candidat écrit dans une autre langue (dans ce cas, dis gentiment en français que l'épreuve se déroule en français).
- C'est le CANDIDAT qui doit mener l'échange et poser les questions. Tu réponds de façon naturelle et réaliste, avec des détails concrets tirés de ton rôle (tu peux inventer des détails cohérents s'il demande autre chose).
- Réponses COURTES : 1 à 3 phrases, comme à l'oral. Ne donne pas toutes les informations d'un coup : réponds seulement à ce qui est demandé.
- De temps en temps (pas à chaque fois), relance ou pose une petite question naturelle, comme le ferait l'interlocuteur réel (« Vous êtes disponible quand ? », « Tu viens avec quelqu'un ? »). Si le candidat se tait, répond « ok » ou n'a plus d'idées, relance-le brièvement (« Vous avez d'autres questions ? »).
- Si un message est incompréhensible, demande poliment de répéter ou de reformuler.
- Ne corrige JAMAIS les fautes pendant l'épreuve, ne donne aucun conseil, aucune note, ne dis jamais que tu es une IA, ne sors jamais de ton rôle.
- Texte simple seulement : pas de listes, pas de markdown, pas d'émojis, pas de didascalies entre parenthèses (ta réponse est lue à voix haute).
- Adapte ton débit : français standard, clair, quelques expressions naturelles du quotidien.`;
}

function feedbackPrompt(s, lang) {
  const out =
    lang === "en"
      ? "Write the whole evaluation in ENGLISH (keep French examples in French)."
      : "Viết toàn bộ phần nhận xét bằng TIẾNG VIỆT (giữ nguyên các ví dụ tiếng Pháp bằng tiếng Pháp).";
  return `You are an experienced, certified TCF Canada examiner and French teacher at Oui Academy. Evaluate a candidate's performance on Expression orale — Tâche 2 (exercice en interaction: the candidate must ask questions to obtain information in an everyday situation). The candidate's lines may come from speech-to-text, so ignore missing punctuation/capitalisation and obvious transcription glitches; judge vocabulary, grammar, question forms and interaction.

Sujet: « ${s.consigne} »
Expected register: ${s.tu ? "tutoiement (informal)" : "vouvoiement (polite)"}.

Judge against the official TCF criteria for this task: task completion (did they gather enough relevant information, cover several aspects of the sujet, open and close the conversation politely?), variety and correctness of interrogative structures (est-ce que, inversion, qu-words, indirect questions, conditionnel de politesse), lexical range, grammatical accuracy, register, and ability to react to the examiner's answers (follow-up questions, reformulation) rather than reciting a list.

${out}

Use EXACTLY this structure, with these headings starting with "## ", short bullet points starting with "- ", and **bold** only for key words. No tables, no other markdown.

## Niveau estimé
One line: estimated CEFR level (A1–C2) and the matching NCLC range, then one sentence explaining why. If the transcript is too short to judge (fewer than 3 real candidate turns), say so honestly and estimate cautiously.

## Points forts
2–4 bullets, specific to what they actually said.

## À améliorer
2–4 bullets: the most important weaknesses for THIS task.

## Corrections
3–6 bullets. Each: the candidate's original sentence → the corrected / more natural French version — plus a very short reason. Only use sentences the candidate really wrote.

## Questions que vous auriez pu poser
4–6 bullets of good, natural French questions for this sujet (mix structures, B2 level), especially covering aspects they missed.

## Conseil pour la prochaine fois
1–2 sentences, concrete and encouraging.`;
}

function cleanHistory(raw, maxItems) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-maxItems)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 700) }));
}

function extractText(result) {
  const text =
    result?.response ??
    result?.choices?.[0]?.message?.content ??
    result?.result?.response ??
    "";
  return typeof text === "string" ? text.trim() : "";
}

async function runWithFallback(env, models, messages, max_tokens) {
  let lastErr;
  for (const model of models) {
    try {
      const result = await env.AI.run(model, { messages, max_tokens, temperature: 0.7 });
      const text = extractText(result);
      if (text) return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Empty AI response");
}

function stripForSpeech(text) {
  // The examiner's line is read aloud: drop stray markdown, stage directions, labels.
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\*+/g, "")
    .replace(/^\s*(examinateur|examinatrice|examiner)\s*:\s*/i, "")
    .replace(/\s*\([^)]{0,80}\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, (m, c) => (c === "." || c === "," ? c : " " + c))
    .trim();
}

export async function onRequestGet() {
  return Response.json(
    { scenarios: publicScenarios() },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scenario = findScenario(body.scenarioId);
  if (!scenario) {
    return Response.json({ error: "Unknown scenario" }, { status: 400 });
  }
  const lang = body.lang === "en" ? "en" : "vi";

  if (body.mode === "feedback") {
    const history = cleanHistory(body.history, 60);
    const transcript = history
      .map((m) => (m.role === "user" ? "CANDIDAT : " : "EXAMINATEUR : ") + m.content)
      .join("\n");
    const candidateTurns = history.filter((m) => m.role === "user").length;
    if (candidateTurns === 0) {
      return Response.json({
        feedback:
          lang === "en"
            ? "## Niveau estimé\nNo candidate turns were recorded, so there is nothing to evaluate yet. Try again and ask the examiner at least 5–6 questions."
            : "## Niveau estimé\nChưa có câu nào của bạn được ghi lại nên chưa thể đánh giá. Hãy thử lại và hỏi giám khảo ít nhất 5–6 câu nhé.",
      });
    }
    try {
      const feedback = await runWithFallback(
        env,
        FEEDBACK_MODELS,
        [
          { role: "system", content: feedbackPrompt(scenario, lang) },
          { role: "user", content: "Transcript:\n" + transcript },
        ],
        2500
      );
      return Response.json({ feedback: feedback.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() });
    } catch {
      // 200 on purpose: Cloudflare replaces 5xx bodies with its own page.
      return Response.json({ error: "AI request failed" });
    }
  }

  // Default: examiner's next turn.
  const history = cleanHistory(body.history, 40);
  // The examiner speaks first (scenario.opening); chat models expect the
  // first non-system turn to be the user's, so add a neutral stub.
  if (history.length && history[0].role === "assistant") {
    history.unshift({ role: "user", content: "(Début de l'épreuve.)" });
  }
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Last message must come from the candidate" }, { status: 400 });
  }

  try {
    const reply = await runWithFallback(
      env,
      TURN_MODELS,
      [{ role: "system", content: examinerPrompt(scenario) }, ...history],
      1200
    );
    return Response.json({ reply: stripForSpeech(reply) || "Pardon, vous pouvez répéter ?" });
  } catch {
    return Response.json({ error: "AI request failed" });
  }
}
