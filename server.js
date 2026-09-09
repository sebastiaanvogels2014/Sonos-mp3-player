const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = path.join(__dirname, 'music');
fs.mkdirSync(MUSIC_DIR, { recursive: true });
const upload = multer({ dest: MUSIC_DIR, fileFilter: (_req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() === '.mp3') });
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/music', express.static(MUSIC_DIR));

function localIp() {
  for (const nets of Object.values(os.networkInterfaces())) for (const n of nets || []) if (n.family === 'IPv4' && !n.internal) return n.address;
  return '127.0.0.1';
}
function sonos(args) {
  return new Promise((resolve, reject) => exec(`python3 sonos_control.py ${args.map(a => JSON.stringify(a)).join(' ')}`, { cwd: __dirname }, (e, out, err) => {
    if (e) return reject(new Error(err || e.message));
    try { resolve(JSON.parse(out)); } catch { resolve({ ok: true, output: out }); }
  }));
}
app.get('/api/players', async (_req, res) => { try { res.json(await sonos(['discover'])); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/tracks', (_req, res) => res.json(fs.readdirSync(MUSIC_DIR).filter(f => f.toLowerCase().endsWith('.mp3')).map(name => ({ name, url: `/music/${encodeURIComponent(name)}` }))));
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Alleen MP3-bestanden zijn toegestaan.' });
  const name = `${Date.now()}-${(req.file.originalname || 'song.mp3').replace(/[^a-zA-Z0-9._ -]/g, '_')}`;
  fs.renameSync(req.file.path, path.join(MUSIC_DIR, name)); res.json({ name, url: `/music/${encodeURIComponent(name)}` });
});
app.post('/api/play', async (req, res) => { try { const url = /^https?:\/\//.test(req.body.url) ? req.body.url : `http://${localIp()}:${PORT}${req.body.url}`; res.json(await sonos(['play', req.body.player, url])); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/pause', async (req, res) => { try { res.json(await sonos(['pause', req.body.player])); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/stop', async (req, res) => { try { res.json(await sonos(['stop', req.body.player])); } catch (e) { res.status(500).json({ error: e.message }); } });
app.listen(PORT, '0.0.0.0', () => console.log(`Sonos MP3 Player: http://${localIp()}:${PORT}`));
