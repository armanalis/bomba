// Oda kayıtları. Vercel'de Upstash Redis, lokalde (env yoksa) bellek kullanılır.
const { Redis } = require('@upstash/redis');

const TTL_SECONDS = 6 * 3600;
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const key = code => `bomba:room:${code}`;

// Sadece kayıttaki sürüm beklenen sürümse yaz. İki oyuncu aynı anda basarsa biri tekrar dener.
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
local v = 0
if cur then v = cjson.decode(cur).v end
if v ~= tonumber(ARGV[2]) then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
return 1`;

const memory = new Map();

async function load(code) {
  if (redis) return redis.get(key(code));
  const raw = memory.get(code);
  return raw ? JSON.parse(raw) : null;
}

async function save(room, prevVersion) {
  room.v = prevVersion + 1;
  const json = JSON.stringify(room);
  if (redis) {
    return (await redis.eval(CAS_SCRIPT, [key(room.code)], [json, String(prevVersion), String(TTL_SECONDS)])) === 1;
  }
  const cur = memory.get(room.code);
  if ((cur ? JSON.parse(cur).v : 0) !== prevVersion) return false;
  memory.set(room.code, json);
  return true;
}

module.exports = { load, save, usingRedis: !!redis };
