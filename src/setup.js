const mysql = require("mysql2/promise");
require("dotenv").config();

async function setup() {
  console.log("Connecting to database...");
  
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("Creating tables...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS people (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      school_name VARCHAR(255) NOT NULL,
      position ENUM('teacher', 'partnership', 'both') NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      reset_token VARCHAR(255),
      reset_token_expires DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT NOT NULL,
      learner_name VARCHAR(255) NOT NULL,
      institution_name VARCHAR(255) NOT NULL,
      gender ENUM('Male', 'Female') NOT NULL,
      disability BOOLEAN DEFAULT FALSE,
      education_level VARCHAR(100) NOT NULL,
      location VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES people(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      event_date DATETIME NOT NULL,
      theme TEXT NOT NULL,
      status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
      submitted_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitted_by) REFERENCES people(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partnerships (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      partner ENUM('Yes', 'No') NOT NULL,
      mou ENUM('Yes', 'No') NOT NULL,
      csv_filename VARCHAR(255),
      photo_link VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES people(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default locations
  const locations = [
    'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya',
    'Morogoro', 'Tanga', 'Zanzibar', 'Kilimanjaro', 'Manyara',
    'Singida', 'Tabora', 'Ruvuma', 'Kagera', 'Kigoma',
    'Shinyanga', 'Mara', 'Iringa', 'Njombe', 'Katavi'
  ];

  for (const loc of locations) {
    await pool.query("INSERT IGNORE INTO locations (name) VALUES (?)", [loc]);
  }

  console.log("✅ All tables created and locations inserted!");
  await pool.end();
}

setup().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});