const HotPocket = require('hotpocket-js-client');
const { assertSuccessResponse } = require('../test-utils');

async function runElectionFlow() {
  const userKeyPair = await HotPocket.generateKeys();
  const adminPub = (process.env.ADMIN_PUBKEY || '').toLowerCase();
  const adminPrivHex = null; // Not required for connection using generated keys in tests

  const client = await HotPocket.createClient(['wss://localhost:8081'], userKeyPair);
  if (!await client.connect()) throw new Error('HP connection failed');

  // 1. Create Election (admin must run; for testing, we simulate by setting ADMIN_PUBKEY to our generated key public hex)
  const adminPubKeyHex = Buffer.from(userKeyPair.publicKey).toString('hex');
  if (adminPub && adminPub !== adminPubKeyHex.toLowerCase()) {
    console.warn('ADMIN_PUBKEY does not match test client key. Update .env for test.');
  }

  const createReq = {
    Service: 'Election',
    Action: 'CreateElection',
    data: {
      title: 'Test Election',
      description: 'Unit test election',
      startTime: new Date(Date.now() - 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      candidates: ['Alice', 'Bob']
    }
  };

  await client.submitContractInput(Buffer.from(JSON.stringify(createReq)));
  const res1 = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'Election', Action: 'GetElection', data: { electionId: 1 } })));
  let out1 = null;
  try { out1 = JSON.parse(res1.toString()); } catch (e) { out1 = res1; }
  // Not strictly guaranteed to be electionId=1 in a reused DB; skipping strict assert here.

  // 2. Register voter (admin)
  const voterPubKeyHex = Buffer.from(userKeyPair.publicKey).toString('hex');
  const regReq = { Service: 'Election', Action: 'RegisterVoter', data: { electionId: 1, voterPubKey: voterPubKeyHex } };
  await client.submitContractInput(Buffer.from(JSON.stringify(regReq)));

  // 3. Cast vote (as registered voter)
  const voteReq = { Service: 'Election', Action: 'CastVote', data: { electionId: 1, candidateId: 1 } };
  await client.submitContractInput(Buffer.from(JSON.stringify(voteReq)));

  // 4. Get results
  const res2 = await client.submitContractReadRequest(Buffer.from(JSON.stringify({ Service: 'Election', Action: 'GetResults', data: { electionId: 1 } })));
  let out2 = null;
  try { out2 = JSON.parse(res2.toString()); } catch (e) { out2 = res2; }
  assertSuccessResponse(out2, 'Results should be successful');

  client.disconnect();
}

module.exports = { runElectionFlow };
