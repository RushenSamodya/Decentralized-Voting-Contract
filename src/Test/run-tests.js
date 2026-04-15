const { runElectionFlow } = require('./TestCases/ElectionTest');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
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
  }
}

(async () => {
  try {
    loadEnv();
    await runElectionFlow();
    console.log('All tests completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Tests failed:', e);
    process.exit(1);
  }
})();
