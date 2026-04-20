const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { PARTIES } = require('../config/constants');
const { verifyVoter, verifyAdmin } = require('./auth');

// POST /vote — requires voter authentication
router.post('/vote', verifyVoter, async (req, res) => {
  try {
    const { party } = req.body;
    const voter_id = req.voter.voter_id;

    if (!party) {
      return res.status(400).json({ error: 'Party is required' });
    }

    if (!PARTIES.includes(party)) {
      return res.status(400).json({ error: 'Invalid party' });
    }

    const db = getDB();

    // Check if voter already voted
    const voter = await db.get('SELECT has_voted FROM voters WHERE voter_id = ?', [voter_id]);
    if (voter && voter.has_voted) {
      return res.status(400).json({ error: 'You have already voted' });
    }
    
    // Record the vote
    try {
      await db.run('INSERT INTO votes (user_id, party) VALUES (?, ?)', [voter_id, party]);
    } catch (dbError) {
      if (dbError.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'User has already voted' });
      }
      throw dbError;
    }

    // Mark voter as voted
    await db.run('UPDATE voters SET has_voted = 1 WHERE voter_id = ?', [voter_id]);
    
    // Emit socket event if io is available
    if (req.app.get('io')) {
      req.app.get('io').emit('vote_update');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Vote Error:', error);
    res.status(500).json({ error: 'Server error while voting' });
  }
});

// GET /results — requires admin authentication
router.get('/results', verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    
    // Aggregate votes per party using SQLite
    const results = await db.all('SELECT party, COUNT(*) as count FROM votes GROUP BY party');

    // Ensure all parties are represented in the results, even with 0 votes
    const formattedResults = PARTIES.map(party => {
      const found = results.find(r => r.party === party);
      return {
        party,
        count: found ? found.count : 0
      };
    });

    res.json(formattedResults);
  } catch (error) {
    console.error('Results Error:', error);
    res.status(500).json({ error: 'Server error while fetching results' });
  }
});

module.exports = router;

