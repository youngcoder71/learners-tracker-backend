const express = require("express");
const pool = require("../config/database");
const authenticate = require("../middleware/authenticate");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const { restoreFromTrash, emptyTrash } = require("../utils/trashHelper");
const router = express.Router();

router.use(authenticate, authorizeAdmin);

// Get all trash
router.get("/", async (req, res) => {
  try {
    const [items] = await pool.query("SELECT * FROM trash ORDER BY deleted_at DESC");
    const parsed = items.map(item => ({
      ...item,
      item_data: typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data,
    }));
    res.json({ trash: parsed });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// Restore item
router.post("/:id/restore", async (req, res) => {
  try {
    const result = await restoreFromTrash(req.params.id);
    if (!result) return res.status(404).json({ message: "Item not found." });
    res.json({ message: "Item restored." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// Delete permanently
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM trash WHERE id = ?", [req.params.id]);
    res.json({ message: "Item permanently deleted." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// Empty trash
router.delete("/empty/all", async (req, res) => {
  try {
    await emptyTrash();
    res.json({ message: "Trash emptied." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;