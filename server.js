// ---------- IMPORTS ----------
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

// ---------- APP SETUP ----------
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sehat_secret_key";

// ---------- MONGOOSE SCHEMAS ----------
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: Date,
});

const ScheduleSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  name: String,
  dosage: String,
  time: String,
  frequency: String,
  duration: String,
  createdAt: Date,
});

const LogSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  scheduleId: String,
  status: String,
  scheduleRef: String,
  timestamp: Date,
  date: String,
});

const User = mongoose.model("User", UserSchema);
const Schedule = mongoose.model("Schedule", ScheduleSchema);
const Log = mongoose.model("Log", LogSchema);

// ---------- JWT HELPERS ----------
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });

  const token = auth.replace("Bearer ", "");
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(data.id);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- CONNECT TO MONGODB ----------
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/sehatpulse")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---------- AUTH ROUTES ----------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, createdAt: new Date() });
    await user.save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid password" });

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ---------- TEST ROUTE ----------
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- SCHEDULE ROUTES ----------
app.post("/api/schedules", authMiddleware, async (req, res) => {
  try {
    const { name, dosage, time, frequency, duration } = req.body;
    if (!name || !time)
      return res.status(400).json({ error: "Name and time are required" });

    const schedule = new Schedule({
      user: req.user._id,
      name,
      dosage,
      time,
      frequency,
      duration,
      createdAt: new Date(),
    });

    await schedule.save();
    res.json({ message: "Schedule saved", schedule });
  } catch (err) {
    console.error("Schedule save error:", err);
    res.status(500).json({ error: "Server error while saving schedule" });
  }
});

app.get("/api/schedules", authMiddleware, async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.user._id });
    res.json(schedules);
  } catch (err) {
    console.error("Fetch schedules error:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

// ---------- DELETE ONE ----------
app.delete("/api/schedules/:id", authMiddleware, async (req, res) => {
  try {
    await Schedule.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: "Schedule deleted" });
  } catch (err) {
    console.error("Delete one error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// ---------- DELETE ALL ----------
app.delete("/api/schedules/deleteAll", authMiddleware, async (req, res) => {
  try {
    await Schedule.deleteMany({ user: req.user._id });
    res.json({ success: true, message: "All schedules deleted" });
  } catch (err) {
    console.error("Delete all error:", err);
    res.status(500).json({ error: "Failed to delete schedules" });
  }
});

// ---------- SERVER START ----------
app.listen(PORT, () => console.log(`🚀 Sehat Pulse API running on port ${PORT}`));


// ---------- LOG A MEDICINE TAKEN ----------
app.post("/api/logs", authMiddleware, async (req, res) => {
  try {
    const { scheduleId, status } = req.body;
    if (!scheduleId || !status)
      return res.status(400).json({ error: "scheduleId and status required" });

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule)
      return res.status(404).json({ error: "Schedule not found" });

    const log = new Log({
      user: req.user._id,
      scheduleId,
      status,
      scheduleRef: schedule.name,
      timestamp: new Date(),
      date: new Date().toDateString(),
    });

    await log.save();
    res.json({ message: "Log recorded successfully", log });
  } catch (err) {
    console.error("Log error:", err);
    res.status(500).json({ error: "Failed to record log" });
  }
});

// ---------- FETCH MEDICINE HISTORY ----------
app.get("/api/logs/history", authMiddleware, async (req, res) => {
  try {
    const logs = await Log.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(10);
    res.json(logs);
  } catch (err) {
    console.error("Fetch logs error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});
