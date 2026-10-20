// Beijing Winter Trip: Express + SQLite, email/password login with cookie sessions.
// The database is SQLite (via sql.js, no compiler needed), saved to trip.db after every write.
const express = require('express');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'trip.db');
const SESSION_DAYS = 30;
const COOKIE = 'trip_session';

initSqlJs().then(SQL => start(openDb(SQL))).catch(err => { console.error(err); process.exit(1); });

/* ---------- database ---------- */
// Small wrapper giving sql.js a prepare().get/all/run + transaction() API.
function openDb(SQL) {
  const sdb = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  let inTx = false;
  const save = () => {
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(sdb.export()));
    fs.renameSync(tmp, DB_PATH);
  };
  const clean = p => p.map(v => (v === undefined ? null : v));
  return {
    exec(sql) { sdb.exec(sql); if (!inTx) save(); },
    prepare(sql) {
      return {
        get(...p) { const st = sdb.prepare(sql); st.bind(clean(p)); const r = st.step() ? st.getAsObject() : undefined; st.free(); return r; },
        all(...p) { const st = sdb.prepare(sql); st.bind(clean(p)); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; },
        run(...p) { sdb.run(sql, clean(p)); if (!inTx) save(); },
      };
    },
    transaction(fn) {
      return () => {
        inTx = true; sdb.run('BEGIN');
        try { fn(); sdb.run('COMMIT'); } catch (e) { sdb.run('ROLLBACK'); throw e; } finally { inTx = false; }
        save();
      };
    },
  };
}

function start(db) {
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, who TEXT NOT NULL DEFAULT 'anyone', due TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'Plan', note TEXT NOT NULL DEFAULT '', done INTEGER NOT NULL DEFAULT 0,
  done_by TEXT, done_for TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, created_by TEXT);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, amount REAL NOT NULL, cur TEXT NOT NULL, paid_by TEXT NOT NULL,
  split TEXT NOT NULL, date TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, created_by TEXT);
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL, sgd REAL NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', when_text TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', ord INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY, city TEXT NOT NULL DEFAULT '', headline TEXT NOT NULL DEFAULT '', plan TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// Add the map-pin area and food picks to days (older databases lack these columns).
const dayCols = db.prepare('PRAGMA table_info(days)').all().map(c => c.name);
if (!dayCols.includes('area')) db.exec("ALTER TABLE days ADD COLUMN area TEXT NOT NULL DEFAULT ''");
if (!dayCols.includes('food')) db.exec("ALTER TABLE days ADD COLUMN food TEXT NOT NULL DEFAULT ''");
{
  const seedFile = path.join(__dirname, 'seed.json');
  if (fs.existsSync(seedFile)) {
    const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const fill = db.prepare("UPDATE days SET area=?, food=? WHERE date=? AND area='' AND food=''");
    db.transaction(() => { for (const [date, v] of Object.entries(seed.days || {})) if (v.area || v.food) fill.run(v.area || '', v.food || '', date); })();
  }
}

const getSetting = k => (db.prepare('SELECT value FROM settings WHERE key=?').get(k) || {}).value;
const setSetting = (k, v) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, String(v));
const bump = () => setSetting('rev', Number(getSetting('rev') || 0) + 1);
const newId = () => crypto.randomBytes(9).toString('base64url');

// First run: seed the trip plan and create a sign-up code.
if (!getSetting('seeded')) {
  const seedFile = path.join(__dirname, 'seed.json');
  if (fs.existsSync(seedFile)) {
    const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    db.transaction(() => {
      setSetting('cnyPerSgd', seed.cnyPerSgd || 5.4);
      const d = db.prepare('INSERT OR REPLACE INTO days(date,city,headline,plan) VALUES(?,?,?,?)');
      for (const [date, v] of Object.entries(seed.days || {})) d.run(date, v.city || '', v.headline || '', v.plan || '');
      const t = db.prepare('INSERT OR IGNORE INTO tasks(id,title,who,due,tag,note,done,created_at) VALUES(?,?,?,?,?,?,?,?)');
      for (const x of seed.tasks || []) t.run(x.id, x.title, x.who || 'anyone', x.due || '', x.tag || 'Plan', x.note || '', x.done ? 1 : 0, x.created_at || 0);
      const i = db.prepare('INSERT OR IGNORE INTO ideas(id,title,city,when_text,note,link,ord) VALUES(?,?,?,?,?,?,?)');
      for (const x of seed.ideas || []) i.run(x.id, x.title, x.city || '', x.when || '', x.note || '', x.link || '', x.ord || 0);
    })();
  }
  setSetting('seeded', '1');
}
const TRIP_CODE = process.env.TRIP_CODE || getSetting('tripCode') || (() => {
  const c = crypto.randomBytes(4).toString('hex').toUpperCase();
  setSetting('tripCode', c);
  return c;
})();

/* ---------- helpers ---------- */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');
const userIds = () => db.prepare('SELECT id FROM users').all().map(r => r.id);

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
function setSessionCookie(req, res, token, maxAgeSec) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure}`);
}
function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
    .run(hashToken(token), userId, Date.now() + SESSION_DAYS * 864e5);
  setSessionCookie(req, res, token, SESSION_DAYS * 86400);
}

// Simple in-memory limiter for login/sign-up attempts.
const attempts = new Map();
function tooMany(key) {
  const now = Date.now(), win = 15 * 60e3, max = 20;
  const list = (attempts.get(key) || []).filter(t => now - t < win);
  list.push(now); attempts.set(key, list);
  return list.length > max;
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
// Mutating requests must be JSON (blocks plain cross-site form posts).
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'DELETE' && !req.is('application/json')) return res.status(415).json({ error: 'Send JSON.' });
  next();
});

function auth(req, res, next) {
  const token = readCookie(req, COOKIE);
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  const row = db.prepare('SELECT s.user_id, s.expires_at, u.name, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(hashToken(token));
  if (!row || row.expires_at < Date.now()) return res.status(401).json({ error: 'Your session ended. Please log in again.' });
  req.user = { id: row.user_id, name: row.name, email: row.email };
  next();
}

app.post('/api/signup', (req, res) => {
  if (tooMany('s:' + req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const name = str(req.body.name, 40), email = str(req.body.email, 120).toLowerCase(), password = req.body.password, code = str(req.body.code, 40).toUpperCase();
  if (code !== TRIP_CODE.toUpperCase()) return res.status(403).json({ error: 'That trip code is wrong. Ask whoever set up the app for it.' });
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'That email already has an account. Log in instead.' });
  const id = newId();
  db.prepare('INSERT INTO users(id,email,name,pass_hash,created_at) VALUES(?,?,?,?,?)').run(id, email, name, bcrypt.hashSync(password, 11), Date.now());
  bump();
  startSession(req, res, id);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), password = req.body.password;
  if (tooMany('l:' + req.ip) || tooMany('e:' + email)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const u = db.prepare('SELECT id, pass_hash FROM users WHERE email=?').get(email);
  if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.pass_hash)) return res.status(401).json({ error: 'Email or password is wrong.' });
  startSession(req, res, u.id);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const token = readCookie(req, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));
  setSessionCookie(req, res, '', 0);
  res.json({ ok: true });
});

app.patch('/api/me', auth, (req, res) => {
  const name = str(req.body.name, 40);
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  db.prepare('UPDATE users SET name=? WHERE id=?').run(name, req.user.id); bump();
  res.json({ ok: true });
});

app.get('/api/state', auth, (req, res) => {
  const rev = Number(getSetting('rev') || 0);
  if (req.query.rev && Number(req.query.rev) === rev) return res.json({ rev, unchanged: true });
  const days = {};
  for (const d of db.prepare('SELECT * FROM days').all()) days[d.date] = { city: d.city, headline: d.headline, plan: d.plan, area: d.area, food: d.food };
  res.json({
    rev,
    me: req.user,
    users: db.prepare('SELECT id, name FROM users ORDER BY created_at').all(),
    cnyPerSgd: Number(getSetting('cnyPerSgd') || 5.4),
    days,
    tasks: db.prepare('SELECT * FROM tasks').all().map(t => ({ ...t, done: !!t.done, done_for: JSON.parse(t.done_for || '{}') })),
    expenses: db.prepare('SELECT * FROM expenses').all().map(x => ({ ...x, split: JSON.parse(x.split || '[]') })),
    settlements: db.prepare('SELECT * FROM settlements').all(),
    ideas: db.prepare('SELECT * FROM ideas ORDER BY ord').all(),
  });
});

/* tasks */
const TAGS = ['Book', 'Pack', 'Ski', 'Money', 'Docs', 'Plan'];
const validWho = w => w === 'anyone' || w === 'everyone' || userIds().includes(w);
const validDue = d => d === '' || DATE_RE.test(d);
app.post('/api/tasks', auth, (req, res) => {
  const title = str(req.body.title, 140), who = req.body.who || 'anyone', due = req.body.due || '', tag = TAGS.includes(req.body.tag) ? req.body.tag : 'Plan';
  if (!title) return res.status(400).json({ error: 'Enter a to-do.' });
  if (!validWho(who) || !validDue(due)) return res.status(400).json({ error: 'Pick a valid person and day.' });
  db.prepare('INSERT INTO tasks(id,title,who,due,tag,created_at,created_by) VALUES(?,?,?,?,?,?,?)').run(newId(), title, who, due, tag, Date.now(), req.user.id);
  bump(); res.json({ ok: true });
});
app.patch('/api/tasks/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'That to-do was deleted.' });
  const b = req.body;
  if ('who' in b) { if (!validWho(b.who)) return res.status(400).json({ error: 'Pick a valid person.' }); t.who = b.who; }
  if ('title' in b) { const v = str(b.title, 140); if (v) t.title = v; }
  if ('due' in b) { if (!validDue(b.due)) return res.status(400).json({ error: 'Pick a valid day.' }); t.due = b.due; }
  if ('done' in b) { t.done = b.done ? 1 : 0; t.done_by = b.done ? req.user.id : null; }
  if (b.doneFor && typeof b.doneFor === 'object') {
    const df = JSON.parse(t.done_for || '{}'), ids = userIds();
    for (const [k, v] of Object.entries(b.doneFor)) if (ids.includes(k)) df[k] = !!v;
    t.done_for = JSON.stringify(df);
  }
  db.prepare('UPDATE tasks SET title=?,who=?,due=?,done=?,done_by=?,done_for=? WHERE id=?').run(t.title, t.who, t.due, t.done, t.done_by, t.done_for, t.id);
  bump(); res.json({ ok: true });
});
app.delete('/api/tasks/:id', auth, (req, res) => { db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id); bump(); res.json({ ok: true }); });

/* expenses + settlements */
app.post('/api/expenses', auth, (req, res) => {
  const title = str(req.body.title, 80), amount = Math.round(Number(req.body.amount) * 100) / 100, cur = req.body.cur === 'SGD' ? 'SGD' : 'CNY';
  const ids = userIds(), paidBy = req.body.paidBy, date = req.body.date || '';
  const split = Array.isArray(req.body.split) ? [...new Set(req.body.split.filter(id => ids.includes(id)))] : [];
  if (!title || !(amount > 0) || amount > 1e7) return res.status(400).json({ error: 'Enter what it was and an amount.' });
  if (!ids.includes(paidBy) || !split.length || !validDue(date)) return res.status(400).json({ error: 'Pick who paid and who it is split between.' });
  db.prepare('INSERT INTO expenses(id,title,amount,cur,paid_by,split,date,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(newId(), title, amount, cur, paidBy, JSON.stringify(split), date, Date.now(), req.user.id);
  bump(); res.json({ ok: true });
});
app.delete('/api/expenses/:id', auth, (req, res) => { db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id); bump(); res.json({ ok: true }); });
app.post('/api/settlements', auth, (req, res) => {
  const ids = userIds(), { from, to } = req.body, sgd = Math.round(Number(req.body.sgd) * 100) / 100;
  if (!ids.includes(from) || !ids.includes(to) || from === to || !(sgd > 0)) return res.status(400).json({ error: 'That payment does not look right.' });
  db.prepare('INSERT INTO settlements(id,from_id,to_id,sgd,created_at) VALUES(?,?,?,?,?)').run(newId(), from, to, sgd, Date.now());
  bump(); res.json({ ok: true });
});
app.delete('/api/settlements/:id', auth, (req, res) => { db.prepare('DELETE FROM settlements WHERE id=?').run(req.params.id); bump(); res.json({ ok: true }); });

/* ideas, days, settings */
app.post('/api/ideas', auth, (req, res) => {
  const title = str(req.body.title, 100), city = str(req.body.city, 30);
  if (!title) return res.status(400).json({ error: 'Enter an idea.' });
  db.prepare('INSERT INTO ideas(id,title,city,ord) VALUES(?,?,?,?)').run(newId(), title, city, Date.now());
  bump(); res.json({ ok: true });
});
app.delete('/api/ideas/:id', auth, (req, res) => { db.prepare('DELETE FROM ideas WHERE id=?').run(req.params.id); bump(); res.json({ ok: true }); });
app.put('/api/days/:date', auth, (req, res) => {
  if (!DATE_RE.test(req.params.date)) return res.status(400).json({ error: 'Bad date.' });
  const cur = db.prepare('SELECT * FROM days WHERE date=?').get(req.params.date) || { city: '', headline: '', plan: '', area: '', food: '' };
  const b = req.body;
  const pick = (k, max) => (k in b ? str(b[k], max) : cur[k] || '');
  const next = { city: pick('city', 40), headline: pick('headline', 120), plan: pick('plan', 1200), area: pick('area', 120), food: pick('food', 1200) };
  db.prepare('INSERT INTO days(date,city,headline,plan,area,food) VALUES(?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET city=excluded.city, headline=excluded.headline, plan=excluded.plan, area=excluded.area, food=excluded.food')
    .run(req.params.date, next.city, next.headline, next.plan, next.area, next.food);
  bump(); res.json({ ok: true });
});
app.put('/api/settings', auth, (req, res) => {
  const r = Number(req.body.cnyPerSgd);
  if (!(r > 0 && r < 100)) return res.status(400).json({ error: 'Enter a sensible exchange rate.' });
  setSetting('cnyPerSgd', r); bump(); res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

// Clear out expired sessions once an hour.
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 3600e3).unref();

app.listen(PORT, () => {
  console.log(`Beijing Winter Trip running at http://localhost:${PORT}`);
  console.log(`Trip code for signing up: ${TRIP_CODE}`);
});
}
