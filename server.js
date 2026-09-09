const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MUSIC_DIR = path.join(__dirname, 'music');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });

const upload = multer({
  dest: MUSIC_DIR,
  fileFilter: (_req, file, cb) => {
    const ok = path.extname(file.originalname).toLowerCase() === '.mp3';
    cb(ok ? null : new Error('Alleen MP3-bestanden zijn toegestaan.'), ok);
  }
});

app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/music', express.static(MUSIC_DIR));

app.get('/api/tracks', (_req, res) => {
  const tracks = fs.readdirSync(MUSIC_DIR)
    .filter(name => name.toLowerCase().endsWith('.mp3'))
    .map(name => ({ name, url: `/music/${encodeURIComponent(name)}` }));
  res.json(tracks);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen MP3-bestand ontvangen.' });
  const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_')}`;
  fs.renameSync(req.file.path, path.join(MUSIC_DIR, safeName));
  res.json({ name: safeName, url: `/music/${encodeURIComponent(safeName)}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sonos MP3 Player draait op http://0.0.0.0:${PORT}`);
  console.log('Gebruik het lokale IP-adres van deze computer om de webapp op je telefoon te openen.');
});
