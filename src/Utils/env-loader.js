const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '..', '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const res = fs.readFileSync(envPath, 'utf8');
    res.split(/\?\
/).forEach((line) => {
      if (!line || /^\s*#/.test(line)) return;
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    });
  } catch (e) {
    console.error('Failed to load .env:', e);
  }
}

module.exports = { loadEnv };
