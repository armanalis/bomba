const test = require('node:test');
const assert = require('node:assert');
const { newRoom, pickSlot, step } = require('../game');

function lobby() {
  const room = newRoom('TEST');
  step(room, 'create', 'user1', 'host', 0);
  step(room, 'join', 'user2', 'guest', 0);
  return room;
}

test('oyunu sadece oda sahibi başlatır, misafir hazır olmadan başlamaz', () => {
  const room = lobby();
  step(room, 'start', 'user1', 'host', 1);
  assert.equal(room.phase, 'lobby');
  step(room, 'ready', 'user2', 'guest', 1);
  step(room, 'start', 'user2', 'guest', 1);
  assert.equal(room.phase, 'lobby');
  step(room, 'start', 'user1', 'host', 1);
  assert.equal(room.phase, 'playing');
});

test('oda sahibi bağlı değilken kodla katılan 2. yere geçer', () => {
  const room = newRoom('TEST');
  step(room, 'create', 'user1', 'host', 0);
  assert.equal(pickSlot(room, 'friend', 60_000), 'user2');
});

test('iki oyuncu da bağlıyken oda dolu', () => {
  const room = lobby();
  assert.equal(pickSlot(room, 'stranger', 1), undefined);
  assert.equal(pickSlot(room, 'stranger', 1, 'user1'), undefined);
  assert.equal(pickSlot(room, 'host', 1, 'user1'), 'user1');
});

test('bomba patlayınca elinde tutan -1 yer', () => {
  const room = lobby();
  step(room, 'ready', 'user2', 'guest', 1);
  step(room, 'start', 'user1', 'host', 1);
  const holder = room.turn;
  step(room, 'state', 'user1', 'host', room.explodeAt);
  assert.equal(room.phase, 'exploded');
  assert.equal(room.loser, holder);
  assert.equal(room.penalties[holder], 1);
});
