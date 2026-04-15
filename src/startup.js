// New Test comment from Main

const HotPocket = require('hotpocket-nodejs-contract');
const { Controller } = require('./controller');
const { initDB } = require('./Data.Deploy/initDB');
const { loadEnv } = require('./Utils/env-loader');

const contract = async (ctx) => {
  console.log('Voting system contract is running.');

  // Load .env variables
  loadEnv();

  const isReadOnly = ctx.readonly;

  try {
    await initDB();
  } catch (e) {
    console.error('DB init error:', e);
  }

  const controller = new Controller();

  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try {
        message = JSON.parse(buf);
      } catch (e) {
        try {
          const bson = require('bson');
          message = bson.deserialize(buf);
        } catch (x) {
          await user.send({ error: { message: 'Invalid input format' } });
          continue;
        }
      }
      if (!message || !message.Service || !message.Action) {
        await user.send({ error: { message: 'Malformed request' } });
        continue;
      }
      await controller.handleRequest(user, message, isReadOnly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contract, HotPocket.clientProtocols.JSON, true);
