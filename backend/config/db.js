const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

const connectDB = async () => {
  try {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('SQLite Database connected successfully.');
    
    // Auto-create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        party TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS voters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        constituency TEXT NOT NULL,
        dob TEXT NOT NULL,
        has_voted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
  } catch (error) {
    console.error(`Error connecting to Database: ${error.message}`);
    process.exit(1);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB };
