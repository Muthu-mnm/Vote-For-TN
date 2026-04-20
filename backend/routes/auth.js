const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDB } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ── Voter Registration ──
router.post('/auth/voter/register', async (req, res) => {
  try {
    const { voter_id, name, constituency, dob } = req.body;

    if (!voter_id || !name || !constituency || !dob) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate voter ID format (e.g., TN/XX/XXXXXXX)
    if (!/^[A-Z]{2,3}\/\d{2}\/\d{5,10}$/.test(voter_id) && !/^[A-Z]{3}\d{7}$/.test(voter_id)) {
      return res.status(400).json({ error: 'Invalid Voter ID format. Use format like ABC1234567' });
    }

    const db = getDB();

    // Check if voter already exists
    const existing = await db.get('SELECT * FROM voters WHERE voter_id = ?', [voter_id]);
    if (existing) {
      return res.status(400).json({ error: 'Voter ID already registered' });
    }

    await db.run(
      'INSERT INTO voters (voter_id, name, constituency, dob) VALUES (?, ?, ?, ?)',
      [voter_id.toUpperCase(), name, constituency, dob]
    );

    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── Voter Login ──
router.post('/auth/voter/login', async (req, res) => {
  try {
    const { voter_id, dob } = req.body;

    if (!voter_id || !dob) {
      return res.status(400).json({ error: 'Voter ID and Date of Birth are required' });
    }

    const db = getDB();
    const voter = await db.get('SELECT * FROM voters WHERE voter_id = ?', [voter_id.toUpperCase()]);

    if (!voter) {
      return res.status(401).json({ error: 'Voter ID not found. Please register first.' });
    }

    if (voter.dob !== dob) {
      return res.status(401).json({ error: 'Date of Birth does not match our records' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { type: 'voter', voter_id: voter.voter_id, name: voter.name, constituency: voter.constituency, has_voted: voter.has_voted },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      token,
      voter: {
        voter_id: voter.voter_id,
        name: voter.name,
        constituency: voter.constituency,
        has_voted: voter.has_voted
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── Admin Login ──
router.post('/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { type: 'admin', username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ success: true, token, role: 'admin' });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

// ── Verify Token middleware ──
function verifyVoter(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'voter') {
      return res.status(403).json({ error: 'Voter access required' });
    }
    req.voter = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { router, verifyVoter, verifyAdmin };
