// Classic interview case studies, played as: clarify → estimate → design → survive.
// Interview flow follows Frank Kane's mock interviews; real-world details are cited per case.

import type { Build } from '../engine/types';
import { at, SINGLE_BOX } from './campaign';
import type { CaseStudy } from './types';

const FIRST_SKETCH: Build = {
  ...SINGLE_BOX,
  db: { ...SINGLE_BOX.db, colocated: false, shardKey: 'id' },
};

export const CASES: CaseStudy[] = [
  {
    id: 'url-shortener',
    title: 'Design a URL Shortener',
    tagline: 'bit.ly at scale: tiny writes, a tsunami of redirects.',
    prompt: '“Design a URL shortening service.”',
    requirementsIntro: 'The prompt is vague on purpose. Pick the questions and requirements worth raising before you draw anything. Avoid the traps.',
    requirements: [
      { text: 'What scale are we talking about — how many redirects per second?', good: true, why: 'Scale decides everything: one server or a horizontally scaled fleet with a distributed store.' },
      { text: 'How short is short? Which characters may we use?', good: true, why: 'a–z and 0–9 give 36 symbols; 6 characters = 36⁶ ≈ 2.2 billion codes. Symbols are hard to remember or type.' },
      { text: 'Can users pick vanity URLs, and edit or delete links?', good: true, why: 'This defines the API: POST (new / vanity), PATCH, DELETE, GET (redirect).' },
      { text: 'How long do shortened URLs last?', good: true, why: 'Retention drives storage size and whether codes can ever be reused.' },
      { text: 'Let’s start by picking the programming language and web framework.', good: false, why: 'Implementation detail. Interviewers want requirements and architecture first.' },
      { text: 'We need strong ACID transactions across all links.', good: false, why: 'Each link is an independent key → value. Simple lookups are exactly what a distributed NoSQL store is good at.' },
      { text: 'We should build a recommendation engine for popular links.', good: false, why: 'Scope creep. Use requirements to limit what you are being asked to build.' },
    ],
    estimation: [
      {
        question: 'Lower-case letters and digits, 6 characters. How many distinct short codes exist?',
        options: ['About 46,000', 'About 2.2 million', 'About 2.2 billion', 'About 2.2 trillion'],
        answerIndex: 2,
        explanation: '36 symbols, 6 positions: 36⁶ = 2,176,782,336 ≈ 2.2 billion.',
      },
      {
        question: '100 million new links per month. Roughly how many writes per second?',
        options: ['~4', '~40', '~400', '~4,000'],
        answerIndex: 1,
        explanation: '100M / (30 days × 86,400 s) ≈ 100M / 2.6M ≈ 40 writes/s. Writes are tiny — this system is all about reads.',
      },
      {
        question: 'Each link is redirected 100 times on average, and peak traffic is ~10× the mean. Peak redirects per second?',
        options: ['~400', '~4,000', '~40,000', '~4 million'],
        answerIndex: 2,
        explanation: '40 writes/s × 100 = 4,000 reads/s on average; ×10 at peak ≈ 40,000/s. A 99:1 read-heavy workload.',
      },
      {
        question: '100M links/month, kept 5 years, ~500 bytes each. Total storage?',
        options: ['~3 GB', '~300 GB', '~3 TB', '~3 PB'],
        answerIndex: 2,
        explanation: '100M × 60 months = 6 billion links × 500 B = 3 TB. Fits comfortably on a small sharded cluster.',
      },
    ],
    level: {
      id: 'case-url-shortener',
      title: 'URL Shortener — build it',
      tagline: '40,000 redirects per second, 99% reads.',
      story: [
        'You agreed on the requirements: 40,000 req/s at peak, 99% of them redirects (GET /abc123), high availability, and links must not be lost.',
        'Your first whiteboard sketch is one web server and one database. The interviewer raises an eyebrow: “What happens when a link goes viral? When a cache node restarts? When the primary dies?”',
      ],
      scenario: {
        workload: {
          dau: 40_000_000, peakRps: 40_000, readRatio: 0.99, staticShare: 0.02, staticKb: 0, cacheableShare: 0.95,
          jobShare: 0, jobCost: 0, geo: [1, 0, 0], dataGb: 0,
          shardKeys: [{ id: 'id', label: 'hash(short_code)', hotShardShare: 0, readFanout: 0, note: 'Every lookup is by short code: one key, one shard. A perfect fit for key/value sharding.' }],
        },
        incidents: [
          { kind: 'trafficSpike', atTick: at(14), durationTicks: 12, multiplier: 3, scope: 'all', label: 'A link goes viral (3× traffic)' },
          { kind: 'cacheNodeDown', atTick: at(19, 30), label: 'A cache node restarts empty' },
          { kind: 'dbPrimaryDown', atTick: at(21), label: 'Database primary failure' },
        ],
        slos: { p99Ms: 150, successRate: 0.998, budget: 12_500, maxDataLoss: 'seconds', maxQueueDelayMin: null },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'shards'],
      initialBuild: FIRST_SKETCH,
      lab: 'url-shortener',
      hint: 'Redirects are the same few answers asked over and over. Stateless servers behind a balancer, a cache in front of the store, and nothing that exists only once.',
      cardIds: ['clarify-requirements', 'back-of-envelope', 'url-shortener-design'],
      quiz: [
        {
          question: 'Two users shorten the same long URL. What is the cleanest behaviour?',
          options: ['Crash', 'It depends on requirements — e.g. per-user links for analytics vs. one shared code', 'Always delete the older one', 'Use the long URL as the short code'],
          answerIndex: 1,
          explanation: '“What if someone else shortened it earlier?” is exactly the kind of question to raise while defining the POST API.',
        },
        {
          question: 'Why does a URL shortener map so well to a NoSQL key/value store?',
          options: ['It needs complex joins', 'Every operation is a single-key lookup, which shards trivially', 'It needs multi-row transactions', 'It stores video'],
          answerIndex: 1,
          explanation: 'short code → long URL. No joins, no cross-key transactions, a simple schema: the sweet spot for horizontally partitioned stores.',
        },
      ],
    },
    debrief: [
      'Kane’s reference design: geo-routed load balancer → horizontally scaled stateless web servers → memcached layer → NoSQL store with a URLs table (ID, short URL, long URL, user ID).',
      'Redirect with HTTP 301 (permanent, browsers cache it, less load) or 302 (temporary, every click reaches you — needed for click analytics).',
      'Generating codes: base-36/62 of a unique counter avoids collisions; hashing the URL needs collision handling.',
      'What made the interview go well: repeating the question, clarifying requirements, working backwards from the customer experience, starting from the API, and not getting defensive.',
    ],
    sources: [
      { label: 'Frank Kane — Mastering the System Design Interview, slides 95–101', url: 'https://www.udemy.com/course/system-design-interview-prep/' },
      { label: 'ByteByteGo — System Design 101', url: 'https://github.com/ByteByteGoHq/system-design-101' },
    ],
  },
  {
    id: 'youtube',
    title: 'Design YouTube',
    tagline: 'Upload, transcode and play video for the whole planet.',
    prompt: '“Design a video sharing service.”',
    requirementsIntro: 'YouTube has a lot of features. You will not design all of it in 45 minutes — narrow it down.',
    requirements: [
      { text: 'YouTube has recommendations, channels, ads… which features should I focus on?', good: true, why: 'The key move. The answer: uploading videos and playing them back — at massive scale.' },
      { text: 'Are we talking billions of users and videos, watching from all around the world?', good: true, why: 'Yes. That means every trick in the book for horizontal scaling, and content close to users.' },
      { text: 'Must playback work on any device and connection speed?', good: true, why: 'This implies transcoding every upload into several resolutions and adaptive bitrate streaming.' },
      { text: 'How quickly must an uploaded video become watchable?', good: true, why: 'Minutes are fine → transcoding can be asynchronous, behind a queue.' },
      { text: 'First, let me design the recommendation algorithm in detail.', good: false, why: 'Out of scope until the interviewer says otherwise. Do not burn your time budget.' },
      { text: 'Video bytes should be stored in the relational database for consistency.', good: false, why: 'Blobs belong in distributed object storage; the database keeps metadata only.' },
      { text: 'Every video must be served from our own app servers so we control quality.', good: false, why: 'App servers return the video URL and metadata. The bytes come from a CDN.' },
    ],
    estimation: [
      {
        question: '90 uploads per second, 10 minutes each, ~50 MB per minute raw. Raw video ingested per day?',
        options: ['~4 GB', '~4 TB', '~4 PB', '~4 EB'],
        answerIndex: 2,
        explanation: '90 × 86,400 ≈ 7.8M uploads/day × 500 MB ≈ 3.9 PB/day. Storage tiers and codec efficiency matter enormously.',
      },
      {
        question: 'Each upload is transcoded into 5 renditions, and transcoding one rendition of a 10-minute video takes ~2 CPU-minutes. CPU cores busy at 90 uploads/s?',
        options: ['~90', '~900', '~54,000', '~5 million'],
        answerIndex: 2,
        explanation: '90 uploads/s × 5 renditions × 120 CPU-seconds = 54,000 cores busy continuously. Definitely not something to do inside the upload request.',
      },
      {
        question: '100,000 concurrent video segment requests/s at ~1.5 MB each. Egress bandwidth?',
        options: ['~1.2 Gbit/s', '~12 Gbit/s', '~1.2 Tbit/s', '~120 Tbit/s'],
        answerIndex: 2,
        explanation: '100,000 × 1.5 MB = 150 GB/s = 1,200 Gbit/s = 1.2 Tbit/s. No origin data center serves that — this is why CDNs exist.',
      },
      {
        question: 'Views vs uploads: which ratio is closest for a video platform?',
        options: ['1 : 1', '10 : 1', 'Hundreds or more : 1', '1 : 100'],
        answerIndex: 2,
        explanation: 'Massively read-heavy. Design the playback path first; uploads can be slower and asynchronous.',
      },
    ],
    level: {
      id: 'case-youtube',
      title: 'YouTube — build it',
      tagline: '300,000 req/s, 70% of them video segments.',
      story: [
        'Scope agreed: upload and playback at massive scale. 70% of requests are 1.5 MB video segments. 5% of writes are uploads, and each upload needs heavy transcoding.',
        'Your first sketch has one server doing everything. Tonight: a video goes viral, creators flood you with uploads after a big event, and a metadata primary dies.',
      ],
      scenario: {
        workload: {
          dau: 300_000_000, peakRps: 300_000, readRatio: 0.98, staticShare: 0.7, staticKb: 1500, cacheableShare: 0.9,
          jobShare: 0.05, jobCost: 20_000, geo: [1, 0, 0], dataGb: 20_000_000,
          shardKeys: [{ id: 'id', label: 'hash(video_id)', hotShardShare: 0, readFanout: 0, note: 'Metadata lookups are by video ID — a simple key that spreads evenly.' }],
        },
        incidents: [
          { kind: 'trafficSpike', atTick: at(15), durationTicks: 12, multiplier: 4, scope: 'static', label: 'A video goes viral (4× video traffic)' },
          { kind: 'trafficSpike', atTick: at(17), durationTicks: 12, multiplier: 3, scope: 'jobs', label: 'Upload surge after a big event (3× transcoding)' },
          { kind: 'dbPrimaryDown', atTick: at(20), label: 'Video metadata primary failure' },
        ],
        slos: { p99Ms: 200, successRate: 0.999, budget: 24_000_000, maxDataLoss: 'seconds', maxQueueDelayMin: 60 },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'objectStorage', 'shards', 'queue'],
      initialBuild: FIRST_SKETCH,
      lab: 'upload-pipeline',
      hint: 'Two separate paths. Playback: web servers return a URL, a CDN serves the bytes. Upload: raw video → queue → transcoding fleet → object storage.',
      cardIds: ['working-backwards', 'transcoding-pipeline', 'adaptive-bitrate'],
      quiz: [
        {
          question: 'Why is a message queue placed between upload and the transcoding fleet?',
          options: [
            'Queues compress video',
            'Transcoding is slow and bursty; the queue decouples uploads from it so a surge becomes backlog, not failure',
            'So videos play in order',
            'To avoid needing object storage',
          ],
          answerIndex: 1,
          explanation: 'Upload returns as soon as the raw file is stored. Workers drain the queue at their own pace and mark the video ready when done.',
        },
        {
          question: 'CDN delivery is the biggest cost. How can a video platform cut it without hurting most viewers?',
          options: [
            'Serve everything from origin',
            'Put only popular videos on the CDN; serve the long tail from cheaper origin storage (predict “where to host”)',
            'Delete old videos',
            'Disable adaptive bitrate',
          ],
          answerIndex: 1,
          explanation: 'Kane’s design adds a “where-to-host” model: most views go to a small share of videos. Proposing technical solutions to business problems scores points.',
        },
        {
          question: 'What does adaptive bitrate streaming (DASH/HLS) do?',
          options: [
            'Uploads faster',
            'The player picks, segment by segment, the rendition that fits the current bandwidth',
            'Encrypts the video',
            'Shards the metadata',
          ],
          answerIndex: 1,
          explanation: 'Each video exists in several resolutions cut into short segments. The player switches quality on the fly — which is why every upload is transcoded many times.',
        },
      ],
    },
    debrief: [
      'Playback path (Kane): clients → web servers return video URL + metadata from a NoSQL store (e.g. Bigtable) → client fetches transcoded video from a CDN backed by distributed object storage.',
      'Upload path: raw video + metadata stored → message queue → transcoding fleet → transcoded video in object storage → “transcoding complete” updates metadata → a model decides whether to push it to the CDN.',
      'Real YouTube scaled MySQL with Vitess, a sharding layer it open-sourced in 2012 — the application does not need to know about shards.',
      'The test: could you take a question as open-ended as “design YouTube” and break it into manageable pieces? Start with questions about what to focus on.',
    ],
    sources: [
      { label: 'Frank Kane — Mastering the System Design Interview, slides 132–139', url: 'https://www.udemy.com/course/system-design-interview-prep/' },
      { label: 'System Design Case Study: YouTube (dev.to)', url: 'https://dev.to/mseada/system-design-case-study-youtube-54f3' },
      { label: 'YouTube System Architecture (Women Who Code)', url: 'https://womenwhocode.com/blog/youtube-system-architecture' },
      { label: 'Vitess — MySQL sharding from YouTube', url: 'https://vitess.io/' },
    ],
  },
  {
    id: 'netflix',
    title: 'Design Netflix',
    tagline: 'A new season drops tonight. In every country at once.',
    prompt: '“Design a video streaming service like Netflix.”',
    requirementsIntro: 'It sounds like YouTube — but the differences are the whole point. Find them.',
    requirements: [
      { text: 'Who uploads content — users, or only the studio?', good: true, why: 'Only the studio. No upload firehose: the catalog is small and known in advance, so content can be pre-positioned near viewers.' },
      { text: 'Where are our viewers? Is this global?', good: true, why: 'Global. Latency and bandwidth economics push video to the edge and the control plane into several regions.' },
      { text: 'How much downtime can we tolerate during a regional outage?', good: true, why: 'Essentially none: paying subscribers on a Friday night. That means active multi-region.' },
      { text: 'What happens at a big release — how spiky is traffic?', good: true, why: 'Very. Capacity and caches must be ready before the season drops.' },
      { text: 'We must support users uploading and transcoding videos in real time.', good: false, why: 'Not a requirement here. Encoding is an offline studio pipeline.' },
      { text: 'Billing must be designed first, in detail.', good: false, why: 'Important to the business, but not what a streaming design question is about. Confirm scope and move on.' },
      { text: 'Renting a commercial CDN is always the cheapest option at any scale.', good: false, why: 'At Netflix volume the per-GB bill is enormous. Netflix built its own CDN, Open Connect, inside ISPs.' },
    ],
    estimation: [
      {
        question: '320,000 video segment requests/s at 2.5 MB each. Egress?',
        options: ['~6.4 Gbit/s', '~64 Gbit/s', '~640 Gbit/s', '~6.4 Tbit/s'],
        answerIndex: 3,
        explanation: '320,000 × 2.5 MB = 800 GB/s = 6,400 Gbit/s = 6.4 Tbit/s. A meaningful slice of all internet traffic.',
      },
      {
        question: '1 billion GB of video egress per month. Commercial CDN at $0.03/GB vs. own appliances at $0.004/GB plus $60k/month fixed. Monthly saving from owning?',
        options: ['~$26,000', '~$260,000', '~$26 million', '~$2.6 billion'],
        answerIndex: 2,
        explanation: '$30M vs $4M + $0.06M. Fixed cost is irrelevant at this volume — but at 1 million GB/month, renting ($30k) beats owning ($64k).',
      },
      {
        question: 'Three regions must survive losing any one. If peak control-plane load is 120,000 req/s, capacity needed per region?',
        options: ['40,000 req/s', '60,000 req/s', '120,000 req/s', '180,000 req/s'],
        answerIndex: 1,
        explanation: 'Two survivors carry everything: 120,000 / 2 = 60,000 each. Total provisioned = 150% of peak.',
      },
    ],
    level: {
      id: 'case-netflix',
      title: 'Netflix — build it',
      tagline: '400,000 req/s, 80% video, three continents.',
      story: [
        'Scope agreed: studio content only, global audience (45% Americas, 35% Europe, 20% Asia), no tolerance for regional outages. 80% of requests are 2.5 MB video segments.',
        'Tonight a new season drops at 20:00 and traffic doubles. Earlier, at 10:00, the chaos team will switch off an entire region on purpose — in production.',
      ],
      scenario: {
        workload: {
          dau: 250_000_000, peakRps: 400_000, readRatio: 0.97, staticShare: 0.8, staticKb: 2500, cacheableShare: 0.9,
          jobShare: 0, jobCost: 0, geo: [0.45, 0.35, 0.2], dataGb: 5_000_000,
          shardKeys: [{ id: 'id', label: 'hash(user_id)', hotShardShare: 0, readFanout: 0, note: 'Viewing history and profiles are per user; no single user is “hot”.' }],
        },
        incidents: [
          { kind: 'regionDown', atTick: at(10), durationTicks: 3, label: 'Chaos drill: a whole region is switched off' },
          { kind: 'trafficSpike', atTick: at(20), durationTicks: 12, multiplier: 2, scope: 'all', label: 'New season drops (2× traffic)' },
          { kind: 'cacheNodeDown', atTick: at(20, 30), label: 'A cache node restarts empty' },
        ],
        slos: { p99Ms: 140, successRate: 0.999, budget: 8_000_000, maxDataLoss: 'seconds', maxQueueDelayMin: null },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'cdn', 'ownCdn', 'objectStorage', 'shards', 'regions'],
      initialBuild: FIRST_SKETCH,
      lab: 'egress-cost',
      hint: 'Everything before “play” is a multi-region, heavily cached control plane. Everything after “play” is bytes — and at this volume, look hard at what each CDN option costs.',
      cardIds: ['own-cdn', 'chaos-engineering', 'defend-your-design'],
      quiz: [
        {
          question: 'How does Netflix split its architecture?',
          options: [
            'Everything runs on Open Connect',
            'Control plane (browse, search, play decisions) in AWS; video bytes from its own CDN, Open Connect, inside ISPs',
            'Video from AWS, metadata from ISPs',
            'A single global data center',
          ],
          answerIndex: 1,
          explanation: 'Anything that is not serving video is handled in AWS. Everything after you hit play is served by Open Connect appliances close to the viewer.',
        },
        {
          question: 'Why can Netflix pre-position content at the edge more aggressively than YouTube?',
          options: [
            'Its videos are shorter',
            'A small studio-controlled catalog with predictable demand, versus a vast long tail of user uploads',
            'It has fewer users',
            'It does not use adaptive bitrate',
          ],
          answerIndex: 1,
          explanation: 'Netflix knows what will be popular tomorrow and fills appliances overnight. YouTube must decide per video whether the edge is worth it.',
        },
        {
          question: 'What is the point of deliberately killing servers or whole regions in production (Chaos Monkey / Chaos Kong)?',
          options: [
            'Saving money',
            'Proving continuously that failover actually works, so real outages are non-events',
            'Punishing on-call engineers',
            'Testing the CDN',
          ],
          answerIndex: 1,
          explanation: 'Redundancy you never exercise is a hope, not a plan. If you can lose a region on a Tuesday morning by choice, you can lose one on Friday night by accident.',
        },
      ],
    },
    debrief: [
      'Client → Zuul edge gateway (auth, routing) → hundreds of stateless microservices in AWS across multiple regions.',
      'EVCache (memcached-based) sits in front of Cassandra, Netflix’s default durable store — masterless, tuned for availability over strict consistency (the AP side of CAP).',
      'Video: studio masters are encoded offline into many bitrates (per-title / per-shot encoding) and pushed overnight to Open Connect Appliances inside ISPs and internet exchanges.',
      'On “play”, the control plane picks healthy nearby appliances; the player streams adaptive-bitrate segments directly from them.',
      'Remember: this is not the only solution. The interviewer cares about your thought process and trade-offs, not about reproducing the real architecture.',
    ],
    sources: [
      { label: 'ByteByteGo — Netflix case study', url: 'https://www.mintlify.com/ByteByteGoHq/system-design-101/case-studies/netflix' },
      { label: 'Netflix System Design — Backend Architecture (dev.to)', url: 'https://dev.to/gbengelebs/netflix-system-design-backend-architecture-10i3' },
      { label: 'Netflix Open Connect', url: 'https://openconnect.netflix.com/' },
      { label: 'Frank Kane — Mastering the System Design Interview (resiliency, CDNs, CAP)', url: 'https://www.udemy.com/course/system-design-interview-prep/' },
    ],
  },
];
