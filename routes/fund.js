const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { db, updateUserBalance, addTransaction } = require('../db');

// Middleware to authenticate user using Basic Auth
async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Authorization required.' });
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString();
    const [username, password] = decoded.split(':');

    if (!username || !password) {
      return res.status(401).json({ message: 'Invalid authorization header.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('DB error during auth:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      req.user = user; // Attach authenticated user to request
      next();
    });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid authorization header.' });
  }
}

// POST /fund
router.post('/', basicAuth, async (req, res) => {
  const amt = req.body.amt;

  if (typeof amt !== 'number' || amt <= 0) {
    return res.status(400).json({ message: 'Invalid amount.' });
  }

  try {
    const user = req.user;
    const newBalance = user.balance + amt;

    await updateUserBalance(user.id, newBalance);
    await addTransaction(user.id, amt, 'Fund deposit');

    res.status(200).json({ balance: newBalance });
  } catch (err) {
    console.error('Fund account error:', err);
    res.status(500).json({ message: 'Failed to fund account.' });
  }
});

module.exports = router;
