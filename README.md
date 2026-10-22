<h1 align="center">💣 Bomba</h1>

<p align="center">
  <b>Describe the word, pass the bomb, and don't be holding it when it blows.</b><br>
  A two-player, real-time party word game for phones. No app or account needed.
</p>

<p align="center">
  <a href="https://bombaoyna.vercel.app"><b>▶ Play now at bombaoyna.vercel.app</b></a>
</p>

> The game's interface and word list are in Turkish 🇹🇷

---

## How to play

1. One player taps **ODA KUR** (create room) and shares the link or the room code.
2. The other player taps **ODAYA KATIL** (join room) or just opens the link.
3. When it's your turn, a secret word appears that only you can see. Describe it any way you like.
4. If your friend guesses it, tap **DOĞRU** (correct) and the bomb goes to them. If you're stuck, tap **PAS** (pass) to get a new word.
5. The bomb goes off at a random moment between **10 and 60 seconds**. Whoever is holding it gets **−1**.
6. The first player to reach **−3** loses.

## Features

- **Instant rooms:** share a link like `/?oda=ABCD` and your friend is in with one tap.
- **632 words in 16 categories:** animals, food, jobs, places, tech, emotions, Turkish culture and more.
- **Hidden fuse:** the client is never sent the explosion time, so you can't peek at it.
- **Phone-first:** vibrates on your turn and on the explosion, plays sound (with a mute toggle) and uses the native share sheet.
- **Reconnects:** if a player drops, someone else can take their seat. While a player is still connected, no other device can take their seat.
- **Lobby and rematch:** players set their names and a ready check runs before the host starts. One tap starts a rematch.

## How it works

Bomba runs with **no timers and no WebSockets on the server**. That keeps it fully serverless.

```
 phone ──POST /api/<action> every 500 ms──▶ Express (Vercel Function)
                                              │  load room
                                              │  step(room, action)   ← pure game rules
                                              │  save if changed (compare-and-swap)
                                              ▼
                                         Upstash Redis  (rooms expire after 6 h)
```

- **Lazy explosion:** the server stores `explodeAt` when a round starts. Every request checks it first. Whichever request comes in after that moment sets off the bomb.
- **Optimistic concurrency:** each room has a version number `v`. A Lua script saves the room only if `v` is unchanged, otherwise the request retries (up to 6 times). Two players tapping at the same instant can't corrupt the game.
- **Per-player views:** `view()` sends each player only what they are allowed to see. During a round, only the player whose turn it is gets the word.
- **No database locally:** if no Redis credentials are set, rooms are kept in memory.

## Run locally

Requires Node.js 18+.

```bash
git clone https://github.com/armanalis/bomba.git
cd bomba
npm install
npm start          # → http://localhost:3000
```

Open it in two browser windows (or on your phone over your local network) to play against yourself.

Short fuses make testing faster:

```bash
FUSE_MIN_MS=3000 FUSE_MAX_MS=5000 npm start
```

Run the tests:

```bash
npm test
```

## Deploy to Vercel

1. Import the repo into Vercel. `vercel.json` already routes `/api/*` to the Express app in `api/index.js`.
2. Add an **Upstash Redis** database from the Vercel Marketplace. Vercel sets its environment variables for you.
3. Deploy.

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` | Redis REST endpoint (either name works) |
| `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` | Redis REST token |
| `FUSE_MIN_MS`, `FUSE_MAX_MS` | Optional. Fuse range in ms (default `10000`–`60000`) |
| `PORT` | Optional. Local server port (default `3000`) |

## Adding words

Open `words.js` and add a word to any category's comma-separated list, or add a new category:

```js
'Hayvan': `kedi, köpek, aslan, ...`,
```

Words are uppercased with Turkish rules (`i → İ`) automatically.

## Project structure

```
game.js       Game rules: pure functions (rooms, turns, fuse, per-player views)
server.js     Express API: validation, load → step → save loop
store.js      Upstash Redis with compare-and-swap, or in-memory fallback
words.js      Word list by category
api/index.js  Vercel Function entry point
public/       Front end: vanilla HTML/CSS/JS, no build step
test/         node:test unit tests for game rules
```
