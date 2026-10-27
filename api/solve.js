module.exports = async function solve(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const question = body && typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 4000) return res.status(400).json({ error: "Enter a question of 1 to 4,000 characters." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI is not configured on this deployment." });

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: "You are a careful math and reasoning assistant. Answer accurately and concisely. For calculations, verify the result and include essential steps. State assumptions when needed; never invent missing information or claim certainty when a question is ambiguous. Format equations in plain text." },
          { role: "user", content: question },
        ],
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider request failed:", upstream.status);
      return res.status(502).json({ error: "The AI provider could not complete the request." });
    }
    const answer = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "The AI provider returned no answer." });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ answer: answer.trim() });
  } catch (error) {
    console.error("AI provider request failed:", error.message);
    return res.status(502).json({ error: "The AI provider could not be reached." });
  }
};