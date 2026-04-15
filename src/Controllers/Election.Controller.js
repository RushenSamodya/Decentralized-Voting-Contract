const { ElectionService } = require('../Services/Domain.Services/Election.service');

class ElectionController {
  constructor(message, userPubKey) {
    this.message = message;
    this.userPubKey = userPubKey;
    this.service = new ElectionService(message, userPubKey);
  }

  async handleRequest() {
    const action = this.message.Action;
    switch (action) {
      case 'CreateElection':
        return { success: await this.service.createElection() };
      case 'RegisterVoter':
        return { success: await this.service.registerVoter() };
      case 'CastVote':
        return { success: await this.service.castVote() };
      case 'GetElection':
        return { success: await this.service.getElection() };
      case 'GetResults':
        return { success: await this.service.getResults() };
      case 'CloseElection':
        return { success: await this.service.closeElection() };
      default:
        return { error: { message: 'Invalid action' } };
    }
  }
}

module.exports = { ElectionController };
