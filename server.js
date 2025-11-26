const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'leaderboards.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Simple CORS for admin usage
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Basic auth check for admin endpoints. Enforcement is conditional:
// if ADMIN_USER and ADMIN_PASS are set in environment, POST /api/result requires Basic auth.
function checkBasicAuth(req, res, next) {
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;
  if (!ADMIN_USER || !ADMIN_PASS) {
    // Auth not configured; allow but log a warning
    console.warn('ADMIN_USER/ADMIN_PASS not set — admin endpoints are unprotected. Set env vars to enable auth.');
    return next();
  }

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Ortan Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const creds = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = creds.split(':');
  if (user === ADMIN_USER && pass === ADMIN_PASS) return next();

  res.setHeader('WWW-Authenticate', 'Basic realm="Ortan Admin"');
  return res.status(401).json({ error: 'Unauthorized' });
}

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeData(obj) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

// GET leaderboards
app.get('/api/leaderboards', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (err) {
    console.error('Failed to read leaderboards:', err);
    res.status(500).json({ error: 'Failed to read leaderboards' });
  }
});

// POST a result to update standings
// Expected body: { division: "Starter", homeTeamId: "...", awayTeamId: "...", homeGoals: 1, awayGoals: 0 }
app.post('/api/result', checkBasicAuth, (req, res) => {
  try {
    const payload = req.body;
    const { division, homeTeamId, awayTeamId, homeGoals, awayGoals } = payload;
    if (!division || !homeTeamId || !awayTeamId || homeGoals == null || awayGoals == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = readData();
    if (!data.leaderboards[division]) return res.status(400).json({ error: 'Invalid division' });

    const board = data.leaderboards[division];
    const home = board.find(t => t.teamId === homeTeamId);
    const away = board.find(t => t.teamId === awayTeamId);
    if (!home || !away) return res.status(400).json({ error: 'Team not found in division' });

    // Update played
    home.played += 1;
    away.played += 1;

    // Determine result
    if (homeGoals > awayGoals) {
      home.w += 1; home.points += 3;
      away.l += 1;
    } else if (homeGoals < awayGoals) {
      away.w += 1; away.points += 3;
      home.l += 1;
    } else {
      home.d += 1; home.points += 1;
      away.d += 1; away.points += 1;
    }

    // Optionally we could track goals for/against/gd, but not requested.

    // Sort board by points desc, then wins desc
    board.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.w - a.w;
    });

    writeData(data);

    res.json({ success: true, division, board });
  } catch (err) {
    console.error('Failed to post result:', err);
    res.status(500).json({ error: 'Failed to post result' });
  }
});

app.listen(PORT, () => {
  console.log(`Ortan league server running on http://localhost:${PORT}`);
});
