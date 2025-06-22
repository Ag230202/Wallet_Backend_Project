const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcrypt');
const { db, getUserById } = require('../db');

// Your currency API key
const CURRENCY_API_KEY = 'cur_live_U4bXtzF9hlqeDpoDgvOMLhkbDRvSXFdUiSsrBLg5';

// Middleware for Basic Auth
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

    req.user = user; // attach user to request object
    next();
  });
}

// GET /bal?currency=USD
router.get('/', basicAuth, async (req, res) => {
  const user = req.user;
  const targetCurrency = req.query.currency?.toUpperCase();

  try {
    const originalBalance = user.balance;
    const userCurrency = user.currency || 'INR';

    if (!targetCurrency || targetCurrency === userCurrency) {
      return res.json({
        balance: parseFloat(originalBalance.toFixed(2)),
        currency: userCurrency,
      });
    }

    // Fetch conversion rate
    const apiResponse = await axios.get('https://api.currencyapi.com/v3/latest', {
      params: {
        apikey: CURRENCY_API_KEY,
        base_currency: userCurrency,
        currencies: targetCurrency,
      },
    });

    const rate = apiResponse?.data?.data?.[targetCurrency]?.value;
    if (!rate) {
      return res.status(400).json({ message: 'Invalid or unsupported currency.' });
    }

    const convertedBalance = originalBalance * rate;

    res.json({
      balance: parseFloat(convertedBalance.toFixed(2)),
      currency: targetCurrency,
    });
  } catch (error) {
    console.error('Balance check failed:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
