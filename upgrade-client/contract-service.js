const HotPocket = require('hotpocket-js-client');
const bson = require('bson');

class ContractService {
  constructor(servers, keyPair) {
    this.servers = servers;
    this.userKeyPair = keyPair;
    this.client = null;
    this.promiseMap = new Map();
    this.connected = false;
  }

  async init() {
    if (!this.userKeyPair) this.userKeyPair = await HotPocket.generateKeys();
    this.client = await HotPocket.createClient(this.servers, this.userKeyPair);

    this.client.on(HotPocket.events.disconnect, () => {
      this.connected = false;
      console.log('Disconnected');
    });

    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        let out = null;
        try { out = JSON.parse(o.toString()); } catch (e) { try { out = bson.deserialize(o); } catch (x) { out = o; } }
        const pId = out && out.promiseId ? out.promiseId : null;
        if (pId && this.promiseMap.has(pId)) {
          const rec = this.promiseMap.get(pId);
          if (out.error) rec.rejecter(out.error);
          else rec.resolver(out.success || out);
          this.promiseMap.delete(pId);
        }
      });
    });

    if (!this.connected) {
      if (!await this.client.connect()) return false;
      this.connected = true;
    }
    return true;
  }

  submitInputToContract(inpObj) {
    const promiseId = Math.random().toString(16).slice(2);
    const payload = JSON.stringify({ promiseId, ...inpObj });
    this.client.submitContractInput(Buffer.from(payload));
    let resolver, rejecter;
    const p = new Promise((res, rej) => { resolver = res; rejecter = rej; });
    this.promiseMap.set(promiseId, { resolver, rejecter });
    return p;
  }
}

module.exports = ContractService;
