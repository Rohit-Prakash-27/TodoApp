// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Trust Render's proxy so 'secure' cookies work over HTTPS
app.set("trust proxy", 1);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = process.env.COOKIE_NAME || "token";

// ---- CORS ----
// Allow both local dev and your deployed frontend
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_ORIGIN, // e.g. https://todoapp-client-1toc.onrender.com
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ---- Parsers ----
app.use(express.json());
app.use(cookieParser());

// ---- DB ----
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing from environment.");
  process.exit(1);
}
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// ---- Models ----
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

// ---- Auth middleware ----
const authMiddleware = (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ---- Routes ----

// Health check (useful on Render)
app.get("/health", (_req, res) => res.status(200).send("OK"));

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed });
    await user.save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1d" });

    // On different domains you must use SameSite=None and secure cookies
    const isProd = process.env.NODE_ENV === "production";
    res
      .cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "none",      // critical for cross-site
        secure: true,          // required when sameSite is 'none' (HTTPS on Render)
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res
    .clearCookie(COOKIE_NAME, {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    })
    .json({ message: "Logged out" });
});

// Current user
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  res.json(user);
});

// Tasks
app.get("/api/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.userId });
  res.json(tasks);
});

app.post("/api/tasks", authMiddleware, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: "Title required" });

  const task = new Task({ userId: req.user.userId, title, description });
  await task.save();
  res.json(task);
});

app.put("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const task = await Task.findOne({ _id: id, userId: req.user.userId });
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (title) task.title = title;
  if (description) task.description = description;
  await task.save();

  res.json(task);
});

app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const task = await Task.findOneAndDelete({ _id: id, userId: req.user.userId });
  if (!task) return res.status(404).json({ message: "Task not found" });

  res.json({ message: "Task deleted" });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
