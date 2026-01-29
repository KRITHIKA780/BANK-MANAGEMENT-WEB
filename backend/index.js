const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { users: {}, tokens: {} };
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();
if (!db.users) db.users = {};
if (!db.tokens) db.tokens = {};

const app = express();
app.use(bodyParser.json());
// Serve frontend static files
app.use(express.static(FRONTEND_DIR));

function authToken(req) {
  const token = req.headers['x-auth-token'];
  if (!token) return null;
  return db.tokens[token] || null;
}

function addTransaction(username, type, amount, remark) {
  const t = { id: uuidv4(), type, amount, remark, timestamp: new Date().toISOString() };
  if (!db.users[username].wallet.transactions) db.users[username].wallet.transactions = [];
  db.users[username].wallet.transactions.unshift(t);
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (db.users[username]) return res.status(400).json({ error: 'username exists' });
  db.users[username] = { password, wallet: { balance: 0, transactions: [] } };
  saveData(db);
  res.json({ ok: true, message: 'Account created' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const u = db.users[username];
  if (!u || u.password !== password) return res.status(401).json({ error: 'invalid credentials' });
  const token = uuidv4();
  db.tokens[token] = username;
  saveData(db);
  res.json({ token, username });
});

app.get('/api/me', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { password, ...safe } = db.users[user];
  res.json({ username: user, wallet: safe.wallet });
});

app.post('/api/addFunds', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const amt = Number(req.body.amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'invalid amount' });
  db.users[user].wallet.balance += amt;
  addTransaction(user, 'CREDIT', amt, 'Add funds');
  saveData(db);
  res.json({ ok: true, balance: db.users[user].wallet.balance });
});

app.post('/api/transfer', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { to, amount } = req.body;
  const a = Number(amount);
  if (!to || !db.users[to]) return res.status(400).json({ error: 'recipient not found' });
  if (!a || a <= 0) return res.status(400).json({ error: 'invalid amount' });
  if (db.users[user].wallet.balance < a) return res.status(400).json({ error: 'insufficient balance' });
  db.users[user].wallet.balance -= a;
  db.users[to].wallet.balance += a;
  addTransaction(user, 'DEBIT', a, 'Transfer to ' + to);
  addTransaction(to, 'CREDIT', a, 'Transfer from ' + user);
  saveData(db);
  res.json({ ok: true, balance: db.users[user].wallet.balance });
});

app.post('/api/bill', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { biller, amount } = req.body;
  const a = Number(amount);
  if (!biller || !a || a <= 0) return res.status(400).json({ error: 'invalid data' });
  if (db.users[user].wallet.balance < a) return res.status(400).json({ error: 'insufficient balance' });
  db.users[user].wallet.balance -= a;
  addTransaction(user, 'DEBIT', a, 'Bill payment: ' + biller);
  saveData(db);
  res.json({ ok: true, balance: db.users[user].wallet.balance });
});

app.post('/api/recharge', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { mobile, amount } = req.body;
  const a = Number(amount);
  if (!mobile || !a || a <= 0) return res.status(400).json({ error: 'invalid data' });
  if (db.users[user].wallet.balance < a) return res.status(400).json({ error: 'insufficient balance' });
  db.users[user].wallet.balance -= a;
  addTransaction(user, 'DEBIT', a, 'Mobile recharge: ' + mobile);
  saveData(db);
  res.json({ ok: true, balance: db.users[user].wallet.balance });
});

app.get('/api/transactions', (req, res) => {
  const user = authToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  res.json({ transactions: db.users[user].wallet.transactions || [] });
});

// Fallback to frontend index (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('E-Wallet full app running on port', PORT));
