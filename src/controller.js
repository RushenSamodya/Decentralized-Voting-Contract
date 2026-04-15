const { ElectionController } = require('./Controllers/Election.Controller');
const { UpgradeController } = require('./Controllers/Upgrade.Controller');

function isAdmin(userPubKeyHex) {
  const expected = (process.env.ADMIN_PUBKEY || '').toLowerCase();
  return userPubKeyHex && expected && userPubKeyHex.toLowerCase() === expected;
}

class Controller {
  async handleRequest(user, message, isReadOnly) {
    const service = message.Service;
    const action = message.Action;
    const userPubKey = user.pubKey;

    try {
      let result = null;

      if (service === 'Election') {
        // Admin-only guards for specific actions
        if (action === 'CreateElection' || action === 'RegisterVoter' || action === 'CloseElection') {
          if (!isAdmin(userPubKey)) {
            await user.send({ error: { code: 401, message: 'Unauthorized' } });
            return;
          }
        }
        const controller = new ElectionController(message, userPubKey);
        result = await controller.handleRequest();
      } else if (service === 'Upgrade') {
        const controller = new UpgradeController(message, userPubKey);
        result = await controller.handleRequest();
      } else {
        result = { error: { message: 'Invalid service' } };
      }

      if (isReadOnly) {
        await user.send(result);
      } else {
        await user.send(message.promiseId ? { promiseId: message.promiseId, ...result } : result);
      }
    } catch (e) {
      await user.send({ error: { message: e.message || 'Unhandled error' } });
    }
  }
}

module.exports = { Controller };
