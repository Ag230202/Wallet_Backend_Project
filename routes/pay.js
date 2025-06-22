const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { db, getUserById, updateUserBalance, addTransaction } = require('../db');

// Basic Auth middleware (reuse from fund route)
async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Authorization required.' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const [username, password] = Buffer.from(base64Credentials, 'base64').toString().split(':');

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    req.user = user;
    next();
  });
}

// POST /pay
router.post('/', basicAuth, async (req, res) => {
  const { to, amt } = req.body;

  if (!to || !amt || amt <= 0) {
    return res.status(400).json({ message: 'Recipient username and positive amount are required.' });
  }

  const sender = req.user;

  try {
    // Get recipient user
    const recipient = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [to], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!recipient) {
      return res.status(400).json({ message: 'Recipient does not exist.' });
    }

    if (sender.balance < amt) {
      return res.status(400).json({ message: 'Insufficient funds.' });
    }

    // Update sender balance
    const senderNewBalance = sender.balance - amt;
    await updateUserBalance(sender.id, senderNewBalance);

    // Update recipient balance
    const recipientNewBalance = recipient.balance + amt;
    await updateUserBalance(recipient.id, recipientNewBalance);

    // Add transactions (debit for sender, credit for recipient)
    await addTransaction(sender.id, -amt, `Payment to ${recipient.username}`);
    await addTransaction(recipient.id, amt, `Received from ${sender.username}`);

    res.status(200).json({ balance: senderNewBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment failed.' });
  }
});

module.exports = router;
