const sqlite3 = require('sqlite3').verbose();

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.db = null;
  }

  open() {
    if (!this.db) this.db = new sqlite3.Database(this.dbFile);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = { SqliteDatabase };
