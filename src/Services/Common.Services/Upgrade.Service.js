const fs = require('fs');
const Tables = require('../../Constants/Tables');
const { SqliteDatabase } = require('./dbHandler');
const settings = require('../../settings.json').settings;

class UpgradeService {
  constructor(message) {
    this.message = message;
    this.db = new SqliteDatabase(settings.dbPath);
  }

  async upgradeContract(data) {
    let resObj = {};
    const { zipBuffer, version, description } = data;
    this.db.open();
    try {
      const row = await this.db.get(`SELECT Version FROM ${Tables.CONTRACTVERSION} ORDER BY Id DESC LIMIT 1`, []);
      const currentVersion = row ? parseFloat(row.Version) : 1.0;
      if (!(version > currentVersion)) {
        return { error: { code: 403, message: 'Contract version must be greater than current version.' } };
      }

      // Write zip to disk
      fs.writeFileSync(settings.newContractZipFileName, zipBuffer);

      const postScript = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(settings.postExecutionScriptName, postScript);
      fs.chmodSync(settings.postExecutionScriptName, 0o777);

      await this.db.run(`INSERT INTO ${Tables.CONTRACTVERSION} (Version, Description) VALUES (?, ?)`, [version, description || '']);
      resObj = { success: { message: 'Contract upgraded', version } };
    } catch (e) {
      resObj = { error: { code: 500, message: e.message || 'Upgrade failed' } };
    } finally {
      this.db.close();
    }
    return resObj;
  }
}

module.exports = { UpgradeService };
