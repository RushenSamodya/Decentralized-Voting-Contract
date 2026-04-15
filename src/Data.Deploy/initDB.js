const fs = require('fs');
const path = require('path');
const { SqliteDatabase } = require('../Services/Common.Services/dbHandler');
const Tables = require('../Constants/Tables');
const settings = require('../settings.json').settings;

async function initDB() {
  const dbPath = settings.dbPath;
  const db = new SqliteDatabase(dbPath);
  db.open();
  try {
    await db.run('PRAGMA foreign_keys = ON');

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
      Id INTEGER,
      Version FLOAT NOT NULL,
      Description TEXT,
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY("Id" AUTOINCREMENT)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.ELECTIONS} (
      Id INTEGER,
      Title TEXT NOT NULL,
      Description TEXT,
      StartTime DATETIME NOT NULL,
      EndTime DATETIME NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Pending',
      CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY("Id" AUTOINCREMENT)
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.CANDIDATES} (
      Id INTEGER,
      ElectionId INTEGER NOT NULL,
      Name TEXT NOT NULL,
      PRIMARY KEY("Id" AUTOINCREMENT),
      FOREIGN KEY(ElectionId) REFERENCES ${Tables.ELECTIONS}(Id) ON DELETE CASCADE
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.VOTERS} (
      Id INTEGER,
      ElectionId INTEGER NOT NULL,
      VoterPubKey TEXT NOT NULL,
      PRIMARY KEY("Id" AUTOINCREMENT),
      UNIQUE(ElectionId, VoterPubKey),
      FOREIGN KEY(ElectionId) REFERENCES ${Tables.ELECTIONS}(Id) ON DELETE CASCADE
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS ${Tables.VOTES} (
      Id INTEGER,
      ElectionId INTEGER NOT NULL,
      VoterPubKey TEXT NOT NULL,
      CandidateId INTEGER NOT NULL,
      VotedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY("Id" AUTOINCREMENT),
      UNIQUE(ElectionId, VoterPubKey),
      FOREIGN KEY(ElectionId) REFERENCES ${Tables.ELECTIONS}(Id) ON DELETE CASCADE,
      FOREIGN KEY(CandidateId) REFERENCES ${Tables.CANDIDATES}(Id) ON DELETE CASCADE
    )`);

    // Ensure dbScripts folder path exists for compatibility
    const scriptsPath = settings.dbScriptsFolderPath;
    if (!fs.existsSync(scriptsPath)) {
      fs.mkdirSync(scriptsPath, { recursive: true });
    }
  } finally {
    db.close();
  }
}

module.exports = { initDB };
