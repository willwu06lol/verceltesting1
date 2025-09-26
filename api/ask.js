// api/ask.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const { question, context } = req.body || {};
    if (!question) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    const system = `You answer questions about companies using only the provided JSON context.
    If the answer isn’t in context, say you don’t have it.`;

    const user = `Question: ${question}
Context:
${JSON.stringify(context ?? [], null, 2)}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2
    });

    res.status(200).json({ answer: completion.choices[0].message.content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
