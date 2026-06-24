const express = require("express");
const pool = require("../config/database");
const authenticate = require("../middleware/authenticate");
const router = express.Router();

// Get active events for banner
router.get("/", authenticate, async (req, res) => {
  try {
    const [events] = await pool.query(
      "SELECT * FROM events WHERE status = 'active' AND event_date >= NOW() ORDER BY event_date ASC LIMIT 10"
    );
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// Submit event (pending review)
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, location, dateTime, theme, areaType } = req.body;
    if (!name || !location || !dateTime || !theme) {
      return res.status(400).json({ message: "All fields are required." });
    }

    await pool.query(
      "INSERT INTO events (name, location, event_date, theme, status, submitted_by, area_type) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
      [name, location, dateTime, theme, req.user.id, areaType || "Rural"]
    );

    res.status(201).json({ message: "Event submitted for review." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;