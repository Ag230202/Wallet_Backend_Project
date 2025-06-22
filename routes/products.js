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

// add -  /product 
router.post('/', basicAuth, (req, res) => {
  const { name, price, description } = req.body;

  if (!name || !price || !description) {
    return res.status(400).json({ message: 'Name, price, and description are required.' });
  }

  const insertQuery = `INSERT INTO products (name, price, description) VALUES (?, ?, ?)`;

  db.run(insertQuery, [name, price, description], function(err) {
    if (err) {
      console.error('Error inserting product:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.status(201).json({ id: this.lastID, message: 'Product added' });
  });
});

// list -  /product
router.get('/', (req, res) => {
  const query = `SELECT id, name, price, description FROM products`;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.json(rows);
  });
});

module.exports = router;
