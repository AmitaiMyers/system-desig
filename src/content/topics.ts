// The Learn tab: the full material, grouped by subject. Each section goes deeper than the
// concept cards it lists and is built around a diagram. Sources are cited on the cards.

import type { Topic } from './types';

export const TOPICS: Topic[] = [
  {
    id: 'scaling',
    title: 'Scaling the web tier',
    summary: 'From one box to a fleet: vertical vs horizontal scaling, load balancers, and why spare capacity is not waste.',
    sections: [
      {
        heading: 'From one box to a fleet',
        paragraphs: [
          'Every system starts as one machine running the web server and the database. It is cheap and simple, and it is a single point of failure: when that machine dies, everything is down.',
          'The first step is to give the database its own server, so the two stop fighting over CPU and memory and can be sized separately. That is better, but now there are two machines that each take the product down.',
          'The real change comes with a load balancer and several web servers. This only works if the servers are stateless: any request can go to any server, because sessions and data live in the database or cache, not in one server’s memory.',
        ],
        figure: 'evolve',
        cardIds: ['single-server', 'separate-database', 'stateless', 'horizontal-scaling', 'load-balancer'],
      },
      {
        heading: 'Bigger box or more boxes?',
        paragraphs: [
          'Vertical scaling means buying a bigger server. There is very little to maintain, which is a real advantage. But servers only come so large, the largest ones cost more per request, and you still have a single point of failure.',
          'Horizontal scaling means more servers of ordinary size. Capacity grows in small steps and the price per request stays flat, at the cost of more moving parts.',
          'Neither is “correct”. Choose the simplest architecture that meets your projected traffic — but no simpler. An internal tool for forty people does not need a fleet.',
        ],
        figure: 'scale-out',
        cardIds: ['vertical-scaling', 'simplest-architecture'],
      },
      {
        heading: 'Spare capacity: N+1',
        paragraphs: [
          'If three servers carry your peak, you need four. With exactly three, one failure leaves two servers facing three servers’ worth of traffic, and they fail too.',
          'The spare you must keep idle is one server’s worth of capacity. That is why many small servers are cheaper to protect than two huge ones: losing one of two removes half your capacity.',
        ],
        figure: 'n-plus-one',
        cardIds: ['overprovisioning'],
      },
      {
        heading: 'Why “90% busy” is already too busy',
        paragraphs: [
          'A server at 50% load is not half as fast as an idle one — it is nearly as fast. But as load approaches 100%, requests start waiting in line behind each other, and the wait grows without limit.',
          'A useful rule of thumb from queueing theory: waiting time grows like 1 / (1 − utilization). At 50% busy a request takes about twice the idle time; at 90%, ten times; at 95%, twenty times.',
          'This is why capacity planning aims for well under 100%, and why p99 latency is the first thing to break when a system runs hot.',
        ],
        figure: 'latency-curve',
        cardIds: [],
      },
    ],
  },
  {
    id: 'database',
    title: 'Keeping the database alive',
    summary: 'Standbys, replicas and replication lag: what happens to your data and your uptime when the primary dies.',
    sections: [
      {
        heading: 'Failover: cold, warm, hot',
        paragraphs: [
          'A cold standby is a periodic backup. When the primary dies you restore the backup onto a new machine: long downtime, and everything written since the last backup is gone.',
          'A warm standby receives changes continuously through replication and can be promoted in minutes. It may be a few seconds behind, so the very last writes can be lost.',
          'A hot standby is written at the same time as the primary: nothing is acknowledged until both have it. Failover is immediate and loses nothing, but you pay for an extra node and every write is slower.',
          'Two numbers describe the choice: how long you may be down (recovery time) and how much data you may lose (recovery point). Ask the business for both.',
        ],
        figure: 'failover',
        cardIds: ['failover'],
      },
      {
        heading: 'Read replicas and replication lag',
        paragraphs: [
          'A read replica is a copy of the primary that applies the same stream of writes and answers read queries. Add replicas and you add read capacity; one of them can also be promoted if the primary fails.',
          'Replicas do not add write capacity. Every write must still be applied by the primary and then by every replica.',
          'With asynchronous replication a replica is always slightly behind. A user can post a comment, reload, and not see it, because the reload was served by a replica that had not received the write yet. A common fix is “read your own writes”: for a short time after a user writes, send that user’s reads to the primary.',
        ],
        figure: 'replication',
        cardIds: ['read-replicas', 'replication-lag'],
      },
    ],
  },
  {
    id: 'sharding',
    title: 'Sharding and data models',
    summary: 'Splitting data across many primaries, choosing a shard key, denormalizing, and the CAP trade-off.',
    sections: [
      {
        heading: 'Sharding and the shard key',
        paragraphs: [
          'One primary has a hard ceiling on writes. Sharding removes it by splitting the data across several primaries: a router looks at a shard key in each request and sends it to the shard that owns that key.',
          'The key decides everything. A natural key such as user_id keeps all of a user’s rows together, so most queries touch one shard — but one very popular user (the “celebrity problem”) can overload their shard while the others sit idle.',
          'A hashed key such as hash(post_id) spreads load evenly, so there are no hot shards — but “all posts by this user” now has to ask every shard and merge the answers (scatter-gather), which is slow and only as reliable as the slowest shard.',
          'Other costs: joins across shards are hard, and changing the number of shards later (resharding) is painful. Choose the key as if you can never change it.',
        ],
        figure: 'shards',
        cardIds: ['sharding', 'hot-shard'],
      },
      {
        heading: 'NoSQL and denormalization',
        paragraphs: [
          'Sharded stores work best with simple lookups by key, which is why they are often called NoSQL (MongoDB, DynamoDB, Cassandra, HBase). Many still speak SQL; the point is that they avoid joins.',
          'Normalized data stores each fact once: less storage and updates in one place, but a page may need several lookups. Denormalized data copies what a page needs into one row: one lookup, more storage, and updating a copied fact means touching many rows.',
          'Denormalize for the read you do a million times a day, and accept the awkward update you do rarely.',
        ],
        figure: 'denormalize',
        cardIds: ['nosql-denormalization'],
      },
      {
        heading: 'CAP: you cannot have all three',
        paragraphs: [
          'Consistency (everyone sees the same data), Availability (every request gets an answer) and Partition tolerance (the system survives its network splitting in two). A distributed system can guarantee only two — and since networks do split, the real choice is between consistency and availability during a split.',
          'Single-master systems such as MongoDB and HBase choose consistency: while a new master is elected, writes are refused. Masterless Cassandra chooses availability: any node accepts writes, and nodes converge later (eventual consistency).',
          'ACID is the other vocabulary: Atomicity, Consistency, Isolation, Durability — the promises of a transactional database. Know which of these your use case truly needs before picking a store.',
        ],
        figure: 'cap',
        cardIds: ['cap-theorem'],
      },
    ],
  },
  {
    id: 'caching',
    title: 'Caching',
    summary: 'Answer repeated reads from memory, survive a cold cache, and decide what to evict.',
    sections: [
      {
        heading: 'What a cache buys you',
        paragraphs: [
          'A cache is a fleet of in-memory key/value servers between the application and the database. The application asks the cache first and only goes to the database on a miss, then stores the answer for next time.',
          'It fits workloads with far more reads than writes. A 90% hit rate means the database sees one read in ten — caching is as much a scaling tool as a speed tool.',
          'The expiration policy is the trade-off: keep entries too long and users see stale data; expire them too quickly and the cache does little good.',
        ],
        figure: 'cache',
        cardIds: ['caching'],
      },
      {
        heading: 'Cold start and the thundering herd',
        paragraphs: [
          'A database behind a cache is sized for a warm cache. If the cache restarts empty, every read falls through at once and the database can collapse — and while it is collapsing it cannot refill the cache.',
          'Clients hash each key to one of the cache servers. With several servers, losing one loses only its share of the keys. That is the simplest protection: never let one node hold the whole cache.',
          'The diagram above lets you restart a node and see how much load lands on the database.',
        ],
        figure: null,
        cardIds: ['cache-cold-start'],
      },
      {
        heading: 'Eviction: what to throw away',
        paragraphs: [
          'Memory is finite, so a full cache must evict something. LRU evicts the entry that was used least recently; LFU the one used least often; FIFO the oldest.',
          'LRU is the usual default. It is built from a hash map (to find an entry instantly) and a doubly linked list (to move it to the front on every access and drop from the back).',
          'Memcached is the simple choice: an in-memory key/value store. Redis adds snapshots, replication, transactions, pub/sub and richer data structures, at the cost of more complexity.',
        ],
        figure: 'lru',
        cardIds: ['eviction-policies'],
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivering bytes',
    summary: 'CDNs, object storage, the bandwidth bill, adaptive video — and when to build your own CDN.',
    sections: [
      {
        heading: 'Content delivery networks',
        paragraphs: [
          'A CDN is a set of servers spread around the world that keep copies of your static content — HTML, CSS, JavaScript, images, video — close to users. A request is answered by a nearby edge server instead of crossing an ocean to your origin.',
          'It helps twice: users get lower latency, and your own servers never see most static requests.',
          'CDNs are priced per gigabyte delivered, so not everything belongs on one. Content almost nobody requests can stay on cheaper origin storage.',
        ],
        figure: 'cdn',
        cardIds: ['cdn'],
      },
      {
        heading: 'Object storage',
        paragraphs: [
          'Images and video do not belong in the database or on a web server’s disk. Distributed object storage (Amazon S3, Google Cloud Storage, Azure Blob, HDFS) is built for large files: scalable, cheap and extremely durable — S3 advertises eleven nines of durability.',
          'The pattern is always the same: the file goes to object storage, and the database keeps only its metadata and location. Web servers stay stateless.',
          'Storage tiers trade price for speed of access: hot for what is read daily, cold or archive for what must be kept but is rarely read.',
        ],
        figure: 'object-storage',
        cardIds: ['object-storage'],
      },
      {
        heading: 'The bandwidth bill, and owning the CDN',
        paragraphs: [
          'For any product that serves media, bandwidth is the largest cost, far above servers. Bytes sent from your own data center are the most expensive; a commercial CDN is cheaper per gigabyte.',
          'At very large volume even CDN rates add up to tens of millions a month. Netflix therefore built its own CDN, Open Connect: appliances placed inside internet providers and filled overnight with the titles predicted to be popular. The fixed cost is high and the cost per gigabyte is tiny.',
          'Build versus buy flips with volume. Move the slider in the diagram to find where owning starts to win.',
        ],
        figure: 'egress-cost',
        cardIds: ['bandwidth-cost', 'own-cdn'],
      },
      {
        heading: 'Adaptive bitrate video',
        paragraphs: [
          'A video is encoded at several resolutions, and each version is cut into segments a few seconds long. The player measures its connection and asks for the best version it can sustain, one segment at a time, switching up or down as conditions change (DASH and HLS work this way).',
          'Because each segment is an ordinary static file, ordinary HTTP infrastructure — object storage and a CDN — can deliver video.',
        ],
        figure: 'abr',
        cardIds: ['adaptive-bitrate'],
      },
    ],
  },
  {
    id: 'async',
    title: 'Doing work later',
    summary: 'Message queues, backlog and worker sizing, and the video upload pipeline built on them.',
    sections: [
      {
        heading: 'Message queues',
        paragraphs: [
          'Some work does not need to finish before the user gets an answer: sending notifications, resizing an image, transcoding a video. A message queue lets the request publish a message and return at once; separate consumers (workers) pick messages up and do the work.',
          'The queue decouples the two sides. If the workers fall behind, messages simply wait — the user-facing request is unaffected.',
          'Queues usually deliver each message at least once, so a job may run twice after a crash. Make jobs idempotent: running one twice must have the same effect as running it once.',
        ],
        figure: 'queue',
        cardIds: ['message-queue'],
      },
      {
        heading: 'Backlog and sizing workers',
        paragraphs: [
          'During a spike, jobs arrive faster than workers finish them and the backlog grows. After the spike, workers eat into the backlog and the delay shrinks again.',
          'So workers do not need to be sized for the worst minute — only for the lateness you can tolerate. If jobs may be thirty minutes late, you can run far fewer workers than the peak would need.',
          'A queue turns a capacity problem into a latency problem. That is only a win if someone has agreed the latency is acceptable.',
        ],
        figure: 'backlog',
        cardIds: ['backpressure'],
      },
      {
        heading: 'The video upload pipeline',
        paragraphs: [
          'Uploading stores the raw video in object storage and its metadata in a database, then publishes a message. A fleet of transcoding workers consumes the queue and writes each rendition back to object storage.',
          'When transcoding completes, the metadata is updated and the video becomes watchable. Popular videos are pushed to the CDN; the long tail can be served from origin storage to save money.',
          'Playback is a separate, much simpler path: web servers return the video’s metadata and URL, and the player fetches the bytes from the CDN.',
        ],
        figure: 'upload-pipeline',
        cardIds: ['transcoding-pipeline'],
      },
    ],
  },
  {
    id: 'resilience',
    title: 'Surviving failure',
    summary: 'What can fail, how regions and geo-routing contain it, what an SLA really promises, and why to break things on purpose.',
    sections: [
      {
        heading: 'Things that can fail',
        paragraphs: [
          'Plan for failures of increasing size: a single server, an entire rack, an entire data center (an availability zone), an entire region.',
          'Redundancy only helps if the copies do not fail together. A replica in the same rack as its primary protects against a disk failure and nothing else. Spread secondaries across racks, zones and regions.',
        ],
        figure: 'blast-radius',
        cardIds: ['things-that-fail'],
      },
      {
        heading: 'Regions and geo-routing',
        paragraphs: [
          'Running a full copy of the system in several regions does two things. Geo-routing sends each user to the nearest region, which removes the cross-ocean delay. And when a region fails, the others take over its users.',
          'The survivors must have room for that. With three regions that must survive losing one, each needs half the total peak — 150% provisioned in all.',
          'This is the most expensive availability you can buy. For many systems, provisioning a new server from an offsite backup is good enough.',
        ],
        figure: 'regions',
        cardIds: ['geo-routing'],
      },
      {
        heading: 'SLAs and the nines',
        paragraphs: [
          'An SLA states a target as a percentile. “100 ms at three nines” means 99.9% of requests return within 100 ms. Availability works the same way.',
          'The numbers are less comfortable than they sound: 99% availability still allows 3.65 days of downtime a year. Each extra nine divides the allowance by ten.',
          'Always express requirements this way — a percentile and a number. “Fast” and “reliable” are not requirements.',
        ],
        figure: 'nines',
        cardIds: ['sla-nines'],
      },
      {
        heading: 'Chaos engineering',
        paragraphs: [
          'Failover that has never been used should be assumed broken. Netflix therefore kills servers (Chaos Monkey) and whole regions (Chaos Kong) in production on purpose, continuously.',
          'If the system survives a region being switched off on a Tuesday morning, a real regional outage on a Friday night becomes routine.',
        ],
        figure: null,
        cardIds: ['chaos-engineering'],
      },
    ],
  },
  {
    id: 'interview',
    title: 'The interview itself',
    summary: 'How to run a system design interview: clarify, estimate, sketch, and defend — with a worked URL shortener.',
    sections: [
      {
        heading: 'Clarify first, then work backwards',
        paragraphs: [
          'You will be given a deliberately vague prompt such as “design YouTube”. Turning it into concrete requirements is the first test. Repeat the question back, then ask: who are the customers, what are their use cases, and which of those must I handle?',
          'Work backwards from the customer experience. It limits the scope — you are not designing all of YouTube in twenty minutes — and shows you think about the business, not only the technology.',
          'Pin down scale, latency and availability, think out loud, and get the interviewer’s agreement before you draw anything.',
        ],
        figure: 'interview-flow',
        cardIds: ['clarify-requirements', 'working-backwards'],
      },
      {
        heading: 'Back-of-the-envelope estimation',
        paragraphs: [
          'The interviewer may not tell you the scale. Make an educated guess, say it out loud, and compute roughly: requests per second, storage, bandwidth.',
          'Useful anchors: a day has about 86,400 seconds; a month about 2.6 million. Peak traffic is often several times the average.',
          'Only the order of magnitude matters, because that is what decides the architecture: one box, a fleet, or a planet-wide system.',
        ],
        figure: 'estimator',
        cardIds: ['back-of-envelope'],
      },
      {
        heading: 'Worked example: a URL shortener',
        paragraphs: [
          'Start from the API, because here the API is the product: POST a new or vanity URL, PATCH and DELETE to manage it, and GET to redirect.',
          'Six characters from a–z and 0–9 give 36⁶, about 2.2 billion codes. Traffic is almost entirely redirects — reads of one key — so the design is a load balancer, stateless web servers, a cache, and a sharded key/value store.',
        ],
        figure: 'url-shortener',
        cardIds: ['url-shortener-design'],
      },
      {
        heading: 'Defending your design',
        paragraphs: [
          'The interviewer will poke holes: what happens if this fails, what about a sudden surge, does it meet the requirements we agreed, how would you monitor it?',
          'Be honest about what you do not know and reason through it together. Do not get defensive: this is not the only solution, and what is being judged is your thinking and how you take feedback.',
        ],
        figure: null,
        cardIds: ['defend-your-design'],
      },
    ],
  },
];
