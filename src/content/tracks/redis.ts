import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Redis documentation (redis.io/docs)';

export const REDIS_LESSONS: Lesson[] = [
  lesson({
    id: 'redis-model',
    title: 'Data structures and the single-threaded core',
    summary: 'An in-memory server of data structures, executing one command at a time.',
    paragraphs: [
      'Redis keeps its data in memory, which is why reads and writes take well under a millisecond. It is more than a key/value string store: each key holds a data structure, and commands operate on that structure on the server.',
      'Strings hold values and counters. Hashes hold objects with fields. Lists work as queues. Sets hold unique members and support intersections. Sorted sets keep members ordered by a score, which makes leaderboards and time-ordered indexes trivial. Streams are an append-only log with consumer groups.',
      'Commands run one at a time on a single thread, so each command is atomic without locks — INCR never loses an update. The flip side is that one slow command (KEYS on a large database, a huge range read) blocks every other client. Keep commands small and avoid anything that is O(N) over a big key.',
    ],
    states: [
      state('Counter', 'INCR is atomic because commands run one at a time. Good for counters and rate limits.', [box('c', 'INCR page:views', 0, 0), store('r', 'String', 1, 0, { sub: '41 → 42', span: 2, tone: 'good' })], [edge('c', 'r')]),
      state('Leaderboard', 'A sorted set keeps members ordered by score: “top 10” is one command.', [box('c', 'ZREVRANGE top 0 9', 0, 0), store('r', 'Sorted set', 1, 0, { sub: 'ana 9100 · ben 8700 · …', span: 2, tone: 'good' })], [edge('c', 'r')]),
      state('Slow command', 'One O(N) command over a huge key holds the only thread; every other client waits behind it.', [box('c1', 'KEYS *', 0, 0, { sub: 'scans everything', tone: 'bad' }), store('r', 'Redis (1 thread)', 1, 0, { sub: 'busy', tone: 'bad' }), box('c2', 'Other clients', 2, 0, { sub: 'blocked', tone: 'warn' })], [edge('c1', 'r', { tone: 'bad' }), edge('c2', 'r', { dashed: true })]),
    ],
    card: {
      points: ['In-memory, sub-millisecond; values are data structures: strings, hashes, lists, sets, sorted sets, streams.', 'Single-threaded command execution makes every command atomic.', 'One slow O(N) command blocks all clients — avoid KEYS, prefer SCAN.'],
      insight: 'Pick the structure that makes your operation one command. If you fetch a value, change it in the app and write it back, you have thrown away Redis’s atomicity.',
      source: SOURCE,
    },
    quiz: [
      q('Why is INCR safe under heavy concurrency without locks?', ['Redis uses optimistic locking', 'Commands execute one at a time on a single thread', 'Clients coordinate with each other', 'It is not safe'], 1, 'Each command runs to completion before the next starts.'),
      q('Which structure fits a leaderboard best?', ['List', 'Hash', 'Sorted set', 'String'], 2, 'Members are kept ordered by score, so ranking queries are cheap.'),
    ],
  }),
  lesson({
    id: 'redis-persistence',
    title: 'Persistence: RDB and AOF',
    summary: 'Redis lives in memory. These are the two ways it gets back after a restart.',
    paragraphs: [
      'RDB takes point-in-time snapshots of the whole dataset to a compact file. Restarting from it is fast, but everything written since the last snapshot is lost in a crash — minutes of data with typical settings.',
      'AOF (append-only file) logs every write command and replays the log at start-up. With the usual “fsync every second” setting you lose at most about one second. The file is larger and restart is slower, and Redis rewrites it periodically to keep it compact.',
      'Many deployments enable both: AOF for durability, RDB for backups and fast restarts. If Redis is used purely as a cache that can be rebuilt, persistence can be switched off entirely. Either way, Redis is not a substitute for a database with real transactional durability.',
    ],
    states: [
      state('RDB', 'A snapshot every few minutes: compact and fast to load, but writes since the last snapshot are lost on a crash.', [store('m', 'Memory', 0, 0, { tone: 'good' }), store('f', 'Snapshot file', 2, 0, { sub: 'as of 5 minutes ago', tone: 'warn' })], [edge('m', 'f', { label: 'periodic' })]),
      state('AOF', 'Every write is appended to a log and flushed each second: at most about one second lost.', [store('m', 'Memory', 0, 0, { tone: 'good' }), store('f', 'Append-only log', 2, 0, { sub: 'every write', tone: 'good' })], [edge('m', 'f', { label: 'each second', tone: 'good' })]),
      state('Cache only', 'No persistence: fastest and simplest. After a restart the cache is empty and must be warmed again.', [store('m', 'Memory', 0, 0, { tone: 'good' }), box('f', 'Nothing on disk', 2, 0, { tone: 'muted' })], []),
    ],
    card: {
      points: ['RDB: periodic snapshots — compact, fast restart, loses minutes.', 'AOF: log of writes, fsync every second — loses about a second, bigger files.', 'Use both for data you care about; none for a pure cache.'],
      insight: 'Decide per Redis instance whether it is a cache or a store. Mixing rebuildable and precious data in one instance forces the wrong settings on one of them.',
      source: SOURCE,
    },
    quiz: [
      q('With AOF set to fsync every second, how much can a crash lose?', ['Nothing', 'About one second of writes', 'Everything since the last snapshot', 'The whole dataset'], 1, 'Writes not yet flushed to disk in that second.'),
      q('Redis is used only as a rebuildable cache. Reasonable persistence setting?', ['Both RDB and AOF with fsync always', 'None', 'AOF only', 'Hourly SQL dumps'], 1, 'If the data can be recomputed, persistence only adds cost.'),
    ],
  }),
  lesson({
    id: 'redis-scaling',
    title: 'Replication, Sentinel and Cluster',
    summary: 'High availability and horizontal scale are two different features.',
    paragraphs: [
      'A Redis primary can have replicas that receive its writes asynchronously and serve reads. Replication alone does not give failover; something has to notice the primary is gone and promote a replica.',
      'Sentinel is that something for a single-primary setup: a group of sentinel processes monitors the primary, agrees by majority that it is down, promotes a replica and tells clients the new address. Because replication is asynchronous, the last writes before a failure can be lost.',
      'Redis Cluster adds horizontal scale. The key space is divided into 16,384 hash slots spread over several primaries, each with its own replicas; clients are redirected to the node that owns a key’s slot. Operations on several keys only work when all the keys are in the same slot, which you force with hash tags such as {user42}:cart and {user42}:profile.',
    ],
    states: [
      state('Sentinel', 'Sentinels agree the primary is down, promote a replica and redirect clients. One dataset, highly available.', [box('s', 'Sentinels ×3', 1, 0, { sub: 'monitor + vote', tone: 'info' }), store('p', 'Primary', 0, 1, { sub: '✕ failed', tone: 'bad' }), store('r', 'Replica', 2, 1, { sub: 'promoted', tone: 'good' })], [edge('s', 'p', { dashed: true, tone: 'bad' }), edge('s', 'r', { tone: 'good' })]),
      state('Cluster', 'The 16,384 slots are split across primaries. A key’s slot decides which node holds it.', [box('c', 'Client', 1, 0, { sub: 'slot = CRC16(key) mod 16384' }), store('a', 'Node A', 0, 1, { sub: 'slots 0–5460', tone: 'good' }), store('b', 'Node B', 1, 1, { sub: '5461–10922', tone: 'good' }), store('d', 'Node C', 2, 1, { sub: '10923–16383', tone: 'good' })], [edge('c', 'a'), edge('c', 'b'), edge('c', 'd')]),
    ],
    card: {
      points: ['Replicas are asynchronous copies; they do not fail over by themselves.', 'Sentinel: monitoring and automatic failover for one primary.', 'Cluster: 16,384 hash slots across primaries; multi-key commands need the same slot (hash tags).'],
      insight: 'Sentinel answers “what if the node dies?”; Cluster answers “what if the data does not fit on one node?”. Do not pay Cluster’s restrictions for a problem Sentinel solves.',
      source: SOURCE,
    },
    quiz: [
      q('How many hash slots does Redis Cluster use?', ['1,024', '4,096', '16,384', '65,536'], 2, 'Each key maps to one of 16,384 slots, and slots are assigned to nodes.'),
      q('Why might a multi-key command fail in Redis Cluster?', ['Clusters are read-only', 'The keys hash to different slots on different nodes', 'Keys are too long', 'Sentinel blocks it'], 1, 'Use a hash tag so related keys land in the same slot.'),
    ],
  }),
  lesson({
    id: 'redis-caching',
    title: 'Caching patterns, TTLs and eviction',
    summary: 'How data gets into the cache, how it leaves, and how to avoid a stampede.',
    paragraphs: [
      'Cache-aside is the common pattern: the application reads the cache, and on a miss reads the database and writes the result into the cache with a TTL. On an update, write the database and then delete the cache key — deleting is safer than trying to update it. Write-through instead updates the cache on every write, which keeps it warm at the cost of slower writes.',
      'A TTL bounds staleness and lets unused keys disappear. When memory is full, the eviction policy decides what goes: allkeys-lru evicts the least recently used key and is the usual choice for a cache; noeviction, the default, rejects writes instead.',
      'When a popular key expires, many requests miss at once and all hit the database: a cache stampede. Add random jitter to TTLs so keys do not expire together, and let only one request rebuild a key while the others wait or serve the stale value.',
    ],
    states: [
      state('Hit', 'The value is in Redis: the database is not touched.', [box('app', 'App', 0, 0), store('r', 'Redis', 1, 0, { sub: 'hit', tone: 'good' }), store('db', 'Database', 2, 0, { sub: 'idle', tone: 'muted' })], [edge('app', 'r', { tone: 'good' })]),
      state('Miss', 'Not cached: read the database, then store the result with a TTL for next time.', [box('app', 'App', 0, 0), store('r', 'Redis', 1, 0, { sub: 'miss → SET with TTL', tone: 'warn' }), store('db', 'Database', 2, 0, { sub: 'read once', tone: 'good' })], [edge('app', 'r'), edge('r', 'db', { label: 'on miss' })]),
      state('Stampede', 'A hot key expires and a thousand requests miss together. All of them hit the database at the same moment.', [box('app', '1,000 requests', 0, 0, { tone: 'warn' }), store('r', 'Redis', 1, 0, { sub: 'key just expired', tone: 'bad' }), store('db', 'Database', 2, 0, { sub: '1,000 identical queries', tone: 'bad' })], [edge('app', 'r'), edge('r', 'db', { tone: 'bad' })]),
    ],
    card: {
      points: ['Cache-aside: read cache → on miss read DB and set with TTL; on update, write DB then delete the key.', 'Eviction: allkeys-lru for caches; the default noeviction rejects writes when full.', 'Prevent stampedes with TTL jitter and single-flight rebuilds.'],
      insight: 'Invalidation is the hard part. Prefer delete-on-write plus a TTL as a safety net over clever in-place cache updates that can leave stale data forever.',
      source: SOURCE,
    },
    quiz: [
      q('In cache-aside, what should happen when the underlying row is updated?', ['Nothing', 'Write the database, then delete the cache key', 'Update only the cache', 'Flush the whole cache'], 1, 'The next read misses and reloads the fresh value.'),
      q('What causes a cache stampede?', ['Too many cache nodes', 'A popular key expiring so that many requests rebuild it simultaneously', 'Using sorted sets', 'A long TTL'], 1, 'Jitter and single-flight rebuilds spread or collapse the load.'),
    ],
  }),
  lesson({
    id: 'redis-beyond-cache',
    title: 'Beyond caching: rate limits, locks and streams',
    summary: 'Small atomic commands make Redis a toolbox for coordination.',
    paragraphs: [
      'A rate limiter needs a counter per client per time window: INCR the key, set an expiry on first use, reject when the count passes the limit. Because INCR is atomic, concurrent requests cannot both slip through.',
      'A lock is SET key value NX PX 30000: it succeeds only if the key does not exist and expires by itself, so a crashed holder cannot block forever. Release it only if the value is still yours. Be honest about its limits: if the holder pauses longer than the expiry, two processes can believe they hold the lock. Use it to avoid duplicate work, not to protect correctness — for that, the protected resource must also check a fencing token.',
      'Pub/Sub delivers a message to whoever is connected right now and forgets it; a subscriber that is offline misses it. Streams persist entries and support consumer groups with acknowledgements, so work survives a consumer crash. Use Pub/Sub for live notifications and Streams for jobs you cannot afford to drop.',
    ],
    states: [
      state('Rate limit', 'One atomic counter per client per minute. Request 101 in the window is rejected.', [box('c', 'Client request', 0, 0), store('r', 'INCR rate:42:12:05', 1, 0, { sub: '101 > limit 100', tone: 'warn' }), box('x', '429 Too Many', 2, 0, { tone: 'bad' })], [edge('c', 'r'), edge('r', 'x', { tone: 'bad' })]),
      state('Lock', 'SET … NX PX: only one worker gets the key, and it expires on its own if that worker dies.', [box('a', 'Worker A', 0, 0, { sub: 'got the lock', tone: 'good' }), store('r', 'lock:report', 1, 0, { sub: 'expires in 30 s', tone: 'info' }), box('b', 'Worker B', 2, 0, { sub: 'NX failed: skips', tone: 'muted' })], [edge('a', 'r', { tone: 'good' }), edge('b', 'r', { dashed: true })]),
      state('Pub/Sub vs Streams', 'Pub/Sub: offline subscribers miss the message. Streams: entries wait until a consumer acknowledges them.', [box('p', 'Producer', 1, 0), box('ps', 'Pub/Sub', 0, 1, { sub: 'fire and forget', tone: 'warn' }), store('st', 'Stream', 2, 1, { sub: 'persisted + acks', tone: 'good' })], [edge('p', 'ps'), edge('p', 'st')]),
    ],
    card: {
      points: ['Rate limiting: INCR + EXPIRE per client and window.', 'Lock: SET key value NX PX ttl; release only your own value; not a correctness guarantee without fencing.', 'Pub/Sub is ephemeral; Streams persist and support consumer groups with acks.'],
      insight: 'A Redis lock is an efficiency tool. If two holders at once would corrupt data, you need a fencing token checked by the resource, or a consensus system.',
      source: SOURCE,
    },
    quiz: [
      q('Why does a Redis lock need an expiry?', ['To save memory', 'So a crashed holder does not block everyone forever', 'To make it faster', 'It does not'], 1, 'Without it, a holder that dies never releases the lock.'),
      q('A subscriber is offline for a minute. With Pub/Sub, what happens to messages published then?', ['They are queued', 'They are lost for that subscriber', 'They are stored in a stream', 'The publisher blocks'], 1, 'Pub/Sub has no persistence; use Streams when messages must not be missed.'),
    ],
  }),
];
