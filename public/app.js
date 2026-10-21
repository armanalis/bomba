const $ = s => document.querySelector(s);
// Her sekme ayrı bir cihaz sayılır. Aynı oyuncuyla başka cihaz girerse eskisi düşer.
const cid = sessionStorage.getItem('bomba-cid') || Math.random().toString(36).slice(2) + Date.now().toString(36);
sessionStorage.setItem('bomba-cid', cid);

// sessionStorage: sayfa yenilenince odaya geri döner, siteye yeniden girilince giriş ekranı açılır.
let session = JSON.parse(sessionStorage.getItem('bomba') || 'null'); // { code, player } — player, katılınca sunucudan gelir
let state = null;
let roundStart = 0; // bombanın yola çıktığı an (performance.now cinsinden)
let lastTick = 0;
let busy = false;
let muted = localStorage.getItem('bomba-muted') === '1';

const label = p => state?.names?.[p] || p.replace('user', 'Oyuncu ');
const clean = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const randomCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ23456789'[Math.floor(Math.random() * 29)]).join('');

// ---------- Giriş ----------
const urlCode = clean(new URLSearchParams(location.search).get('oda'));
$('#codeInput').value = urlCode;
$('#codeInput').addEventListener('input', e => { e.target.value = clean(e.target.value); });

// Giriş ekranında iki seçenek: Oda kur / Odaya katıl. Katıl'a basınca kod kutusu açılır.
function showJoin(on) {
  $('#choices').hidden = on;
  $('#joinForm').hidden = !on;
  if (on) $('#codeInput').focus();
}
$('#joinChoice').onclick = () => showJoin(true);
$('#backBtn').onclick = () => showJoin(false);
if (urlCode) showJoin(true); // paylaşılan linkle gelen direkt kod kutusunu görür

$('#createBtn').onclick = () => join(randomCode(), 'user1', 'create');
$('#joinForm').onsubmit = e => {
  e.preventDefault();
  const code = clean($('#codeInput').value);
  if (!code) return $('#codeInput').focus();
  join(code, undefined, 'join');
};

function join(code, me, action = 'join') {
  session = { code, player: me };
  saveSession();
  history.replaceState(null, '', '?oda=' + code);
  $('#roomCode').textContent = code;
  $('#home').hidden = true;
  $('#game').hidden = false;
  audio();
  keepAwake();
  api(action).finally(schedulePoll); // oda kurulmadan durum sorulmasın
}

const saveSession = () => sessionStorage.setItem('bomba', JSON.stringify(session));

function exitToHome(msg) {
  clearTimeout(pollTimer); // eski odanın bekleyen sorgusu yeni odaya gitmesin
  session = null;
  state = null;
  sessionStorage.removeItem('bomba');
  history.replaceState(null, '', location.pathname);
  document.body.dataset.phase = 'home';
  document.body.classList.remove('my-turn');
  $('#game').hidden = true;
  $('#home').hidden = false;
  if (msg) $('#homeMsg').textContent = msg;
}

$('#leaveBtn').onclick = () => { api('leave'); exitToHome(); showJoin(false); };
$('#correctBtn').onclick = () => act('correct');
$('#passBtn').onclick = () => act('pass');
$('#nameInput').onchange = e => api('name', { name: e.target.value });
$('#nameInput').onkeydown = e => { if (e.key === 'Enter') e.target.blur(); };
$('#shareBtn').onclick = $('#ovShare').onclick = share;
$('#muteBtn').onclick = () => {
  muted = !muted;
  localStorage.setItem('bomba-muted', muted ? '1' : '0');
  renderMute();
};

function act(name) {
  if (busy) return;
  busy = true;
  api(name).finally(() => { busy = false; });
}

// ---------- Sunucu ----------
const ERRORS = {
  notfound: 'Bu kodla bir oda yok.',
  full: 'Oda dolu.',
};

async function api(action, extra) {
  if (!session) return;
  const body = JSON.stringify({ ...session, cid, ...extra });
  const sent = session;
  try {
    const res = await fetch('/api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    if (session !== sent) return;
    if (res.ok) {
      if (session.player !== data.me) {
        session.player = data.me;
        saveSession();
      }
      applyState(data);
    } else if (data.error === 'taken') {
      join(randomCode(), 'user1', 'create'); // kod çakıştı, başka kodla kur
    } else if (ERRORS[data.error]) {
      exitToHome(ERRORS[data.error]);
    }
  } catch {}
}

// Oyun sürerken yarım saniyede bir, diğer zamanlarda saniyede bir durumu çek.
// Sekme gizliyken sorma: açık unutulan sekme sunucu kotasını bitirmesin. Sekme açılınca kaldığı yerden devam eder.
let pollTimer;
function schedulePoll() {
  clearTimeout(pollTimer);
  if (!session || document.visibilityState !== 'visible') return;
  const delay = state?.phase === 'playing' ? 500 : 1000;
  pollTimer = setTimeout(async () => {
    await api('state');
    schedulePoll();
  }, delay);
}
document.addEventListener('visibilitychange', schedulePoll);

async function share() {
  const url = `${location.origin}/?oda=${session.code}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Bomba', text: `Bomba oynuyoruz! Oda: ${session.code}`, url }); } catch {}
    return;
  }
  try { await navigator.clipboard.writeText(url); toast('Link kopyalandı'); } catch { toast(url); }
}

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

const totalPenalty = s => Object.values(s.penalties).reduce((a, b) => a + b, 0);

function applyState(s) {
  if (s.replaced) return exitToHome('Bu oyuncuyla başka bir cihazdan girildi.');
  const prev = state;
  if (prev && s.v < prev.v) return; // geç gelen eski cevap
  state = s;

  if (s.phase === 'playing') {
    const start = performance.now() - s.elapsed;
    // Yeni turda ya da belirgin kayma varsa senkronla; yoksa bomba her cevapta titremesin.
    if (s.round !== prev?.round || Math.abs(start - roundStart) > 400) roundStart = start;
  }
  const wasPlaying = prev?.phase === 'playing';
  if (prev && totalPenalty(s) > totalPenalty(prev)) explodeFx();
  if (s.phase === 'playing' && s.turn === s.me && (!wasPlaying || prev.turn !== s.me)) navigator.vibrate?.(80);
  if (wasPlaying && s.phase === 'playing' && prev.turn !== s.turn) ding();

  render(prev);
}

function render(prev) {
  const s = state;
  const players = Object.keys(s.penalties);
  const playing = s.phase === 'playing';
  const mine = playing && s.turn === s.me;

  document.body.dataset.phase = s.phase;
  document.body.classList.toggle('my-turn', mine);

  for (const el of document.querySelectorAll('.player')) {
    const p = el.dataset.player;
    el.classList.toggle('active', playing && s.turn === p);
    el.classList.toggle('offline', !s.online[p]);
    el.querySelector('.name').textContent = label(p);
    el.querySelector('.tag').textContent = !s.online[p] ? 'bağlı değil' : p === s.me ? 'sen' : '';
    el.querySelector('.lives').innerHTML = Array.from({ length: s.maxPenalty }, (_, i) =>
      `<svg class="life${i < s.penalties[p] ? ' lost' : ''}"><use href="#bomb-icon"/></svg>`).join('');
  }

  const card = $('#card');
  card.classList.toggle('back', !s.word);
  if (s.word) {
    $('#category').textContent = s.word.category;
    $('#word').textContent = s.word.text;
  }
  if (s.word?.text !== prev?.word?.text || s.turn !== prev?.turn) {
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
  }

  const opponentOffline = players.some(p => p !== s.me && !s.online[p]);
  $('#status').textContent = !playing ? ''
    : mine ? 'Anlat! Bilinince DOĞRU, geçmek için PAS.'
    : `${label(s.turn)} anlatıyor…` + (opponentOffline ? ' (bağlantı koptu)' : '');

  $('#actions').classList.toggle('off', !mine);
  renderOverlay(players);
}

function renderOverlay(players) {
  const s = state;
  const ov = $('#overlay');
  ov.hidden = s.phase === 'playing';
  if (ov.hidden) return;

  const isHost = s.me === s.host;
  const btn = $('#ovBtn');
  let icon, title, text = '', btnText, action, disabled = false;

  if (s.phase === 'lobby') {
    // Misafir hazır olunca oyunu sadece oda sahibi başlatır.
    icon = '<svg><use href="#bomb-icon"/></svg>';
    if (isHost) {
      title = s.canStart ? 'Herkes hazır' : players.every(p => s.online[p]) ? 'Rakip hazırlanıyor' : 'Rakip bekleniyor';
      btnText = s.canStart ? 'BAŞLAT' : 'Bekleniyor…';
      action = 'start';
      disabled = !s.canStart;
    } else {
      title = s.ready[s.me] ? `${label(s.host)} başlatacak` : 'Hazır mısın?';
      btnText = s.ready[s.me] ? 'HAZIRSIN ✓' : 'HAZIRIM';
      action = 'ready';
    }
    renderLobby(players);
  } else if (s.phase === 'exploded') {
    icon = burstSvg();
    title = 'BOOM!';
    text = `${label(s.loser)} -1 yedi. Kelime: <b>${s.word.text}</b>`;
    btnText = 'SONRAKİ TUR';
    action = 'next';
  } else {
    const winner = players.find(p => p !== s.loser);
    icon = '<span class="trophy">🏆</span>';
    title = `${label(winner)} KAZANDI!`;
    text = `${label(s.loser)} ${s.maxPenalty} bomba yedi. Son kelime: <b>${s.word.text}</b>`;
    btnText = !isHost ? `${label(s.host)} başlatacak…` : s.canStart ? 'YENİDEN OYNA' : 'Rakip bekleniyor…';
    action = 'start';
    disabled = !isHost || !s.canStart;
  }

  $('#ovIcon').innerHTML = icon;
  $('#ovTitle').textContent = title;
  $('#ovText').innerHTML = text;
  $('#ovText').hidden = !text;
  btn.textContent = btnText;
  btn.disabled = disabled;
  btn.onclick = () => act(action);
  $('#lobby').hidden = $('#ovShare').hidden = s.phase !== 'lobby';
  ov.classList.toggle('delayed', s.phase !== 'lobby');
}

function renderLobby(players) {
  const s = state;
  $('#lobbyCode').textContent = s.code;
  const input = $('#nameInput');
  if (document.activeElement !== input) input.value = s.names[s.me] || '';
  input.placeholder = label(s.me);
  $('#lobbyPlayers').innerHTML = players.map((p, i) => {
    const status = !s.online[p] ? 'bekleniyor…' : p === s.host ? 'oda sahibi' : s.ready[p] ? 'hazır ✓' : 'hazır değil';
    const cls = !s.online[p] ? 'offline' : p === s.host || s.ready[p] ? 'ready' : '';
    return `<li class="${cls}"><span class="num">${i + 1}</span><span class="pname">${label(p)}${p === s.me ? ' (sen)' : ''}</span><span class="pstate">${status}</span></li>`;
  }).join('');
}

// ---------- Bomba animasyonu ----------
const track = $('#track');
function frame(now) {
  requestAnimationFrame(frame);
  if (!state) return;
  if (state.phase === 'lobby') return track.style.setProperty('--p', 0);
  if (state.phase !== 'playing') return; // patladığı yerde kalsın

  const elapsed = now - roundStart;
  const p = Math.min(elapsed / state.trackMs, 1);
  track.style.setProperty('--p', p.toFixed(4));
  // Tik-tak bomba ilerledikçe hızlanır. Patlama anını değil, geçen süreyi takip eder.
  if (now - lastTick >= 900 - 650 * p) {
    lastTick = now;
    tick();
  }
}
requestAnimationFrame(frame);

function burstPoints(n = 14, r1 = 48, r2 = 26) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI * i) / n;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}
const burstSvg = () => `<svg viewBox="0 0 100 100" class="burst-icon"><polygon points="${burstPoints()}"/><polygon points="${burstPoints(10, 30, 16)}" class="core"/></svg>`;
$('.bomb .burst polygon').setAttribute('points', burstPoints());

function explodeFx() {
  boom();
  navigator.vibrate?.([300, 80, 500]);
  const body = document.body;
  body.classList.remove('flash');
  void body.offsetWidth;
  body.classList.add('flash');
}

// ---------- Ses (dosya yok, Web Audio ile üretiliyor) ----------
let ctx;
function audio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
  return ctx;
}
document.addEventListener('pointerdown', () => { audio(); keepAwake(); });

function beep(freq, dur, vol, type = 'square', when = 0) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let tock = false;
function tick() {
  tock = !tock;
  beep(tock ? 1250 : 950, 0.045, 0.06);
}

function ding() {
  beep(880, 0.18, 0.12, 'sine');
  beep(1320, 0.3, 0.1, 'sine', 0.08);
}

function boom() {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const len = ctx.sampleRate * 1.6;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(80, t + 1.4);
  const g = ctx.createGain();
  g.gain.value = 0.9;
  noise.connect(lp).connect(g).connect(ctx.destination);
  noise.start(t);

  const o = ctx.createOscillator();
  const og = ctx.createGain();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.6);
  og.gain.setValueAtTime(0.8, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(og).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.85);
}

function renderMute() {
  $('#muteBtn').textContent = muted ? '🔇' : '🔊';
}
renderMute();

// ---------- Ekran kararmasın ----------
let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || wakeLock || !session || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {}
}
document.addEventListener('visibilitychange', () => keepAwake());

// Sayfa yenilenirse aynı odaya otomatik dön.
if (session && (!urlCode || urlCode === session.code)) join(session.code, session.player);
