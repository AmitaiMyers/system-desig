// The remaining mock interviews from Frank Kane's deck: restaurant reservations, web crawler,
// top-sellers and search engine. Same flow as the other case studies.

import { at, FIRST_SKETCH } from './campaign';
import type { CaseStudy } from './types';

const KANE_COURSE_URL = 'https://www.udemy.com/course/system-design-interview-prep/';

export const DECK_CASES: CaseStudy[] = [
  {
    id: 'restaurant',
    title: 'Design a Restaurant Reservation System',
    tagline: 'OpenTable-style bookings: nobody may get the same table twice.',
    prompt: '“Design a restaurant reservation system.”',
    requirementsIntro: 'Start from the customer experience. Which questions define what you are building — and which are traps?',
    requirements: [
      { text: 'Is this for one restaurant, or any number of restaurants like OpenTable?', good: true, why: 'It decides the scale: thousands of restaurants and hundreds of thousands of diners need a horizontally scaled design.' },
      { text: 'What does a diner need? Pick a restaurant, party size, see available times, lock one in, get a confirmation, change or cancel.', good: true, why: 'Working backwards from the user experience gives you the operations the system must support.' },
      { text: 'The restaurant is a customer too — what do they need?', good: true, why: 'Table layout, how many tables to hold for walk-ins, reservation length, reporting, a way to contact guests.' },
      { text: 'Should we optimize for performance and reliability over cost?', good: true, why: 'Yes: diners expect it to be fast and a lost or double booking ruins an evening. That justifies redundancy.' },
      { text: 'Bookings can be eventually consistent — a short double booking is fine.', good: false, why: 'Two parties for one table is the one thing this system must never do. Booking a slot needs a consistent write.' },
      { text: 'We should send the confirmation SMS before answering the booking request.', good: false, why: 'The diner needs “you are booked”, not “the SMS has left”. Notifications belong on a queue.' },
      { text: 'Let’s begin with the recommendation engine for restaurants.', good: false, why: 'Out of scope. Clarify the core flow first.' },
    ],
    estimation: [
      {
        question: '200,000 diners a day make ~40 requests each while browsing. Average requests per second?',
        options: ['~9', '~90', '~900', '~9,000'],
        answerIndex: 1,
        explanation: '200,000 × 40 = 8 million requests ÷ 86,400 s ≈ 93/s. Peaks around dinner time and special days are many times higher.',
      },
      {
        question: '5,000 restaurants, 30 tables each, 5 bookable slots per evening. How many slots exist per day?',
        options: ['~7,500', '~75,000', '~750,000', '~75 million'],
        answerIndex: 2,
        explanation: '5,000 × 30 × 5 = 750,000 slots a day. Small data — the hard part is correctness, not volume.',
      },
      {
        question: 'Roughly what read-to-write ratio should you expect?',
        options: ['1 : 10 — mostly writes', '1 : 1', '10 : 1 or more — people look at many times before booking one', 'Reads never happen'],
        answerIndex: 2,
        explanation: 'Diners check many restaurants and times before committing. Browsing can be cached; the booking itself cannot.',
      },
    ],
    level: {
      id: 'case-restaurant',
      title: 'Reservations — build it',
      tagline: '3,000 req/s, and not one booking may be lost.',
      story: [
        'Scope agreed: any number of restaurants, fast and reliable over cheap. 90% of requests browse availability; 10% create or change a booking, and half of those send an SMS.',
        'Your first sketch is one web server and one database. Tonight is Valentine’s Day: traffic quadruples at 18:00, and at 19:30 the database primary fails. A lost booking tonight is a lost customer.',
      ],
      scenario: {
        workload: {
          dau: 200_000, peakRps: 3000, readRatio: 0.9, staticShare: 0.2, staticKb: 0, cacheableShare: 0.5,
          jobShare: 0.5, jobCost: 10, geo: [1, 0, 0], dataGb: 0, shardKeys: [],
        },
        incidents: [
          { kind: 'trafficSpike', atTick: at(18), durationTicks: 12, multiplier: 4, scope: 'all', label: 'Valentine’s Day rush (4× traffic)' },
          { kind: 'dbPrimaryDown', atTick: at(19, 30), label: 'Database primary failure mid-service' },
        ],
        slos: { p99Ms: 200, successRate: 0.999, budget: 6400, maxDataLoss: 'zero', maxQueueDelayMin: 10 },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'queue'],
      initialBuild: FIRST_SKETCH,
      lab: 'reservation',
      hint: 'Read the data-loss target again: “a few seconds” is not allowed here. And the SMS does not have to be sent before the diner sees “booked”.',
      cardIds: ['reservation-design', 'failover', 'message-queue'],
      quiz: [
        {
          question: 'Two diners tap the last 19:00 table at the same moment. What must the system guarantee?',
          options: ['Both get it; staff will sort it out', 'Exactly one booking succeeds — the write is atomic and consistent', 'Neither gets it', 'The cache decides'],
          answerIndex: 1,
          explanation: 'This is what transactions (ACID) are for. Availability can be cached and slightly stale; the booking write cannot.',
        },
        {
          question: 'Why was a read replica not enough to protect the bookings?',
          options: ['Replicas are slow', 'An asynchronous replica can be seconds behind, so the latest bookings die with the primary', 'Replicas cannot be promoted', 'Replicas cost more than a hot standby'],
          answerIndex: 1,
          explanation: 'Zero data loss needs every write on two nodes before it is confirmed: a hot standby (synchronous replication).',
        },
        {
          question: 'Kane’s sketch keeps three kinds of records. Which?',
          options: ['Users, posts, likes', 'Reservations, restaurants, customers', 'URLs, clicks, owners', 'Videos, segments, renditions'],
          answerIndex: 1,
          explanation: 'Reservation (customer, restaurant, time slot, party size, notes), Restaurant (table layout, walk-in holdback, hours…) and Customer (contact details, preferences).',
        },
      ],
    },
    debrief: [
      'Kane’s reference design: geo-routed load balancer → stateless web servers → memcached → a distributed store with Customers, Restaurants and Reservations, plus a separate fleet sending SMS notifications.',
      'Think about the data while you think about the experience: sketching the records early shows what must be looked up together and what must be consistent.',
      'The restaurant’s settings — table layout, walk-in holdback, reservation length — are what turn “a table” into bookable time slots.',
      'Debrief from the deck: clarified scale, worked backwards from the customer, thought through the data, proposed a horizontally scaled fleet, and improved the design with caching when challenged.',
    ],
    sources: [{ label: 'Frank Kane — Mastering the System Design Interview, slides 102–111', url: KANE_COURSE_URL }],
  },
  {
    id: 'crawler',
    title: 'Design a Web Crawler',
    tagline: 'Billions of pages, re-crawled forever. No customers — only scale.',
    prompt: '“Design a web crawler.”',
    requirementsIntro: 'There is no user experience to work backwards from here, so the questions are about scope and purpose.',
    requirements: [
      { text: 'The entire web, or just a few sites?', good: true, why: 'The entire web: billions of pages. That one answer rules out any single-machine design.' },
      { text: 'How often are pages re-crawled, and must we detect updates?', good: true, why: 'Freshness sets the throughput you need, and detecting unchanged pages (content hashes) saves most of the work.' },
      { text: 'Do we store a copy of every page? Images too?', good: true, why: 'It decides the storage: petabytes of pages in distributed storage versus just extracted links.' },
      { text: 'What is the main purpose of this crawler?', good: true, why: 'A search index, an archive and a price monitor need different things. (Kane: “I should have asked that first.”)' },
      { text: 'A single powerful server with a recursive function will do.', good: false, why: 'Depth-first recursion on one machine cannot crawl billions of pages. You need a distributed queue of URLs.' },
      { text: 'We must never lose a single fetched page under any circumstances.', good: false, why: 'A lost page can simply be crawled again. Paying for zero data loss here is over-engineering.' },
      { text: 'We can hit each website as fast as our network allows.', good: false, why: 'Crawlers must be polite: rate-limit per site, or you take sites down and get blocked.' },
    ],
    estimation: [
      {
        question: '10 billion pages, each re-crawled about every two weeks. Pages per second?',
        options: ['~80', '~800', '~8,000', '~80,000'],
        answerIndex: 2,
        explanation: '10 billion ÷ (14 days × 86,400 s) ≈ 10¹⁰ ÷ 1.2 million ≈ 8,300 pages/s, around the clock.',
      },
      {
        question: 'Average page is 100 KB. Storage for one full copy of 10 billion pages?',
        options: ['~1 TB', '~1 PB', '~1 EB', '~10 GB'],
        answerIndex: 1,
        explanation: '10¹⁰ × 100 KB = 10¹⁵ bytes = 1 petabyte. This is distributed object storage territory.',
      },
      {
        question: 'Which traversal order suits a crawler driven by a queue of URLs?',
        options: ['Depth-first search', 'Breadth-first search', 'Binary search', 'Random walk'],
        answerIndex: 1,
        explanation: 'A queue gives breadth-first search: new links join the back of the queue. Depth-first can disappear into one site forever.',
      },
    ],
    level: {
      id: 'case-crawler',
      title: 'Web Crawler — build it',
      tagline: '20,000 URL operations per second, every one of them a job.',
      story: [
        'Here the “users” are your own schedulers. Half the operations check whether a URL or page was seen before; the other half record a URL to fetch, and every one of those becomes a download job.',
        'Pages can always be crawled again, so losing some data is acceptable. Today: breaking news triggers a mass re-crawl, the crawler walks into a site with fifty million pages, and a database primary dies.',
      ],
      scenario: {
        workload: {
          dau: 0, peakRps: 20_000, readRatio: 0.5, staticShare: 0, staticKb: 0, cacheableShare: 0.3,
          jobShare: 1, jobCost: 20, geo: [1, 0, 0], dataGb: 0,
          shardKeys: [
            { id: 'domain', label: 'hash(domain)', hotShardShare: 0.4, readFanout: 0, note: 'All of a site’s URLs live on one shard, so rate-limiting a site (“politeness”) is local. But one enormous site overloads its shard.' },
            { id: 'id', label: 'hash(URL)', hotShardShare: 0, readFanout: 0.3, note: 'URLs spread evenly, so no site can overload a shard. But per-site questions (“how fast are we hitting this site?”) must ask every shard.' },
          ],
        },
        incidents: [
          { kind: 'trafficSpike', atTick: at(9), durationTicks: 12, multiplier: 3, scope: 'jobs', label: 'Breaking news: mass re-crawl (3× download jobs)' },
          { kind: 'hotKey', atTick: at(14), durationTicks: 24, label: 'The crawler hits a site with 50 million pages' },
          { kind: 'dbPrimaryDown', atTick: at(16), label: 'A URL-store primary fails' },
        ],
        slos: { p99Ms: 300, successRate: 0.99, budget: 30_000, maxDataLoss: 'hours', maxQueueDelayMin: 60 },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'shards', 'queue'],
      initialBuild: FIRST_SKETCH,
      lab: 'crawler',
      hint: 'The URL queue is the heart of a crawler, and one primary cannot take 10,000 writes a second. Also: check what the data-loss target allows before paying for replicas everywhere.',
      cardIds: ['crawler-design', 'sharding', 'backpressure'],
      quiz: [
        {
          question: 'Why does Kane’s design hash the page downloaders by domain?',
          options: ['Domains are short strings', 'So one downloader owns each site and can rate-limit it politely', 'To make pages smaller', 'Because DNS requires it'],
          answerIndex: 1,
          explanation: 'If any worker could fetch any URL, nobody would know how hard a given site is being hit. Grouping by domain makes politeness local.',
        },
        {
          question: 'What are “content hashes” for?',
          options: ['Encrypting pages', 'Detecting pages we already have, even under a different URL, so we skip re-processing them', 'Sorting the queue', 'Compressing images'],
          answerIndex: 1,
          explanation: 'Hash each downloaded page and compare with stored hashes: duplicates and unchanged pages are dropped early.',
        },
        {
          question: 'The level accepted losing hours of data. Why was that the right requirement?',
          options: ['Data never matters', 'A lost page can be crawled again, so strong durability would be money spent on nothing', 'Crawlers have no database', 'Backups are impossible at this scale'],
          answerIndex: 1,
          explanation: 'Match durability to what losing the data actually costs. Cold backups are enough when the source of truth is the web itself.',
        },
      ],
    },
    debrief: [
      'Kane’s pipeline: initial URLs → queue of URLs to crawl → page downloaders (hashed by domain) → distributed storage for pages, with content hashes to skip duplicates.',
      'Downloaded pages go through URL extraction and normalization, then a URL filter / stop-list, then “URLs processed” — and the new URLs loop back into the queue.',
      'This is not a customer-facing system, so the design works backwards from its requirements instead of from a user experience.',
      'Failure modes worth naming: crawler traps (infinite generated URLs), duplicate content, impolite crawl rates, and dynamic client-rendered pages.',
    ],
    sources: [{ label: 'Frank Kane — Mastering the System Design Interview, slides 112–121', url: KANE_COURSE_URL }],
  },
  {
    id: 'top-sellers',
    title: 'Design a Top-Sellers Feature',
    tagline: 'A bestseller list for every category — the questions are the test.',
    prompt: '“Design a top-sellers feature for an e-commerce website.”',
    requirementsIntro: 'Kane used this question at Amazon to see whether candidates could think like a customer before designing anything. Pick the questions worth asking.',
    requirements: [
      { text: 'Top sellers across the whole site, or broken down by category?', good: true, why: 'By category — which multiplies the number of lists to compute and store.' },
      { text: 'How up-to-date do the results need to be?', good: true, why: 'If hourly is fine, a batch job is enough. Real-time would need a streaming system.' },
      { text: 'Over what period are we computing top sellers?', good: true, why: 'This leads to the key idea: count all sales but weight recent ones more (time decay).' },
      { text: 'What scale are we looking at — purchases and page views?', good: true, why: 'Millions of purchases a day fit a batch job over a data lake; the lists are read far more often than they change.' },
      { text: 'Each page view should query the purchases table and sort the results.', good: false, why: 'Recomputing a ranking on every page view cannot scale. Precompute the lists and serve them from a cache.' },
      { text: 'Top sellers must be exact to the second.', good: false, why: 'Customers cannot tell an hour-old ranking from a live one. Paying for real-time here is waste.' },
      { text: 'We should rank purely by all-time sales.', good: false, why: 'Then the list never changes and new products never appear. Older purchases should count less.' },
    ],
    estimation: [
      {
        question: '20 million purchases a day. Purchases per second on average?',
        options: ['~23', '~230', '~2,300', '~23,000'],
        answerIndex: 1,
        explanation: '20,000,000 ÷ 86,400 ≈ 230/s. Tiny compared with the page views that read the lists.',
      },
      {
        question: '10,000 categories, top 100 items each, ~200 bytes per entry. Size of all the lists?',
        options: ['~200 KB', '~200 MB', '~200 GB', '~200 TB'],
        answerIndex: 1,
        explanation: '10,000 × 100 × 200 B = 200 MB. The whole result fits in memory on one cache node — the challenge is computing it.',
      },
      {
        question: 'With exponential decay e^(−λt) and a half-life of 7 days, how much does a purchase from 14 days ago count?',
        options: ['Full weight', 'Half', 'A quarter', 'Nothing'],
        answerIndex: 2,
        explanation: 'Each half-life halves the weight: 7 days → ½, 14 days → ¼. Old sales fade smoothly instead of falling off a cliff.',
      },
    ],
    level: {
      id: 'case-top-sellers',
      title: 'Top-Sellers — build it',
      tagline: '50,000 page views a second reading lists that change once an hour.',
      story: [
        'Scope agreed: per-category lists, refreshed within the hour, recent sales weighted more. 97% of requests read a list; purchases feed a job that recomputes the rankings.',
        'Your first sketch sorts purchases on every page view. On Black Friday traffic quintuples from 09:00 — and at 10:00 a cache node restarts empty in the middle of it.',
      ],
      scenario: {
        workload: {
          dau: 50_000_000, peakRps: 50_000, readRatio: 0.97, staticShare: 0, staticKb: 0, cacheableShare: 0.98,
          jobShare: 1, jobCost: 4, geo: [1, 0, 0], dataGb: 0, shardKeys: [],
        },
        incidents: [
          { kind: 'trafficSpike', atTick: at(9), durationTicks: 24, multiplier: 5, scope: 'all', label: 'Black Friday (5× traffic)' },
          { kind: 'cacheNodeDown', atTick: at(10), label: 'A cache node restarts empty during the rush' },
        ],
        slos: { p99Ms: 200, successRate: 0.999, budget: 27_000, maxDataLoss: 'seconds', maxQueueDelayMin: 60 },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'queue'],
      initialBuild: FIRST_SKETCH,
      lab: 'decay',
      hint: 'Almost every read can come from memory — as long as the cache stays warm. What happens to the database when one of your cache nodes is suddenly empty during the rush?',
      cardIds: ['top-sellers-design', 'cache-cold-start', 'caching'],
      quiz: [
        {
          question: 'Why precompute the top-seller lists with a batch job instead of computing them per request?',
          options: ['Batch jobs are more accurate', 'The lists change slowly but are read constantly — compute once, serve from cache many times', 'Databases cannot sort', 'To avoid using a cache'],
          answerIndex: 1,
          explanation: 'Kane’s design: purchases → top-seller job (e.g. Apache Spark) → top-sellers store → distributed cache → web servers.',
        },
        {
          question: 'What does time decay solve?',
          options: ['Slow queries', 'Choosing a period: all sales count, but older ones count less, so the list stays fresh without a hard cut-off', 'Cache misses', 'Shard hotspots'],
          answerIndex: 1,
          explanation: 'Weight each purchase by e^(−λt). A hard “last 7 days” window drops items abruptly; decay fades them.',
        },
        {
          question: 'Apache Spark is the right tool for which part?',
          options: ['Serving page views (OLTP)', 'The periodic aggregation over all purchases', 'Sending emails', 'Load balancing'],
          answerIndex: 1,
          explanation: 'Spark is a distributed batch/analytics engine. It is NOT meant for serving individual user requests.',
        },
      ],
    },
    debrief: [
      'Kane’s design: purchases (item ID, category, date) → a periodic top-seller job, e.g. Apache Spark → a small top-sellers store → distributed cache → web servers.',
      'Asking the right questions was half the interview; the design itself is relatively simple once the requirements are clear.',
      'A good toolchest helps: an S3 data lake for purchases, Spark for the aggregation, a key/value store such as DynamoDB for the results.',
      'You face the cold-start problem for caches again: a freshly started cache must be warmed before it takes the full load.',
    ],
    sources: [{ label: 'Frank Kane — Mastering the System Design Interview, slides 122–131', url: KANE_COURSE_URL }],
  },
  {
    id: 'search',
    title: 'Design a Search Engine',
    tagline: 'Keyword in, ten ranked pages out — over the whole web.',
    prompt: '“Design a search engine.”',
    requirementsIntro: 'Nobody rebuilds Google in twenty minutes. Narrow the problem.',
    requirements: [
      { text: 'A search engine for the entire web, or an intranet tool?', good: true, why: 'The entire web. Scale again decides the architecture.' },
      { text: 'Can I assume a crawler already gives us a distributed store of page content?', good: true, why: 'Yes — reuse what exists. That removes half the problem.' },
      { text: 'Can we focus on generating reasonable results at massive scale?', good: true, why: 'This limits the scope to indexing and ranking, and leaves out ads, spelling, personalization…' },
      { text: 'How fresh must results be after a page changes?', good: true, why: 'It sets how fast the indexing pipeline must keep up with the crawler.' },
      { text: 'At query time we scan the stored pages for the keywords.', good: false, why: 'Scanning billions of documents per query is impossible. You need an inverted index: keyword → documents.' },
      { text: 'I will explain exactly how Google ranks pages today.', good: false, why: 'Nobody outside knows, and pretending does not end well. Be honest about what you know.' },
      { text: 'Ranking only needs how often the keyword appears in the page.', good: false, why: 'That is trivially gamed. Backlinks (PageRank), position, titles and formatting are all signals.' },
    ],
    estimation: [
      {
        question: '5 billion searches a day. Queries per second on average?',
        options: ['~580', '~5,800', '~58,000', '~580,000'],
        answerIndex: 2,
        explanation: '5 × 10⁹ ÷ 86,400 ≈ 58,000 queries/s on average, more at peak.',
      },
      {
        question: 'An inverted index maps…',
        options: ['Documents to their keywords', 'Keywords to the documents (and positions) containing them', 'URLs to IP addresses', 'Users to queries'],
        answerIndex: 1,
        explanation: 'The forward index is document → keywords. Inverting it gives keyword → sorted list of documents, which is what a query needs.',
      },
      {
        question: 'The index is split across 100 shards by document. How many shards must one query ask?',
        options: ['1', '10', 'All 100', 'None'],
        answerIndex: 2,
        explanation: 'Any shard may hold matching documents, so the query fans out to all of them and merges the results. Every shard needs capacity for the full query rate.',
      },
    ],
    level: {
      id: 'case-search',
      title: 'Search Engine — build it',
      tagline: '60,000 req/s: queries fan out, index updates pour in.',
      story: [
        'Scope agreed: results over the whole web, fed by an existing crawler. Three quarters of requests are queries; the rest are index updates, and each update needs tokenizing and scoring before it is searchable.',
        'Today: a cache node restarts, an index primary dies, and at 20:00 breaking news makes everyone search for the same word. The index can be rebuilt from the page store, so losing recent updates is tolerable.',
      ],
      scenario: {
        workload: {
          dau: 500_000_000, peakRps: 60_000, readRatio: 0.75, staticShare: 0, staticKb: 0, cacheableShare: 0.4,
          jobShare: 1, jobCost: 5, geo: [1, 0, 0], dataGb: 0,
          shardKeys: [
            { id: 'id', label: 'by document', hotShardShare: 0, readFanout: 1, note: 'Each shard indexes a slice of the documents. Load is perfectly even — but every query must ask every shard, so each shard needs replicas for the full query rate.' },
            { id: 'term', label: 'by keyword', hotShardShare: 0.35, readFanout: 0.1, note: 'Each shard owns some keywords, so most queries touch one or two shards. But a suddenly popular keyword makes its shard hot.' },
          ],
        },
        incidents: [
          { kind: 'cacheNodeDown', atTick: at(13), label: 'A query-cache node restarts empty' },
          { kind: 'dbPrimaryDown', atTick: at(16), label: 'An index primary fails' },
          { kind: 'hotKey', atTick: at(20), durationTicks: 24, label: 'Breaking news: everyone searches the same word' },
        ],
        slos: { p99Ms: 200, successRate: 0.999, budget: 46_000, maxDataLoss: 'hours', maxQueueDelayMin: 30 },
      },
      unlocked: ['appSize', 'dbSize', 'loadBalancer', 'cache', 'replicas', 'failover', 'shards', 'queue'],
      initialBuild: FIRST_SKETCH,
      lab: 'inverted-index',
      hint: 'Two pressures at once: index updates need many primaries, queries need many replicas. How you partition the index decides which of the two hurts — try both keys.',
      cardIds: ['search-design', 'hot-shard', 'read-replicas'],
      quiz: [
        {
          question: 'What does TF-IDF measure?',
          options: ['How fast a page loads', 'How relevant a word is to a document: frequent in this document, rare across all documents', 'How many links point to a page', 'The size of the index'],
          answerIndex: 1,
          explanation: 'Term frequency × inverse document frequency. Words like “the” appear everywhere and score low; distinctive words score high.',
        },
        {
          question: 'What was PageRank’s key idea?',
          options: ['Rank by page length', 'A page with many inbound links from important pages is probably useful; anchor text acts as extra keywords', 'Rank by upload date', 'Rank by keyword density'],
          answerIndex: 1,
          explanation: 'Inspired by citations between academic papers. A damping factor stops weight from flowing along links forever.',
        },
        {
          question: 'The interviewer hints that TF-IDF over the whole web is intractable. What do you do?',
          options: ['Insist it works', 'Take the hint, say what you do not know, and steer towards an inverted index with other relevance signals', 'Stop talking', 'Change the subject to caching'],
          answerIndex: 1,
          explanation: 'Listen for hints: the interviewer is steering you. Honesty and adapting matter more than reproducing Google.',
        },
      ],
    },
    debrief: [
      'Indexing (Kane): web repository → indexer extracts keywords, positions and formatting → an index (keyword → documents with relevance signals) and a backlinks store → URL normalizer → links → PageRank.',
      'Query time: index + PageRank → scoring, sorting and ranking → an inverted index of keyword → sorted documents → front-end servers.',
      'Signals worth extracting: backlinks, terms and their position, font size and headings, titles, document length, term frequency, metadata.',
      'This is a very hard problem. The deck’s point: focus on high-level architecture, be honest about what you leave unsolved, and react well to hints.',
    ],
    sources: [
      { label: 'Frank Kane — Mastering the System Design Interview, slides 53–59 and 140–145', url: KANE_COURSE_URL },
      { label: 'Brin & Page — The Anatomy of a Large-Scale Hypertextual Web Search Engine', url: 'http://infolab.stanford.edu/~backrub/google.html' },
    ],
  },
];
