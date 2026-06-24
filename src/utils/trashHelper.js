const pool = require("../config/database");

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toISOString().slice(0, 19).replace("T", " ");
};

const moveToTrash = async (itemType, itemId, itemData) => {
  await pool.query(
    "INSERT INTO trash (item_type, item_id, item_data) VALUES (?, ?, ?)",
    [itemType, itemId, JSON.stringify(itemData)]
  );
};

const restoreFromTrash = async (trashId) => {
  const [rows] = await pool.query("SELECT * FROM trash WHERE id = ?", [trashId]);
  if (rows.length === 0) return null;

  const item = rows[0];
  const data = typeof item.item_data === "string" ? JSON.parse(item.item_data) : item.item_data;

  try {
    switch (item.item_type) {
      case "user":
        await pool.query(
          "INSERT INTO people (full_name, school_name, position, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [data.full_name, data.school_name, data.position, data.email, data.password_hash || "$2a$10$placeholderhash", formatDate(data.created_at)]
        );
        break;
      case "learner":
        await pool.query(
          "INSERT INTO learners (teacher_id, learner_name, institution_name, gender, disability, education_level, location, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [data.teacher_id, data.learner_name, data.institution_name, data.gender, data.disability ? 1 : 0, data.education_level, data.location, formatDate(data.created_at)]
        );
        break;
      case "partnership":
        await pool.query(
          "INSERT INTO partnerships (user_id, partner_name, institution, partner, mou, csv_filename, photo_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [data.user_id || 1, data.partner_name, data.institution, data.partner, data.mou, data.csv_filename || null, data.photo_link || null, formatDate(data.created_at)]
        );
        break;
      case "event":
        await pool.query(
          "INSERT INTO events (name, location, event_date, theme, status, submitted_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [data.name, data.location, formatDate(data.event_date), data.theme, data.status || "pending", data.submitted_by, formatDate(data.created_at)]
        );
        break;
    }

    await pool.query("DELETE FROM trash WHERE id = ?", [trashId]);
    return item;
  } catch (err) {
    console.error("Restore error:", err.message);
    return null;
  }
};

const emptyTrash = async () => {
  await pool.query("DELETE FROM trash");
};

const cleanupExpiredTrash = async () => {
  await pool.query("DELETE FROM trash WHERE expires_at < NOW()");
};

module.exports = { moveToTrash, restoreFromTrash, emptyTrash, cleanupExpiredTrash };