require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const cookieParser = require("cookie-parser");

const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// === Gallery Upload Config ===
const ALLOWED_TYPES = /\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i;
const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = Date.now().toString(36);
    cb(null, `${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: jpg, jpeg, png, webp, mp4, mov, webm"));
    }
  }
});

function analyzeSentiment(reviewText) {
  const text = reviewText.toLowerCase();

  const positiveWords = [
    "great",
    "amazing",
    "delicious",
    "excellent",
    "love",
    "friendly",
    "perfect",
    "good",
    "tasty",
    "best",
    "awesome",
    "nice"
  ];

  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "slow",
    "cold",
    "salty",
    "disappointed",
    "poor",
    "worst",
    "rude",
    "dirty",
    "late"
  ];

  let score = 0;

  positiveWords.forEach((word) => {
    if (text.includes(word)) score += 1;
  });

  negativeWords.forEach((word) => {
    if (text.includes(word)) score -= 1;
  });

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function generateRuleBasedReply(reviewText, customerName) {
  const sentiment = analyzeSentiment(reviewText);
  const name = customerName && customerName.trim() ? customerName.trim() : "there";

  if (sentiment === "positive") {
    return `Hi ${name}, thank you so much for your kind words! We are happy you enjoyed your visit to The Pot Home. We are especially glad our signature hot pot chicken and handmade dishes made your experience memorable. We look forward to welcoming you again soon in North York.`;
  }

  if (sentiment === "negative") {
    return `Hi ${name}, thank you for sharing your feedback. We are sorry to hear your recent experience did not meet expectations. Your comments are important to us, and we are reviewing them with our team to improve both food quality and service. We hope to have another chance to provide you with a better experience at The Pot Home.`;
  }

  return `Hi ${name}, thank you for taking the time to leave a review. We appreciate your support for The Pot Home. If you have any specific suggestions, we would be grateful to hear more so we can continue improving and serving better Chinese comfort food in North York.`;
}

app.post("/api/review-reply", async (req, res) => {
  const { reviewText, customerName } = req.body || {};
  const text = reviewText || req.body.text;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({
      error: "reviewText or text is required and must be a non-empty string."
    });
  }

  try {
    const systemPrompt = `你是 The Pot Home（一锅小筑）的餐厅老板。请根据顾客 Google Review 生成英文回复。回复要自然、专业、简短。好评要感谢，差评要道歉并表示改进，混合评价要同时感谢和道歉。不要编造优惠，不要过度承诺。`;
    const response = await axios.post(
      `${process.env.ANTHROPIC_BASE_URL}/v1/messages`,
      {
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: text }]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`
        },
        timeout: 15000
      }
    );

    let aiReply;
    const contentArr = response.data.content;
    if (Array.isArray(contentArr)) {
      const textItem = contentArr.find(
        (item) => item.type === "text" && typeof item.text === "string"
      );
      aiReply = textItem ? textItem.text : undefined;
    }
    if (typeof aiReply !== "string") aiReply = undefined;

    if (!aiReply && response.data.content?.[0]?.text?.value) {
      aiReply = response.data.content[0].text.value;
    }
    if (!aiReply && response.data.output_text) {
      aiReply = response.data.output_text;
    }
    if (!aiReply && response.data.choices?.[0]?.message?.content) {
      aiReply = response.data.choices[0].message.content;
    }
    if (!aiReply && response.data.choices?.[0]?.text) {
      aiReply = response.data.choices[0].text;
    }

    if (!aiReply) {
      console.log("Qwen raw response:", JSON.stringify(response.data, null, 2));
      throw new Error("No reply content in Qwen response");
    }

    return res.json({
      reply: aiReply,
      mode: "qwen-ai",
      brand: "The Pot Home"
    });
  } catch (err) {
    console.error("Qwen AI review-reply failed, falling back:", err.message);

    const reply = generateRuleBasedReply(text, customerName);

    return res.json({
      reply,
      mode: "rule-based-fallback",
      brand: "The Pot Home"
    });
  }
});

app.get("/api/menu", (req, res) => {
  const menuPath = path.join(__dirname, "data", "menu.json");
  if (fs.existsSync(menuPath)) {
    const menu = JSON.parse(fs.readFileSync(menuPath, "utf-8"));
    return res.json(menu);
  }
  res.json([]);
});

// === Gallery API ===
const galleryPath = path.join(__dirname, "data", "gallery.json");

function readGallery() {
  try {
    if (fs.existsSync(galleryPath)) {
      return JSON.parse(fs.readFileSync(galleryPath, "utf-8"));
    }
  } catch (_e) {}
  return [];
}

function writeGallery(data) {
  fs.writeFileSync(galleryPath, JSON.stringify(data, null, 2));
}

app.get("/api/gallery", (req, res) => {
  res.json(readGallery());
});

// === Admin Auth ===
const ADMIN_TOKEN_KEY = "admin_token";

function adminAuthMiddleware(req, res, next) {
  const expectedToken = process.env.ADMIN_PASSWORD
    ? crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD).digest("hex")
    : "";
  const cookieToken = req.cookies?.[ADMIN_TOKEN_KEY] || "";
  if (expectedToken && cookieToken === expectedToken) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return res.status(500).json({ error: "ADMIN_PASSWORD is not configured" });
  }
  if (password === expectedPassword) {
    const token = crypto.createHash("sha256").update(password).digest("hex");
    res.cookie(ADMIN_TOKEN_KEY, token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: "/"
    });
    return res.json({ ok: true });
  }
  return res.status(403).json({ error: "Invalid password" });
});

app.get("/admin", (req, res) => {
  const expectedToken = process.env.ADMIN_PASSWORD
    ? crypto.createHash("sha256").update(process.env.ADMIN_PASSWORD).digest("hex")
    : "";
  const cookieToken = req.cookies?.[ADMIN_TOKEN_KEY] || "";
  if (expectedToken && cookieToken === expectedToken) {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "admin-login.html"));
  }
});

app.delete("/api/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_TOKEN_KEY, { path: "/" });
  res.json({ ok: true });
});

app.post("/api/gallery/upload", adminAuthMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "title is required" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isVideo = [".mp4", ".mov", ".webm"].includes(ext);

  const entry = {
    id: Date.now(),
    title: title.trim(),
    type: isVideo ? "video" : "image",
    url: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString()
  };

  const gallery = readGallery();
  gallery.push(entry);
  writeGallery(gallery);

  res.json(entry);
});

app.delete("/api/gallery/:id", adminAuthMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const gallery = readGallery();
  const index = gallery.findIndex((item) => item.id === id);
  if (index === -1) return res.status(404).json({ error: "Item not found" });

  const item = gallery[index];
  // Delete the physical file
  const filename = path.basename(item.url);
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  gallery.splice(index, 1);
  writeGallery(gallery);

  res.json({ ok: true });
});

app.patch("/api/gallery/:id", adminAuthMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { title } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });

  const gallery = readGallery();
  const item = gallery.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  item.title = title.trim();
  writeGallery(gallery);

  res.json(item);
});

app.patch("/api/gallery/:id/move", adminAuthMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { direction } = req.body || {};
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ error: "direction must be 'up' or 'down'" });
  }

  const gallery = readGallery();
  const index = gallery.findIndex((i) => i.id === id);
  if (index === -1) return res.status(404).json({ error: "Item not found" });

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= gallery.length) {
    return res.status(400).json({ error: "Already at the edge" });
  }

  [gallery[index], gallery[swapIndex]] = [gallery[swapIndex], gallery[index]];
  writeGallery(gallery);

  res.json({ ok: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`The Pot Home website is running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start Express server:", error.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down server...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
