const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../db');

// Basic Auth middleware
async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Authorization required.' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (!username || !password) {
    return res.status(401).json({ message: 'Invalid authorization format.' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    req.user = user; // attach user object for next handler
    next();
  });
}

// GET /stmt — transaction history
router.get('/', basicAuth, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      type AS kind,
      amount AS amt,
      updated_balance AS updated_bal,
      timestamp
    FROM transactions
    WHERE user_id = ?
    ORDER BY timestamp DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching transactions:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.json(rows);
  });
});

module.exports = router;
