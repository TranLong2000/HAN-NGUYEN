import express from "express";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());

// Health check
app.get("/", (req, res) => {
  res.send("Lark bot webhook is running 🚀");
});

// Webhook endpoint
app.post("/lark/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("Webhook received:", body);

    // --- 1) XỬ LÝ CHALLENGE ---
    if (body?.challenge) {
      return res.status(200).json({
        challenge: body.challenge
      });
    }

    // --- 2) XỬ LÝ SỰ KIỆN THÔNG THƯỜNG ---
    // Ví dụ: message received
    if (body?.event) {
      console.log("Event:", body.event);

      // TODO: xử lý bot logic tại đây
    }

    return res.status(200).json({
      code: 0,
      msg: "ok"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      code: -1,
      msg: "server error"
    });
  }
});

// Railway cung cấp PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
