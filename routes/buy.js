const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../db');


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

    req.user = user; 
    next();
  });
}

// buy prod /buy
router.post('/', basicAuth, (req, res) => {
  const user = req.user;
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: 'product_id is required' });
  }

  db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) {
      console.error('Error fetching product:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!product) {
      return res.status(400).json({ error: 'Invalid product' });
    }

    if (user.balance < product.price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = user.balance - product.price;

   
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      
      db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, user.id], function(err) {
        if (err) {
          console.error('Error updating balance:', err.message);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Internal server error' });
        }

        
        const insertTransaction = `
          INSERT INTO transactions (user_id, type, amount, updated_balance, timestamp)
          VALUES (?, 'debit', ?, ?, datetime('now'))
        `;
        db.run(insertTransaction, [user.id, product.price, newBalance], function(err) {
          if (err) {
            console.error('Error inserting transaction:', err.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Internal server error' });
          }

          db.run('COMMIT');
          return res.status(200).json({
            message: 'Product purchased',
            balance: newBalance
          });
        });
      });
    });
  });
});

module.exports = router;
