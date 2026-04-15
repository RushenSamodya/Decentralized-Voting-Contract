const fs = require('fs');
const path = require('path');
const HotPocket = require('hotpocket-js-client');
const ContractService = require('./contract-service');

// Usage:
// node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>

async function run() {
  const contractUrl = process.argv[2];
  const filepath = process.argv[3];
  const privateKeyHex = process.argv[4];
  const version = process.argv[5];
  const description = process.argv[6] || '';

  if (!contractUrl || !filepath || !privateKeyHex || !version) {
    console.log('Usage: node index.js <contractUrl> <zipFilePath> <privateKeyHex> <version> <description>');
    process.exit(1);
  }

  const sodium = require('libsodium-wrappers');
  await sodium.ready;

  // Derive keypair from provided private key hex (seed)
  const seed = Buffer.from(privateKeyHex, 'hex');
  const kp = sodium.crypto_sign_seed_keypair(new Uint8Array(seed));
  const keyPair = { publicKey: Buffer.from(kp.publicKey), privateKey: Buffer.from(kp.privateKey.slice(0, 32)) };

  const contractService = new ContractService([contractUrl], keyPair);
  const ok = await contractService.init();
  if (!ok) { console.log('Connection failed.'); process.exit(1); }

  const zipBuffer = fs.readFileSync(path.resolve(filepath));
  const signature = sodium.crypto_sign_detached(new Uint8Array(zipBuffer), kp.privateKey);
  const zipBase64 = Buffer.from(zipBuffer).toString('base64');
  const zipSignatureHex = Buffer.from(signature).toString('hex');

  const submitData = {
    Service: 'Upgrade',
    Action: 'UpgradeContract',
    data: {
      zipBase64,
      zipSignatureHex,
      version: parseFloat(version),
      description
    }
  };

  try {
    const res = await contractService.submitInputToContract(submitData);
    console.log('Upgrade result:', res);
  } catch (e) {
    console.error('Upgrade failed:', e);
  } finally {
    process.exit(0);
  }
}

run();
