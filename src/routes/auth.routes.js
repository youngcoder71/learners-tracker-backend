const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../config/database");
const generatePassword = require("../utils/passwordGenerator");
const { sendPasswordEmail, sendResetEmail } = require("../services/email.service");
const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { fullName, schoolName, position, email } = req.body;

    if (!fullName || !schoolName || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const [existing] = await pool.query("SELECT id FROM people WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const userPosition = position || "teacher";
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO people (full_name, school_name, position, email, password_hash) VALUES (?, ?, ?, ?, ?)",
      [fullName, schoolName, userPosition, email, passwordHash]
    );

    sendPasswordEmail(email, password)
      .then(() => console.log("Email sent"))
      .catch((err) => console.error("Email failed:", err.message));

    res.status(201).json({
      message: "Registration successful.",
      password: password,
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const [people] = await pool.query("SELECT * FROM people WHERE email = ?", [email]);
    if (people.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const person = people[0];
    const isMatch = await bcrypt.compare(password, person.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: person.id, email: person.email, position: person.position },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token: token,
      user: {
        id: person.id,
        fullName: person.full_name,
        schoolName: person.school_name,
        position: person.position,
        email: person.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Forgot Password - Send reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const [people] = await pool.query("SELECT id FROM people WHERE email = ?", [email]);

    if (people.length > 0) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await pool.query(
        "UPDATE people SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
        [resetToken, resetTokenExpires, email]
      );

      const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

      try {
        await sendResetEmail(email, resetLink);
        console.log("Reset email sent to:", email);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError.message);
      }
    }

    // Always return same message (security - don't reveal if email exists)
    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Verify reset token
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const [people] = await pool.query(
      "SELECT id FROM people WHERE reset_token = ? AND reset_token_expires > NOW()",
      [req.params.token]
    );

    if (people.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    res.json({ message: "Token is valid." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const [people] = await pool.query(
      "SELECT id FROM people WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );

    if (people.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE people SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [passwordHash, people[0].id]
    );

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;