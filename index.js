import express from "express";
import "dotenv/config";

const app = express();

app.use(express.json());

// 🚥 Health check
app.get("/", (req, res) => {
  res.send("Lark bot webhook is running 🚀");
});


// ⚙️ Hàm gọi OpenRouter
async function callOpenRouter(prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://railway.app",
      "X-Title": "Lark Bot"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await res.json();
  console.log("OpenRouter response:", data);

  return data?.choices?.[0]?.message?.content ?? "Không nhận được phản hồi từ AI";
}


// 🎯 Webhook endpoint
app.post("/lark/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("Webhook received:", body);

    // 🔐 1) URL verification challenge
    if (body?.challenge) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(
        JSON.stringify({ challenge: body.challenge })
      );
    }

    // 💬 2) Nếu là message event → gọi AI
    if (body?.event?.message?.content) {
      const content = body.event.message.content;

      // Lark message content thường là JSON string
      let text = content;
      try {
        const parsed = JSON.parse(content);
        text = parsed.text ?? content;
      } catch (_) {}

      console.log("User message:", text);

      const aiReply = await callOpenRouter(text);

      console.log("AI reply:", aiReply);

      // (Nếu muốn bot reply lại trong Lark → cần thêm Bot token; bạn nói mình sẽ viết tiếp)
    }

    // 🔚 trả lời webook OK
    return res.status(200).json({ code: 0 });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ code: -1 });
  }
});


// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
