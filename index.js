import express from "express";

const app = express();
app.use(express.json());

// ===== GET TENANT ACCESS TOKEN =====
async function getTenantAccessToken() {

  if (!process.env.LARK_APP_ID || !process.env.LARK_APP_SECRET) {
    console.error("❌ Missing LARK_APP_ID or LARK_APP_SECRET");
  }

  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
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

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
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
    }
  );

  const data = await response.json();
  console.log("AI response:", data);

  return data?.choices?.[0]?.message?.content ?? "AI không trả lời 😢";
}

// ===== REPLY BACK TO LARK =====
async function replyToLark(messageId, text) {
  const token = await getTenantAccessToken();

  await fetch(
    `https://open.larksuite.com/open-apis/im/v1/messages/${messageId}/reply`,
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

  console.log("Webhook received:", JSON.stringify(req.body, null, 2));

  // challenge verify
  if (req.body?.challenge) {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const event = req.body?.event;
  if (!event) return res.status(200).json({ code: 0 });

  // correct message id path
  const msgId = event?.message?.message_id;

  // parse message content
  let text = "";
  try {
    text = JSON.parse(event?.message?.content || "{}").text || "";
  } catch (e) {}

  // remove bot mention
  text = text.replace(/@_user_\d+/g, "").trim();

  console.log("User text:", text);

  const reply = await callOpenRouter(text || "Xin chào 👋");

  await replyToLark(msgId, reply);

  res.status(200).json({ code: 0 });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
