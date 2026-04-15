const Tables = require('../../Constants/Tables');
const { SqliteDatabase } = require('../Common.Services/dbHandler');
const settings = require('../../settings.json').settings;

class ElectionService {
  constructor(message, userPubKey) {
    this.message = message;
    this.db = new SqliteDatabase(settings.dbPath);
    this.userPubKey = userPubKey;
  }

  async createElection() {
    const data = this.message.data || {};
    const { title, description, startTime, endTime, candidates } = data;
    if (!title || !startTime || !endTime || !Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('Invalid election data');
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new Error('Invalid start/end time');
    }

    this.db.open();
    try {
      const now = new Date();
      const status = now < start ? 'Pending' : (now >= start && now <= end ? 'Active' : 'Ended');
      const ins = await this.db.run(
        `INSERT INTO ${Tables.ELECTIONS} (Title, Description, StartTime, EndTime, Status) VALUES (?, ?, ?, ?, ?)`,
        [title, description || '', start.toISOString(), end.toISOString(), status]
      );
      const electionId = ins.lastId;
      for (const name of candidates) {
        await this.db.run(`INSERT INTO ${Tables.CANDIDATES} (ElectionId, Name) VALUES (?, ?)`, [electionId, String(name)]);
      }
      return { electionId };
    } finally {
      this.db.close();
    }
  }

  async registerVoter() {
    const { electionId, voterPubKey } = this.message.data || {};
    if (!electionId || !voterPubKey) throw new Error('Missing electionId or voterPubKey');
    this.db.open();
    try {
      const el = await this.db.get(`SELECT * FROM ${Tables.ELECTIONS} WHERE Id = ?`, [electionId]);
      if (!el) throw new Error('Election not found');
      await this.db.run(`INSERT OR IGNORE INTO ${Tables.VOTERS} (ElectionId, VoterPubKey) VALUES (?, ?)`, [electionId, voterPubKey.toLowerCase()]);
      return { registered: true };
    } finally {
      this.db.close();
    }
  }

  async castVote() {
    const { electionId, candidateId } = this.message.data || {};
    if (!electionId || !candidateId) throw new Error('Missing electionId or candidateId');
    this.db.open();
    try {
      const el = await this.db.get(`SELECT * FROM ${Tables.ELECTIONS} WHERE Id = ?`, [electionId]);
      if (!el) throw new Error('Election not found');
      const now = new Date();
      const start = new Date(el.StartTime);
      const end = new Date(el.EndTime);
      const status = now < start ? 'Pending' : (now >= start && now <= end ? 'Active' : 'Ended');
      if (status !== 'Active' || el.Status === 'Ended') throw new Error('Election not active');

      const reg = await this.db.get(`SELECT * FROM ${Tables.VOTERS} WHERE ElectionId = ? AND VoterPubKey = ?`, [electionId, this.userPubKey.toLowerCase()]);
      if (!reg) throw new Error('Voter not registered');

      const cand = await this.db.get(`SELECT * FROM ${Tables.CANDIDATES} WHERE Id = ? AND ElectionId = ?`, [candidateId, electionId]);
      if (!cand) throw new Error('Candidate not found');

      // Unique constraint prevents double voting
      await this.db.run(`INSERT INTO ${Tables.VOTES} (ElectionId, VoterPubKey, CandidateId) VALUES (?, ?, ?)`, [electionId, this.userPubKey.toLowerCase(), candidateId]);
      return { voted: true };
    } catch (e) {
      if (e && e.message && /UNIQUE constraint failed/.test(e.message)) {
        throw new Error('Already voted');
      }
      throw e;
    } finally {
      this.db.close();
    }
  }

  async getElection() {
    const { electionId } = this.message.data || {};
    if (!electionId) throw new Error('Missing electionId');
    this.db.open();
    try {
      const el = await this.db.get(`SELECT * FROM ${Tables.ELECTIONS} WHERE Id = ?`, [electionId]);
      if (!el) throw new Error('Election not found');
      const cands = await this.db.all(`SELECT * FROM ${Tables.CANDIDATES} WHERE ElectionId = ?`, [electionId]);
      const now = new Date();
      const start = new Date(el.StartTime);
      const end = new Date(el.EndTime);
      const computedStatus = now < start ? 'Pending' : (now >= start && now <= end ? 'Active' : 'Ended');
      const status = el.Status === 'Ended' ? 'Ended' : computedStatus;
      return {
        id: el.Id,
        title: el.Title,
        description: el.Description,
        startTime: el.StartTime,
        endTime: el.EndTime,
        status,
        candidates: cands.map(c => ({ id: c.Id, name: c.Name }))
      };
    } finally {
      this.db.close();
    }
  }

  async getResults() {
    const { electionId } = this.message.data || {};
    if (!electionId) throw new Error('Missing electionId');
    this.db.open();
    try {
      const el = await this.db.get(`SELECT * FROM ${Tables.ELECTIONS} WHERE Id = ?`, [electionId]);
      if (!el) throw new Error('Election not found');
      const rows = await this.db.all(
        `SELECT c.Id as CandidateId, c.Name as CandidateName, COUNT(v.Id) as Votes
         FROM ${Tables.CANDIDATES} c
         LEFT JOIN ${Tables.VOTES} v ON v.CandidateId = c.Id AND v.ElectionId = c.ElectionId
         WHERE c.ElectionId = ?
         GROUP BY c.Id, c.Name
         ORDER BY c.Id ASC`,
        [electionId]
      );
      let winner = null;
      let maxVotes = -1;
      for (const r of rows) {
        const v = Number(r.Votes) || 0;
        if (v > maxVotes) { maxVotes = v; winner = { candidateId: r.CandidateId, name: r.CandidateName, votes: v }; }
      }
      const now = new Date();
      const end = new Date(el.EndTime);
      const isFinal = (el.Status === 'Ended') || now > end;
      return { electionId, results: rows.map(r => ({ candidateId: r.CandidateId, name: r.CandidateName, votes: Number(r.Votes) || 0 })), isFinal, winner: isFinal ? winner : null };
    } finally {
      this.db.close();
    }
  }

  async closeElection() {
    const { electionId } = this.message.data || {};
    if (!electionId) throw new Error('Missing electionId');
    this.db.open();
    try {
      const el = await this.db.get(`SELECT * FROM ${Tables.ELECTIONS} WHERE Id = ?`, [electionId]);
      if (!el) throw new Error('Election not found');
      await this.db.run(`UPDATE ${Tables.ELECTIONS} SET Status = 'Ended', LastUpdatedOn = CURRENT_TIMESTAMP WHERE Id = ?`, [electionId]);
      return { closed: true };
    } finally {
      this.db.close();
    }
  }
}

module.exports = { ElectionService };
