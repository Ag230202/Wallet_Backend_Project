console.log('Starting server setup...');

const express = require('express');
console.log('Express loaded');

const { db } = require('./db');
console.log('DB loaded');

const userRoutes = require('./routes/users');
console.log('User routes loaded');



const productRoutes = require('./routes/products');
console.log('Product routes loaded');

const balanceRoutes = require('./routes/balance');
console.log('Balance routes loaded');

const statementRoutes = require('./routes/statement');
console.log('Statement routes loaded');

const fundRoutes = require('./routes/fund');
console.log('Fund routes loaded');

const payRoutes = require('./routes/pay');
console.log('Pay routes loaded');
const buyRoutes = require('./routes/buy');
console.log('Buy routes loaded');



const app = express();
const PORT = 3000;


app.use(express.json());
console.log('Middleware configured');


app.use('/', userRoutes);                  

app.use('/pay', payRoutes);
app.use('/product', productRoutes);            
app.use('/fund', fundRoutes);                  
app.use('/bal', balanceRoutes);                
app.use('/stmt', statementRoutes);             
app.use('/buy', buyRoutes);


app.get('/', (req, res) => {
  res.send('Wallet Backend Server is running 🚀');
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
