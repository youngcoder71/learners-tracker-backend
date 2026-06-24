const express = require("express");
const pool = require("../config/database");
const router = express.Router();

// Get locations with autocomplete search
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || search.length < 1) {
      return res.json({ locations: [] });
    }

    const [rows] = await pool.query(
      "SELECT DISTINCT name FROM locations WHERE name LIKE ? ORDER BY name LIMIT 15",
      [`${search}%`]
    );

    res.json({ locations: rows.map((r) => r.name) });
  } catch (error) {
    console.error("Location search error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Add a new location (admin use)
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Location name is required." });
    }

    // Use INSERT IGNORE to prevent duplicates
    await pool.query("INSERT IGNORE INTO locations (name) VALUES (?)", [name.trim()]);

    res.status(201).json({ message: "Location added." });
  } catch (error) {
    console.error("Add location error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;