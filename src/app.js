const express = require("express");
const path = require('path');
const cors = require("cors");
const pool = require("./config/database");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const locationRoutes = require("./routes/location.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const adminRoutes = require("./routes/admin.routes");
const eventsRoutes = require("./routes/events.routes");
const trashRoutes = require("./routes/trash.routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/admin/trash", trashRoutes);


// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/enrollment", enrollmentRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ status: "ok", message: "Server and database connected", result: rows[0].result });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  console.log("404 - Route not found:", req.method, req.url);
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const { cleanupExpiredTrash } = require("./utils/trashHelper");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Cleanup expired trash every hour
  setInterval(async () => {
    try {
      await cleanupExpiredTrash();
      console.log("Trash cleanup completed");
    } catch (err) {
      console.error("Trash cleanup error:", err.message);
    }
  }, 60 * 60 * 1000);
});