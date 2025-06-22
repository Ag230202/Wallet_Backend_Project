const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'wallet.db'), (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create users
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    balance INTEGER DEFAULT 0
  )
`);

// Create transactions
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,        
    amount INTEGER,
    updated_balance INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Create products 
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    description TEXT
  )
`);


function getUserById(userId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.get(sql, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}


function updateUserBalance(userId, newBalance) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE users SET balance = ? WHERE id = ?';
    db.run(sql, [newBalance, userId], function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}


function addTransaction(userId, amount, description = '') {
  return new Promise((resolve, reject) => {

    const type = amount >= 0 ? 'credit' : 'debit';
    
    
    getUserById(userId)
      .then(user => {
        if (!user) throw new Error('User not found for transaction.');

        const updatedBalance = user.balance;

        const sql = `
          INSERT INTO transactions (user_id, type, amount, updated_balance) 
          VALUES (?, ?, ?, ?)
        `;

        db.run(sql, [userId, type, Math.abs(amount), updatedBalance], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      })
      .catch(err => reject(err));
  });
}

module.exports = {
  db,
  getUserById,
  updateUserBalance,
  addTransaction,
};
