const Anthropic = require("@anthropic-ai/sdk");
const { tools, executors } = require("../utils/aiTools");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const chatWithAgent = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "A message is required." });
    }
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-30) : [];
    const messages = [...history, { role: "user", content: message.trim() }];
    let response;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: "You are KV Projects ERP Assistant. Answer only from tool results for ERP data questions. Never invent records or numbers. If a required ID is missing, ask the user for it. Clearly state when no records are found. Keep answers concise.",
        tools,
        messages,
      });
      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "tool_use") break;
      const toolResults = [];
      for (const block of response.content.filter((item) => item.type === "tool_use")) {
        try {
          const result = await executors[block.name](block.input || {}, req.user);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (error) {
          toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: error.message });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
    const reply = response.content.filter((item) => item.type === "text").map((item) => item.text).join("\n").trim();
    return res.json({ success: true, reply, updatedHistory: messages });
  } catch (error) {
    console.error("AI chat error:", error.message);
    return res.status(500).json({ success: false, message: "The AI assistant is temporarily unavailable." });
  }
};

module.exports = { chatWithAgent };