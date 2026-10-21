const path = require('path');
const express = require('express');
const { PLAYERS, HOST, ACTIONS, newRoom, pickSlot, step, view } = require('./game');
const store = require('./store');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Vercel'de public/ zaten CDN'den sunuluyor

// Tek uç nokta: POST /api/<aksiyon>  { code, player, cid, name? }
// 'join' oyuncusuz gelirse boş olan ilk yer verilir (oda kodunu giren herkes böyle katılır).
// İstemciler 'state' ile yarım saniyede bir durumu çeker; diğer aksiyonlar oyunu değiştirir.
app.post('/api/:action', async (req, res) => {
  const { action } = req.params;
  const code = String(req.body?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const { player, cid } = req.body || {};
  const anySlot = action === 'join' && player == null;
  if (!ACTIONS.includes(action) || !code || !(anySlot || PLAYERS.includes(player)) || typeof cid !== 'string' || cid.length > 40
    || (action === 'create' && player !== HOST)) {
    return res.status(400).json({ error: 'bad request' });
  }
  // Ad HTML'e basılabildiği için özel karakterler atılır.
  const name = String(req.body.name || '').replace(/[<>&"'`\s]+/g, ' ').trim().slice(0, 16);

  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const now = Date.now();
      const loaded = await store.load(code);
      if (action === 'create' && loaded) return res.status(409).json({ error: 'taken' });
      if (action !== 'create' && !loaded) return res.status(404).json({ error: 'notfound' });
      const me = action === 'join' ? pickSlot(loaded, cid, now, player) : player;
      if (!me) return res.status(409).json({ error: 'full' });
      const room = loaded || newRoom(code);
      const prev = room.v;
      if (!step(room, action, me, cid, now, name) || (await store.save(room, prev))) {
        return res.json(view(room, me, cid, now));
      }
    }
    res.status(409).json({ error: 'busy' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Bomba: http://localhost:${PORT} (${store.usingRedis ? 'Redis' : 'bellek'})`));
}
