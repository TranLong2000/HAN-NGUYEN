import express from "express";

const app = express();
app.use(express.json());

// ===== GET TENANT ACCESS TOKEN =====
async function getTenantAccessToken() {

  if (!process.env.LARK_APP_ID || !process.env.LARK_APP_SECRET) {
    console.error("❌ Missing LARK_APP_ID or LARK_APP_SECRET");
  }

  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.LARK_APP_ID,
        app_secret: process.env.LARK_APP_SECRET
      })
    }
  );

  const data = await res.json();
  console.log("tenant token response:", data);

  if (data.code !== 0) {
    throw new Error("Failed to get tenant_access_token: " + data.msg);
  }

  return data.tenant_access_token;
}

// ===== CALL OPENROUTER =====
async function callOpenRouter(prompt) {

  if (!process.env.OPENROUTER_API_KEY) {
    return "Server missing OpenRouter API key";
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://railway.app",
      "X-Title": "Lark Bot AI"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  console.log("AI response:", data);

  return data?.choices?.[0]?.message?.content ?? "AI không trả lời";
}

// ===== REPLY BACK TO LARK =====
async function replyToLark(openMessageId, text) {
  const token = await getTenantAccessToken();

  await fetch(
    `https://open.larksuite.com/open-apis/im/v1/messages/${openMessageId}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        msg_type: "text",
        content: JSON.stringify({ text })
      })
    }
  );
}

// ===== WEBHOOK =====
app.post("/lark/webhook", async (req, res) => {

  console.log("Webhook received:", req.body);

  if (req.body?.challenge) {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const event = req.body?.event;
  if (!event) return res.status(200).json({ code: 0 });

  const msgId = event.open_message_id;
  let userText = event.text_without_at_bot?.trim() || "";

  console.log("User text:", userText);

  const aiReply = await callOpenRouter(userText || "Xin chào 👋");

  await replyToLark(msgId, aiReply);

  res.status(200).json({ code: 0 });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
