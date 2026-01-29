// Frontend app.js - talks to same-origin backend (backend serves this file)
async function $(sel){ return document.querySelector(sel); }
function setHtml(html){ document.getElementById('root').innerHTML = html; }
function saveToken(t){ localStorage.setItem('ew_token', t); }
function getToken(){ return localStorage.getItem('ew_token'); }
function authHeaders(){ const t = getToken(); return t ? { 'x-auth-token': t, 'Content-Type':'application/json' } : { 'Content-Type':'application/json' }; }

function showLogin(){ setHtml(`<div class="card">
  <h2>Login</h2>
  <label>Username<input id="u" /></label>
  <label>Password<input id="p" type="password" /></label>
  <div class="row"><button id="loginBtn">Login</button><button id="toReg">Register</button></div>
  <div id="msg"></div>
</div>`);
  document.getElementById('toReg').onclick = showRegister;
  document.getElementById('loginBtn').onclick = async ()=>{
    const username = document.getElementById('u').value.trim();
    const password = document.getElementById('p').value;
    const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password}) });
    const data = await res.json();
    if (data.token){ saveToken(data.token); showDashboard(); } else document.getElementById('msg').innerText = data.error || 'Login failed';
  };
}

function showRegister(){ setHtml(`<div class="card">
  <h2>Register</h2>
  <label>Username<input id="u" /></label>
  <label>Password<input id="p" type="password" /></label>
  <div class="row"><button id="regBtn">Create</button><button id="toLogin">Back</button></div>
  <div id="msg"></div>
</div>`);
  document.getElementById('toLogin').onclick = showLogin;
  document.getElementById('regBtn').onclick = async ()=>{
    const username = document.getElementById('u').value.trim();
    const password = document.getElementById('p').value;
    const res = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password}) });
    const data = await res.json();
    if (data.ok) { alert('Account created. Please login.'); showLogin(); } else document.getElementById('msg').innerText = data.error || 'Failed';
  };
}

async function showDashboard(){
  const res = await fetch('/api/me', { headers: authHeaders() });
  const me = await res.json();
  if (me.error){ alert('Session expired'); logout(); return; }
  const wallet = me.wallet || { balance:0, transactions:[] };
  setHtml(`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>User:</strong> ${me.username}</div>
      <div><strong>Balance:</strong> ₹${wallet.balance.toFixed(2)}</div>
      <div><button id="logoutBtn">Logout</button></div>
    </div>
    <hr/>
    <div style="display:flex;gap:12px;margin-top:12px;">
      <div style="flex:1">
        <h3>Add Funds</h3>
        <label>Amount<input id="addAmt" /></label>
        <button id="addBtn">Add</button>
      </div>
      <div style="flex:1">
        <h3>Transfer</h3>
        <label>To (username)<input id="toUser" /></label>
        <label>Amount<input id="trAmt" /></label>
        <button id="trBtn">Send</button>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-top:12px;">
      <div style="flex:1" class="card">
        <h3>Bill Payment</h3>
        <label>Biller<input id="biller" /></label>
        <label>Amount<input id="billAmt" /></label>
        <button id="billBtn">Pay Bill</button>
      </div>
      <div style="flex:1" class="card">
        <h3>Mobile Recharge</h3>
        <label>Mobile Number<input id="mobile" /></label>
        <label>Amount<input id="rechAmt" /></label>
        <button id="rechBtn">Recharge</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px;"><h3>Transactions</h3><div id="txList">Loading...</div></div>
  </div>`);
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('addBtn').onclick = async ()=>{
    const amt = Number(document.getElementById('addAmt').value);
    const res = await fetch('/api/addFunds', { method:'POST', headers: authHeaders(), body: JSON.stringify({ amount: amt }) });
    const data = await res.json();
    if (data.ok) showDashboard(); else alert(data.error || 'Failed');
  };
  document.getElementById('trBtn').onclick = async ()=>{
    const to = document.getElementById('toUser').value.trim();
    const amt = Number(document.getElementById('trAmt').value);
    const res = await fetch('/api/transfer', { method:'POST', headers: authHeaders(), body: JSON.stringify({ to, amount: amt }) });
    const data = await res.json();
    if (data.ok) showDashboard(); else alert(data.error || 'Failed');
  };
  document.getElementById('billBtn').onclick = async ()=>{
    const biller = document.getElementById('biller').value.trim();
    const amt = Number(document.getElementById('billAmt').value);
    const res = await fetch('/api/bill', { method:'POST', headers: authHeaders(), body: JSON.stringify({ biller, amount: amt }) });
    const data = await res.json();
    if (data.ok) showDashboard(); else alert(data.error || 'Failed');
  };
  document.getElementById('rechBtn').onclick = async ()=>{
    const mobile = document.getElementById('mobile').value.trim();
    const amt = Number(document.getElementById('rechAmt').value);
    const res = await fetch('/api/recharge', { method:'POST', headers: authHeaders(), body: JSON.stringify({ mobile, amount: amt }) });
    const data = await res.json();
    if (data.ok) showDashboard(); else alert(data.error || 'Failed');
  };
  // load transactions
  const txs = await fetch('/api/transactions', { headers: authHeaders() }).then(r=>r.json());
  const list = txs.transactions || [];
  const el = list.length ? list.map(t=>`<div class="tx"><strong>${t.type}</strong> ₹${Number(t.amount).toFixed(2)} — ${t.remark}<div style="font-size:12px;color:#666">${new Date(t.timestamp).toLocaleString()}</div></div>`).join('') : '<div>No transactions</div>';
  document.getElementById('txList').innerHTML = el;
}

function logout(){ localStorage.removeItem('ew_token'); location.reload(); }

// init
(async ()=>{ if (getToken()) showDashboard(); else showLogin(); })();
