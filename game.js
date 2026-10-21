// Oyun kuralları. Saf fonksiyonlar: oda nesnesini değiştirir, dışarıya bir şey yazmaz.
const WORDS = require('./words');

// Taraflar. Takımlı versiyonda burası takım listesi olacak; sıra bu listede döner.
const PLAYERS = ['user1', 'user2'];
const HOST = PLAYERS[0]; // odayı kuran; oyunu sadece o başlatır
const MAX_PENALTY = 3;
const TRACK_MS = 60_000; // bomba çizginin tamamını bu sürede geçer
const FUSE_MIN_MS = Number(process.env.FUSE_MIN_MS) || 10_000;
const FUSE_MAX_MS = Number(process.env.FUSE_MAX_MS) || 60_000;
const ONLINE_MS = 6_000; // bu süre boyunca sinyal gelmezse oyuncu "bağlı değil" sayılır
const SEEN_EVERY_MS = 2_000; // "buradayım" bilgisini en fazla bu sıklıkla kaydet

const ACTIONS = ['create', 'join', 'state', 'name', 'ready', 'start', 'next', 'correct', 'pass', 'leave'];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const nextPlayer = p => PLAYERS[(PLAYERS.indexOf(p) + 1) % PLAYERS.length];
const isOnline = (room, p, now) => now - (room.seen[p] || 0) < ONLINE_MS;
// Lobide host dışındakiler hazır olmalı; oyun bittikten sonra rövanş için bağlı olmaları yeter.
const canStart = (room, now) => ['lobby', 'over'].includes(room.phase)
  && PLAYERS.every(p => isOnline(room, p, now) && (p === HOST || room.phase === 'over' || room.ready[p]));

function newRoom(code) {
  return {
    v: 0,
    code,
    phase: 'lobby', // lobby | playing | exploded | over
    cids: {}, // oyuncu -> o oyuncuyla giren cihazın id'si
    seen: {}, // oyuncu -> son sinyal zamanı
    names: {}, // oyuncu -> görünen ad
    ready: {}, // oyuncu -> lobide hazır mı (host hariç)
    penalties: Object.fromEntries(PLAYERS.map(p => [p, 0])),
    turn: PLAYERS[0],
    word: null, // WORDS içindeki index
    deck: [],
    startedAt: 0,
    explodeAt: 0,
    loser: null,
  };
}

// Katılan cihaza verilecek yer; yer yoksa undefined. İstenen yer ancak sahibi bağlı değilse verilir.
// Yer istenmediyse önce boş (ya da zaten kendisinin olan) yer, yoksa bağlantısı kopmuş birinin yeri.
function pickSlot(room, cid, now, wanted) {
  const free = p => room.cids[p] === cid || !isOnline(room, p, now);
  if (wanted) return free(wanted) ? wanted : undefined;
  return PLAYERS.find(p => !room.cids[p] || room.cids[p] === cid) || PLAYERS.find(free);
}

function drawWord(room) {
  if (!room.deck.length) room.deck = shuffle(WORDS.map((_, i) => i));
  room.word = room.deck.pop();
}

function startRound(room, starter, now) {
  room.phase = 'playing';
  room.turn = starter;
  room.loser = null;
  room.startedAt = now;
  room.explodeAt = now + FUSE_MIN_MS + Math.random() * (FUSE_MAX_MS - FUSE_MIN_MS);
  drawWord(room);
}

// Bir isteği odaya uygular. Oda değiştiyse true döner.
function step(room, action, player, cid, now, name) {
  let changed = false;

  // Patlama zamanı geçtiyse önce patlat. Sunucu zamanlayıcı tutmuyor; her istek bunu kontrol ediyor.
  if (room.phase === 'playing' && now >= room.explodeAt) {
    room.loser = room.turn;
    room.penalties[room.loser]++;
    room.phase = room.penalties[room.loser] >= MAX_PENALTY ? 'over' : 'exploded';
    changed = true;
  }

  if (action === 'create' || action === 'join') {
    if (room.cids[player] !== cid) delete room.ready[player]; // yeni gelen hazır sayılmasın
    room.cids[player] = cid;
    room.seen[player] = now;
    return true;
  }
  if (room.cids[player] !== cid) return changed; // bu cihaz bu oyuncu değil (ya da başka cihaz devraldı)

  if (action === 'leave') {
    delete room.cids[player];
    delete room.seen[player];
    delete room.ready[player];
    return true;
  }
  if (now - (room.seen[player] || 0) > SEEN_EVERY_MS) {
    room.seen[player] = now;
    changed = true;
  }

  const playing = room.phase === 'playing';
  const myTurn = playing && room.turn === player;
  switch (action) {
    case 'name':
      if (name) {
        room.names[player] = name;
        changed = true;
      }
      break;
    case 'ready':
      if (room.phase === 'lobby' && player !== HOST) {
        room.ready[player] = !room.ready[player];
        changed = true;
      }
      break;
    case 'start':
      if (player === HOST && canStart(room, now)) {
        for (const p of PLAYERS) room.penalties[p] = 0;
        startRound(room, PLAYERS[Math.floor(Math.random() * PLAYERS.length)], now);
        changed = true;
      }
      break;
    case 'next': // patlamadan sonra yeni tur: -1 yiyen başlar
      if (room.phase === 'exploded') {
        startRound(room, room.loser, now);
        changed = true;
      }
      break;
    case 'correct':
      if (myTurn) {
        room.turn = nextPlayer(player);
        drawWord(room);
        changed = true;
      }
      break;
    case 'pass':
      if (myTurn) {
        drawWord(room);
        changed = true;
      }
      break;
  }
  return changed;
}

// Oyuncuya giden görünüm. Oyun sürerken kelimeyi sadece sırası gelen görür; patlama zamanı hiç gönderilmez.
function view(room, player, cid, now) {
  const playing = room.phase === 'playing';
  const showWord = room.word !== null && (!playing || room.turn === player);
  return {
    v: room.v,
    code: room.code,
    round: room.startedAt,
    phase: room.phase,
    turn: room.turn,
    loser: room.loser,
    penalties: room.penalties,
    names: room.names,
    ready: room.ready,
    host: HOST,
    canStart: canStart(room, now),
    maxPenalty: MAX_PENALTY,
    trackMs: TRACK_MS,
    online: Object.fromEntries(PLAYERS.map(p => [p, isOnline(room, p, now)])),
    elapsed: playing ? now - room.startedAt : null,
    me: player,
    word: showWord ? WORDS[room.word] : null,
    replaced: !!room.cids[player] && room.cids[player] !== cid,
  };
}

module.exports = { PLAYERS, HOST, ACTIONS, newRoom, pickSlot, step, view };
