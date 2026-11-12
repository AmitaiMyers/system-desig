// The growth campaign: one startup, from a single box to three regions.
// Concepts and order follow Frank Kane, "Mastering the System Design Interview" (Sundog Education).

import type { Build, ShardKeyOption, Workload } from '../engine/types';
import type { Level } from './types';

const ONE_REGION: [number, number, number] = [1, 0, 0];

/** Tick index for a clock time (one tick = 5 minutes). */
export function at(hour: number, minute = 0): number {
  return hour * 12 + minute / 5;
}

const WEB_APP: Workload = {
  dau: 0,
  peakRps: 0,
  readRatio: 0.9,
  staticShare: 0.3,
  staticKb: 0,
  cacheableShare: 0.9,
  jobShare: 0,
  jobCost: 0,
  geo: ONE_REGION,
  dataGb: 0,
  shardKeys: [],
};

export const SINGLE_BOX: Build = {
  regions: 1,
  loadBalancer: false,
  app: { size: 'small', count: 1 },
  cache: { nodes: 0 },
  db: { colocated: true, size: 'small', replicas: 0, shards: 1, shardKey: 'user_id', failover: 'none' },
  cdn: 'none',
  objectStorage: false,
  queue: { enabled: false, workers: 0 },
};

export const FEED_SHARD_KEYS: ShardKeyOption[] = [
  {
    id: 'user_id',
    label: 'user_id',
    hotShardShare: 0.3,
    readFanout: 0,
    note: 'All of a user’s posts live on one shard: reads hit a single shard. But one celebrity can overload their shard.',
  },
  {
    id: 'post_id',
    label: 'hash(post_id)',
    hotShardShare: 0,
    readFanout: 0.25,
    note: 'Posts spread perfectly evenly: no hot shard. But “all posts by user X” must ask every shard (scatter-gather).',
  },
];

export const CAMPAIGN: Level[] = [
  {
    id: 'hello-world',
    title: 'Hello, World',
    tagline: 'One server. What could go wrong?',
    story: [
      'You launched “Snapgram” from your bedroom: one small server running the web app and the database together.',
      'It works. Then someone posts your link on Hacker News.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 150_000, peakRps: 150 },
      incidents: [{ kind: 'trafficSpike', atTick: at(12), durationTicks: 12, multiplier: 2.5, scope: 'all', label: 'Front page of Hacker News (2.5× traffic)' }],
      slos: { p99Ms: 200, successRate: 0.995, budget: 250, maxDataLoss: 'all', maxQueueDelayMin: null },
    },
    unlocked: ['appSize'],
    initialBuild: SINGLE_BOX,
    hint: 'You have exactly one lever in this level: tap the server and look at its size.',
    cardIds: ['single-server', 'vertical-scaling', 'simplest-architecture'],
    quiz: [
      {
        question: 'What is the biggest risk of the single-server design?',
        options: ['It is too expensive', 'It is a single point of failure', 'It cannot run a database', 'It needs a load balancer'],
        answerIndex: 1,
        explanation: 'One box holds everything. If it dies, the whole product is down — and scaling it up does not change that.',
      },
      {
        question: 'When is vertical scaling (a bigger box) the right call?',
        options: ['Never — always scale horizontally', 'When traffic is modest and you want the least to maintain', 'Only for databases', 'When you need high availability'],
        answerIndex: 1,
        explanation: 'Choose the simplest architecture that meets your projected traffic — but no simpler. A bigger VM is very little to maintain.',
      },
    ],
  },
  {
    id: 'split-the-box',
    title: 'Split the Box',
    tagline: 'The app and the database are fighting over one CPU.',
    story: [
      'Snapgram is growing steadily. You already bought a large server, and it is choking again.',
      'The web app and the database share the same machine — each gets less than half of it. The next size up costs a fortune.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 2_500_000, peakRps: 2500 },
      incidents: [],
      slos: { p99Ms: 200, successRate: 0.995, budget: 1250, maxDataLoss: 'all', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'splitDb', 'dbSize'],
    initialBuild: { ...SINGLE_BOX, app: { size: 'large', count: 1 } },
    hint: 'Tap the database. It does not have to live on the app server — and then each tier can be sized on its own.',
    cardIds: ['separate-database', 'stateless'],
    quiz: [
      {
        question: 'Why does moving the database to its own server help?',
        options: [
          'Databases are faster on Tuesdays',
          'App and DB stop competing for the same CPU and memory, and each can be scaled independently',
          'It removes all single points of failure',
          'It makes the app stateless automatically',
        ],
        answerIndex: 1,
        explanation: 'Separate tiers have separate resources and separate scaling knobs. You still have two single points of failure, though.',
      },
      {
        question: 'A “stateless” web server means…',
        options: [
          'It has no CPU',
          'It stores user sessions in local memory',
          'Any server can handle any request at any time, because state lives elsewhere (DB/cache)',
          'It never talks to a database',
        ],
        answerIndex: 2,
        explanation: 'Stateless servers keep nothing between requests. That is what makes them interchangeable — the prerequisite for the next level.',
      },
    ],
  },
  {
    id: 'load-balancer',
    title: 'Many Small Boxes',
    tagline: 'A server will die tonight. Make sure nobody notices.',
    story: [
      'You are on the biggest app server money can buy. It handles the load — today.',
      'Hardware fails. Tonight at 19:00, during the evening peak, an app server will die for 30 minutes.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 6_000_000, peakRps: 6000 },
      incidents: [{ kind: 'appServerDown', atTick: at(19), durationTicks: 6, label: 'App server hardware failure (30 min)' }],
      slos: { p99Ms: 200, successRate: 0.995, budget: 2900, maxDataLoss: 'all', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer'],
    initialBuild: {
      ...SINGLE_BOX,
      app: { size: 'xlarge', count: 1 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'large' },
    },
    hint: 'One server = one point of failure. With a load balancer you can run several — but check what happens to the survivors when one dies.',
    cardIds: ['horizontal-scaling', 'load-balancer', 'overprovisioning'],
    quiz: [
      {
        question: 'You need 6,000 req/s. Each server handles 2,000. How many servers survive one failure without overload?',
        options: ['3', '4', '2', '6'],
        answerIndex: 1,
        explanation: 'N+1: 3 servers carry the load, so you need 4. With exactly 3, losing one leaves 4,000 req/s of capacity for 6,000 req/s of traffic.',
      },
      {
        question: 'Why are many medium servers often better than two huge ones?',
        options: [
          'Medium servers have faster CPUs',
          'Losing one of many removes a small slice of capacity; losing one of two removes half',
          'Load balancers only support medium servers',
          'Huge servers cannot be stateless',
        ],
        answerIndex: 1,
        explanation: 'The spare capacity you must keep idle is one server’s worth. The smaller the server, the cheaper that insurance.',
      },
      {
        question: 'What must be true of your web servers for a load balancer to spread traffic freely?',
        options: ['They must be stateless', 'They must be in different countries', 'They must each have their own database', 'They must be vertically scaled first'],
        answerIndex: 0,
        explanation: 'If any server can handle any request, the balancer can send traffic anywhere and remove dead servers without anyone losing a session.',
      },
    ],
  },
  {
    id: 'cache-me',
    title: 'Cache Me If You Can',
    tagline: '95% of requests ask for something you already answered.',
    story: [
      'Snapgram is read-heavy: people scroll far more than they post. The database is drowning in identical queries.',
      'A bigger database would work, but finance says no. And tonight at 19:30 a cache node will restart — empty.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 20_000_000, peakRps: 20_000, readRatio: 0.95 },
      incidents: [{ kind: 'cacheNodeDown', atTick: at(19, 30), label: 'A cache node restarts empty' }],
      slos: { p99Ms: 200, successRate: 0.995, budget: 4800, maxDataLoss: 'all', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 12 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'large' },
    },
    hint: 'A cache protects the database only while it is warm. Ask yourself how much of the cache you lose when one node restarts.',
    cardIds: ['caching', 'cache-cold-start', 'eviction-policies'],
    quiz: [
      {
        question: 'Your single cache node restarts empty at peak. What happens next?',
        options: [
          'Nothing — caches refill instantly',
          'Every read falls through to a database that was sized for a warm cache (thundering herd)',
          'Writes are lost',
          'The load balancer takes over caching',
        ],
        answerIndex: 1,
        explanation: 'The cold-start problem: how do you warm a cache without bringing down whatever you are caching? Spreading keys over several nodes limits the blast radius.',
      },
      {
        question: 'Caching fits best when the workload is…',
        options: ['Write-heavy', 'Read-heavy with data that tolerates being slightly stale', 'Fully transactional', 'Made of unique, never-repeated queries'],
        answerIndex: 1,
        explanation: 'Caches pay off when the same answer is read many times. The expiration policy trades freshness against hit rate.',
      },
      {
        question: 'Which eviction policy removes the entry that has not been touched for the longest time?',
        options: ['FIFO', 'LFU', 'LRU', 'Random'],
        answerIndex: 2,
        explanation: 'LRU = Least Recently Used, classically a hash map plus a doubly linked list. LFU evicts the least frequently used; FIFO the oldest inserted.',
      },
    ],
  },
  {
    id: 'replicas',
    title: 'The Primary Will Die',
    tagline: 'Feeds are personal now. And the database is one disk away from disaster.',
    story: [
      'Personalised feeds mean only half of reads can be cached. The rest hammer your one giant database node.',
      'At 18:30 that node’s disk will fail. Users will forgive a few seconds of lost posts — not a lost database.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 30_000_000, peakRps: 30_000, cacheableShare: 0.5 },
      incidents: [{ kind: 'dbPrimaryDown', atTick: at(18, 30), label: 'Database primary disk failure' }],
      slos: { p99Ms: 200, successRate: 0.995, budget: 7900, maxDataLoss: 'seconds', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 18 },
      cache: { nodes: 2 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'xlarge' },
    },
    hint: 'Read replicas do two jobs at once: they answer reads, and one of them can be promoted when the primary dies.',
    cardIds: ['failover', 'read-replicas', 'replication-lag'],
    quiz: [
      {
        question: 'Cold standby vs. warm standby — what is the difference?',
        options: [
          'Cold is restored from a periodic backup (slow, loses data since the backup); warm is continuously replicated and ready to promote',
          'Cold standby is cheaper and faster',
          'Warm standby accepts writes at the same time as the primary',
          'There is no difference',
        ],
        answerIndex: 0,
        explanation: 'Cold = backup + restore: long downtime, hours of data lost. Warm = replication: quick promotion, seconds lost. Hot = written simultaneously: no loss.',
      },
      {
        question: 'A user posts a comment, refreshes, and the comment is missing. A minute later it is there. Why?',
        options: ['The cache was full', 'The read went to a replica that had not yet received the write (replication lag)', 'The load balancer dropped the write', 'The primary was sharded'],
        answerIndex: 1,
        explanation: 'Asynchronous replicas trail the primary. A common fix is “read your own writes”: route a user’s reads to the primary for a short time after they write.',
      },
      {
        question: 'Which requirement would justify paying for a hot standby?',
        options: ['Lower read latency', 'Zero data loss on failover (e.g. payments)', 'Cheaper storage', 'More cache hits'],
        answerIndex: 1,
        explanation: 'Hot standby writes every transaction to two nodes before confirming. You pay in cost and write latency for losing nothing.',
      },
    ],
  },
  {
    id: 'go-global',
    title: 'Bytes Are Expensive',
    tagline: 'Photos went HD. Your bandwidth bill went vertical.',
    story: [
      'Snapgram now serves high-resolution photos: 60% of all requests are images, about 20 KB each.',
      'Your app servers are busy shovelling bytes, and bandwidth from your own data center costs more than all your servers combined. At 15:00 a meme goes viral.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 60_000_000, peakRps: 60_000, staticShare: 0.6, staticKb: 20, cacheableShare: 0.8, dataGb: 100_000 },
      incidents: [{ kind: 'trafficSpike', atTick: at(15), durationTicks: 12, multiplier: 6, scope: 'static', label: 'A meme goes viral (6× image traffic)' }],
      slos: { p99Ms: 200, successRate: 0.995, budget: 78_000, maxDataLoss: 'seconds', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'objectStorage'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 36 },
      cache: { nodes: 3 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'large', replicas: 2 },
    },
    hint: 'Look at the cost breakdown after a run. Then ask: should an app server ever touch an image at all?',
    cardIds: ['cdn', 'object-storage', 'bandwidth-cost'],
    quiz: [
      {
        question: 'What does a CDN actually do?',
        options: [
          'Runs your database closer to users',
          'Caches static content on servers geographically close to users',
          'Compresses your source code',
          'Replaces the load balancer',
        ],
        answerIndex: 1,
        explanation: 'Geographically distributed local hosting of HTML, CSS, JavaScript, images and video. It cuts latency and takes the load (and bandwidth bill) off your origin.',
      },
      {
        question: 'Where should user-uploaded photos live?',
        options: ['In the relational database as BLOBs', 'On each app server’s local disk', 'In distributed object storage (S3-style), with only metadata in the database', 'In the cache'],
        answerIndex: 2,
        explanation: 'Object storage is built for scalable, durable, cheap blobs (S3 advertises eleven 9s of durability). Local disks break stateless servers; databases are an expensive place for bytes.',
      },
      {
        question: 'An availability SLA of 99% allows how much downtime per year?',
        options: ['About 5 minutes', 'About 9 hours', 'About 3.65 days', 'About 30 seconds'],
        answerIndex: 2,
        explanation: '1% of 365 days is 3.65 days. SLAs can be deceiving: six nines (99.9999%) is about 30 seconds a year.',
      },
    ],
  },
  {
    id: 'shard-it',
    title: 'Shard It',
    tagline: 'One primary cannot take this many writes. No box is big enough.',
    story: [
      'Everyone posts, likes and comments: 12,000 writes per second at peak. The largest database node tops out at 10,000.',
      'Replicas do not help — every write still goes to the one primary. And at 18:00 a celebrity with 80 million followers joins.',
    ],
    scenario: {
      workload: { ...WEB_APP, dau: 120_000_000, peakRps: 120_000, staticShare: 0.5, readRatio: 0.8, cacheableShare: 0.8, dataGb: 800_000, shardKeys: FEED_SHARD_KEYS },
      incidents: [{ kind: 'hotKey', atTick: at(18), durationTicks: 24, label: 'A celebrity joins: one user gets a flood of traffic' }],
      slos: { p99Ms: 250, successRate: 0.995, budget: 50_000, maxDataLoss: 'seconds', maxQueueDelayMin: null },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'objectStorage', 'shards'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 40 },
      cache: { nodes: 3 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'xlarge', replicas: 2 },
      cdn: 'commercial',
      objectStorage: true,
    },
    hint: 'Sharding splits writes across several primaries. The shard key decides which trade-off you live with — try both.',
    cardIds: ['sharding', 'hot-shard', 'nosql-denormalization', 'cap-theorem'],
    quiz: [
      {
        question: 'Why can’t read replicas fix a write bottleneck?',
        options: ['Replicas are slower machines', 'Every write must still be applied by the single primary (and by every replica)', 'Replicas only work with caches', 'They can — just add more'],
        answerIndex: 1,
        explanation: 'Replication copies the full write stream. To scale writes you must partition the data so that different primaries own different keys: sharding.',
      },
      {
        question: 'What is the “celebrity problem”?',
        options: [
          'Famous users demand custom features',
          'A hotspot: one key (a celebrity’s data) draws so much traffic that its shard or cache node is overloaded while others idle',
          'Celebrities write longer posts',
          'Too many shards for one database',
        ],
        answerIndex: 1,
        explanation: 'Sharding assumes load spreads evenly across keys. Real traffic is skewed — hotspots are the classic failure of an otherwise good shard key.',
      },
      {
        question: 'Which is a real cost of sharding?',
        options: ['Reads become impossible', 'Joins and queries across shards are hard, and resharding later is painful', 'It requires vertical scaling', 'It disables replication'],
        answerIndex: 1,
        explanation: 'Sharded stores work best with simple key/value lookups. That is why they are often denormalized “NoSQL” systems: one lookup, more storage, harder updates.',
      },
      {
        question: 'CAP theorem: during a network partition, a system must choose between…',
        options: ['Cost and performance', 'Consistency and availability', 'Caching and partitioning', 'Reads and writes'],
        answerIndex: 1,
        explanation: 'Partition tolerance is not optional at scale. Single-master systems (MongoDB, HBase) favour consistency; masterless Cassandra favours availability with eventual consistency.',
      },
    ],
  },
  {
    id: 'queues',
    title: 'Do It Later',
    tagline: 'Every post notifies thousands of followers. The user is waiting.',
    story: [
      'When someone posts, Snapgram fans out push notifications and renders thumbnails. That work runs inside the request: the user stares at a spinner for half a second, and your app fleet is enormous.',
      'At 16:40 a superstar posts. Notification work jumps 6× for half an hour.',
    ],
    scenario: {
      workload: {
        ...WEB_APP, dau: 150_000_000, peakRps: 150_000, staticShare: 0.5, readRatio: 0.85, cacheableShare: 0.8,
        jobShare: 0.3, jobCost: 30, dataGb: 1_000_000, shardKeys: FEED_SHARD_KEYS,
      },
      incidents: [{ kind: 'trafficSpike', atTick: at(16, 40), durationTicks: 6, multiplier: 6, scope: 'jobs', label: 'A superstar posts: 6× notification fan-out' }],
      slos: { p99Ms: 250, successRate: 0.995, budget: 85_000, maxDataLoss: 'seconds', maxQueueDelayMin: 30 },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'objectStorage', 'shards', 'queue'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 100 },
      cache: { nodes: 3 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'medium', replicas: 1, shards: 16, shardKey: 'post_id' },
      cdn: 'commercial',
      objectStorage: true,
    },
    hint: 'The user needs “your post is saved”, not “all notifications are sent”. Workers do not have to be sized for the worst half hour — only fast enough to catch up in time.',
    cardIds: ['message-queue', 'backpressure'],
    quiz: [
      {
        question: 'What does a message queue give you?',
        options: [
          'Faster database writes',
          'Decoupling: producers keep working even when consumers are slow or backed up',
          'Automatic sharding',
          'Lower bandwidth cost',
        ],
        answerIndex: 1,
        explanation: 'Producers publish and move on. If the consumers get backed up, that is OK — the queue holds the work until they catch up.',
      },
      {
        question: 'A 30-minute spike sends 12,000 jobs/s. Your SLO allows jobs to be 30 minutes late. Roughly what drain rate do you need?',
        options: ['12,000 jobs/s — always size for the peak', 'About 6,000 jobs/s', 'About 1,000 jobs/s', '24,000 jobs/s'],
        answerIndex: 1,
        explanation: 'Backlog after the spike = (12,000 − D) × 1,800 s, and it must drain in ≤ 1,800 s at rate D → D ≥ 6,000. The queue lets you buy half the workers.',
      },
      {
        question: 'A worker crashes halfway through a job and the queue redelivers it. What property must the job have?',
        options: ['Idempotency — running it twice has the same effect as once', 'Atomic clocks', 'Strong consistency', 'A larger payload'],
        answerIndex: 0,
        explanation: 'Queues usually guarantee at-least-once delivery. Design consumers so a duplicate does no harm (e.g. dedupe by job ID).',
      },
    ],
  },
  {
    id: 'region-down',
    title: 'Boss: Region Down',
    tagline: 'Half your users are on other continents. Then a whole region goes dark.',
    story: [
      'Snapgram is global: 50% of users in North America, 30% in Europe, 20% in Asia. Everything runs in one US region, so everyone else waits on an ocean.',
      'At 10:00 the US region loses power for 15 minutes. At 20:00 a database primary fails at the peak of the day. The board wants p99 under 150 ms everywhere.',
    ],
    scenario: {
      workload: {
        ...WEB_APP, dau: 200_000_000, peakRps: 200_000, staticShare: 0.5, readRatio: 0.85, cacheableShare: 0.8,
        jobShare: 0.3, jobCost: 30, geo: [0.5, 0.3, 0.2], dataGb: 1_500_000, shardKeys: FEED_SHARD_KEYS,
      },
      incidents: [
        { kind: 'regionDown', atTick: at(10), durationTicks: 3, label: 'US region power outage (15 min)' },
        { kind: 'dbPrimaryDown', atTick: at(20), label: 'Database primary failure at peak' },
      ],
      slos: { p99Ms: 150, successRate: 0.995, budget: 115_000, maxDataLoss: 'seconds', maxQueueDelayMin: 30 },
    },
    unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'objectStorage', 'shards', 'queue', 'regions'],
    initialBuild: {
      ...SINGLE_BOX,
      loadBalancer: true,
      app: { size: 'medium', count: 75 },
      cache: { nodes: 3 },
      db: { ...SINGLE_BOX.db, colocated: false, size: 'medium', replicas: 1, shards: 20, shardKey: 'post_id' },
      cdn: 'commercial',
      objectStorage: true,
      queue: { enabled: true, workers: 100 },
    },
    hint: 'All counts are per region: three regions means three copies of the stack, so each copy can be much smaller. Size it so two regions can carry the world.',
    cardIds: ['things-that-fail', 'geo-routing', 'sla-nines'],
    quiz: [
      {
        question: 'Which list goes from the smallest to the largest failure you should plan for?',
        options: ['Region → rack → server', 'Server → rack → data center (availability zone) → region', 'Data center → server → region', 'Rack → region → server'],
        answerIndex: 1,
        explanation: 'A single server, an entire rack, an entire data center (AKA availability zone), an entire region. Anything more, and you have bigger problems.',
      },
      {
        question: 'You run 3 regions and must survive losing any one. How much capacity does each region need?',
        options: ['33% of peak', '50% of peak', '100% of peak', '67% of peak'],
        answerIndex: 1,
        explanation: 'Two survivors must carry 100%, so each needs 50%. That is 150% in total — overprovisioning is the price of availability.',
      },
      {
        question: 'An interviewer asks for a multi-region design for an internal admin tool used by 40 people. What should you say?',
        options: [
          'Design three regions anyway',
          'Ask how much downtime the business can tolerate — a restore from backup may be good enough',
          'Refuse to answer',
          'Add a CDN',
        ],
        answerIndex: 1,
        explanation: 'You must balance budget against availability; not every system warrants this. Being down may be an inconvenience rather than a threat to the business. Ask questions.',
      },
    ],
  },
];
