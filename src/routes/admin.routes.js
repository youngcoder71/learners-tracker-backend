const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const authenticate = require("../middleware/authenticate");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const { moveToTrash } = require("../utils/trashHelper");
const generatePassword = require("../utils/passwordGenerator");
const { sendPasswordEmail } = require("../services/email.service");
const router = express.Router();

// All routes require admin
router.use(authenticate, authorizeAdmin);

// ============ DASHBOARD ============
router.get("/dashboard", async (req, res) => {
  try {
    const [totalLearners] = await pool.query("SELECT COUNT(*) AS count FROM learners");
    const [totalTeachers] = await pool.query("SELECT COUNT(*) AS count FROM people WHERE position IN ('teacher', 'both')");
    const [totalPartners] = await pool.query("SELECT COUNT(*) AS count FROM people WHERE position IN ('partnership', 'both')");
    const [totalEvents] = await pool.query("SELECT COUNT(*) AS count FROM events");
    const [pendingEvents] = await pool.query("SELECT COUNT(*) AS count FROM events WHERE status = 'pending'");

    res.json({
      totalLearners: totalLearners[0].count,
      totalTeachers: totalTeachers[0].count,
      totalPartners: totalPartners[0].count,
      totalEvents: totalEvents[0].count,
      pendingEvents: pendingEvents[0].count,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ============ EVENTS ============
router.get("/events", async (req, res) => {
  try {
    const [events] = await pool.query(
      "SELECT e.*, p.full_name AS submitted_by_name FROM events e JOIN people p ON e.submitted_by = p.id ORDER BY e.created_at DESC"
    );
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/events", async (req, res) => {
  try {
    const { name, location, event_date, theme, areaType, region } = req.body;
    await pool.query(
      "INSERT INTO events (name, location, event_date, theme, status, submitted_by, area_type, region) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
      [name, location, event_date, theme, req.user.id, areaType, region]
    );
    res.status(201).json({ message: "Event created." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.put("/events/:id", async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query("UPDATE events SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: "Event updated." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM events WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Event not found." });
    await moveToTrash("event", rows[0].id, rows[0]);
    await pool.query("DELETE FROM events WHERE id = ?", [req.params.id]);
    res.json({ message: "Event moved to trash." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ============ USERS ============
router.get("/users", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, full_name, school_name, position, email, created_at FROM people WHERE position != 'admin' ORDER BY created_at DESC"
    );
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { fullName, schoolName, position, email } = req.body;

    if (!fullName || !schoolName || !position || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const [existing] = await pool.query("SELECT id FROM people WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO people (full_name, school_name, position, email, password_hash) VALUES (?, ?, ?, ?, ?)",
      [fullName, schoolName, position, email, passwordHash]
    );

    sendPasswordEmail(email, password)
      .then(() => console.log("Password email sent to:", email))
      .catch(err => console.error("Email failed:", err.message));

    res.status(201).json({
      message: "User created. Password sent to their email.",
      password: password,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const { fullName, schoolName, position, email } = req.body;
    await pool.query(
      "UPDATE people SET full_name = ?, school_name = ?, position = ?, email = ? WHERE id = ?",
      [fullName, schoolName, position, email, req.params.id]
    );
    res.json({ message: "User updated." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM people WHERE id = ? AND position != 'admin'", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found." });
    const userData = rows[0];
    await moveToTrash("user", userData.id, userData);
    await pool.query("DELETE FROM people WHERE id = ?", [req.params.id]);
    res.json({ message: "User moved to trash." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ============ LEARNERS ============
router.get("/learners", async (req, res) => {
  try {
    const [learners] = await pool.query(
      "SELECT l.*, p.full_name AS teacher_name FROM learners l JOIN people p ON l.teacher_id = p.id ORDER BY l.created_at DESC"
    );
    res.json({ learners });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/learners", async (req, res) => {
  try {
    const { learnerName, institutionName, gender, disability, educationLevel, location, areaType, region } = req.body;
    const teacherId = req.user.id;

    await pool.query(
      "INSERT INTO learners (teacher_id, learner_name, institution_name, gender, disability, education_level, location, area_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [teacherId, learnerName, institutionName, gender, disability ? 1 : 0, educationLevel, location, areaType || "Rural"]
    );
    res.status(201).json({ message: "Learner added." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.put("/learners/:id", async (req, res) => {
  try {
    const { learnerName, institutionName, gender, disability, educationLevel, location, areaType, region } = req.body;
    await pool.query(
      "UPDATE learners SET learner_name = ?, institution_name = ?, gender = ?, disability = ?, education_level = ?, location = ?, area_type = ?, region = ? WHERE id = ?",
      [learnerName, institutionName, gender, disability ? 1 : 0, educationLevel, location, areaType, region, req.params.id]
    );
    res.json({ message: "Learner updated." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/learners/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM learners WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Learner not found." });
    await moveToTrash("learner", rows[0].id, rows[0]);
    await pool.query("DELETE FROM learners WHERE id = ?", [req.params.id]);
    res.json({ message: "Learner moved to trash." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ============ PARTNERSHIPS ============
router.get("/partnerships", async (req, res) => {
  try {
    const [partnerships] = await pool.query(
      "SELECT pr.*, p.full_name, p.email FROM partnerships pr LEFT JOIN people p ON pr.user_id = p.id ORDER BY pr.created_at DESC"
    );
    res.json({ partnerships });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/partnerships", async (req, res) => {
  try {
    const { userId, partner, mou, csvFilename, photoLink, partnerName, institution } = req.body;
    await pool.query(
      "INSERT INTO partnerships (user_id, partner_name, institution, partner, mou, csv_filename, photo_link) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId || 1, partnerName, institution, partner, mou, csvFilename || null, photoLink || null]
    );
    res.status(201).json({ message: "Partnership added." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.put("/partnerships/:id", async (req, res) => {
  try {
    const { partner, mou, csvFilename, photoLink, partnerName, institution } = req.body;
    await pool.query(
      "UPDATE partnerships SET partner_name = ?, institution = ?, partner = ?, mou = ?, csv_filename = ?, photo_link = ? WHERE id = ?",
      [partnerName, institution, partner, mou, csvFilename || null, photoLink || null, req.params.id]
    );
    res.json({ message: "Partnership updated." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/partnerships/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM partnerships WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Partnership not found." });
    await moveToTrash("partnership", rows[0].id, rows[0]);
    await pool.query("DELETE FROM partnerships WHERE id = ?", [req.params.id]);
    res.json({ message: "Partnership moved to trash." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;