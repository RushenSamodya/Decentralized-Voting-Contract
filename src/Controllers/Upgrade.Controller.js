const { UpgradeService } = require('../Services/Common.Services/Upgrade.Service');

function isMaintainer(userPubKeyHex) {
  const expected = (process.env.MAINTAINER_PUBKEY || '').toLowerCase();
  return userPubKeyHex && expected && userPubKeyHex.toLowerCase() === expected;
}

class UpgradeController {
  constructor(message, userPubKey) {
    this.message = message;
    this.userPubKey = userPubKey;
    this.service = new UpgradeService(message);
  }

  async handleRequest() {
    try {
      if (this.message.Action !== 'UpgradeContract') return { error: { message: 'Invalid action' } };
      if (!isMaintainer(this.userPubKey)) {
        return { error: { code: 401, message: 'Unauthorized' } };
      }
      // Validate signature of zip content (Ed25519 detached)
      const payload = this.message.data || {};
      const { zipBase64, zipSignatureHex, version, description } = payload;
      if (!zipBase64 || !zipSignatureHex || !version) return { error: { message: 'Invalid upgrade payload' } };

      const sodium = require('libsodium-wrappers');
      await sodium.ready;
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const sig = Buffer.from(zipSignatureHex, 'hex');
      const pub = Buffer.from(this.userPubKey, 'hex');
      const ok = sodium.crypto_sign_detached_verify(new Uint8Array(zipBuffer), new Uint8Array(sig), new Uint8Array(pub));
      if (!ok) return { error: { code: 401, message: 'Signature verification failed' } };

      return await this.service.upgradeContract({ zipBuffer, version: parseFloat(version), description: description || '' });
    } catch (e) {
      return { error: { message: e.message || 'Upgrade failed' } };
    }
  }
}

module.exports = { UpgradeController };
