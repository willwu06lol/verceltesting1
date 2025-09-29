// api/ask.js — Edge Function with helpful errors + CORS
export const config = { runtime: "edge" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req) {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: cors });
    }

    const { question, context, preAnswer } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing 'question' in body" }), {
        status: 400, headers: { "content-type": "application/json", ...cors }
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set in Vercel env" }), {
        status: 500, headers: { "content-type": "application/json", ...cors }
      });
    }

    const system = `Answer ONLY from the JSON context.
If a context row has a categorical value (e.g., "Yes", "No", "N/A", or a text label), return that value exactly, along with the company name.
If the context includes percentages or numbers, report those directly.
If asked about "% traceable", list each level present (production unit, sourcing area, country/area, other) with its percentage.
Be concise and never invent values.`;

    const user =
`Question: ${question}
Context JSON:
${JSON.stringify(context ?? [], null, 2)}
${preAnswer ? `\nSuggested direct answer from rules: ${preAnswer}\n(Validate against context before finalizing.)` : ""}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: "OpenAI error", status: r.status, body: errText }), {
        status: 502, headers: { "content-type": "application/json", ...cors }
      });
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content ?? "No answer returned from OpenAI.";

    return new Response(JSON.stringify({ answer }), {
      status: 200, headers: { "content-type": "application/json", ...cors }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500, headers: { "content-type": "application/json", ...cors }
    });
  }
}
