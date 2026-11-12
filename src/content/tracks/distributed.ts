// Distributed systems design — part of the System design subject.
import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Kleppmann, Designing Data-Intensive Applications; the Raft and Dynamo papers';

export const DISTRIBUTED_LESSONS: Lesson[] = [
  lesson({
    id: 'ds-partial-failure',
    title: 'Partial failure: why distributed is hard',
    summary: 'A request can be lost, the reply can be lost, or it is just slow — and the caller cannot tell which.',
    paragraphs: [
      'On one machine an operation either works or the whole program crashes. Across a network there is a third outcome: you do not know. The request may never have arrived, it may have been processed with the reply lost, or the other side may simply be slow.',
      'All the caller can do is wait for a timeout and then decide. Retrying is the usual answer — but if the first attempt did succeed, the retry runs the operation twice. That is why operations in distributed systems are designed to be idempotent: doing them twice has the same effect as once, typically by attaching a unique request ID that the receiver remembers.',
      'Clocks add a second problem. Each machine has its own clock, they drift apart, and so “which happened first?” cannot be answered by comparing timestamps from two machines.',
    ],
    states: [
      state('Request lost', 'The request never arrives. B did nothing; A sees only silence.', [box('a', 'Service A', 0, 0, { sub: 'waits…' }), box('b', 'Service B', 2, 0, { sub: 'did nothing', tone: 'muted' })], [edge('a', 'b', { label: 'lost ✕', tone: 'bad', dashed: true })]),
      state('Reply lost', 'B did the work, but the reply is lost. A sees exactly the same silence.', [box('a', 'Service A', 0, 0, { sub: 'waits…' }), box('b', 'Service B', 2, 0, { sub: 'charged the card', tone: 'good' })], [edge('a', 'b', { label: 'ok', tone: 'good' }), edge('b', 'a', { label: 'reply lost ✕', tone: 'bad', dashed: true })]),
      state('Just slow', 'B is alive but slow. If A times out and retries, B may do the work twice — unless the request is idempotent.', [box('a', 'Service A', 0, 0, { sub: 'times out, retries', tone: 'warn' }), box('b', 'Service B', 2, 0, { sub: 'busy (GC pause)', tone: 'warn' })], [edge('a', 'b', { label: 'retry + same ID', tone: 'warn' })]),
    ],
    card: {
      points: ['A timeout tells you nothing about whether the work was done.', 'Retries make delivery at-least-once; idempotency keys make that safe.', 'Clocks on different machines disagree — do not order events by wall-clock time.'],
      insight: '“Exactly once” is really at-least-once delivery plus idempotent processing. Design the receiver, not the network.',
      source: SOURCE,
    },
    quiz: [
      q('Service A calls B to charge a card and gets a timeout. What does A know?', ['The charge failed', 'The charge succeeded', 'Nothing — it may or may not have happened', 'B has crashed'], 2, 'Lost request, lost reply and a slow server all look identical to the caller.'),
      q('What makes retrying that charge safe?', ['A longer timeout', 'An idempotency key that B uses to recognise the duplicate', 'Retrying faster', 'Using UDP'], 1, 'B stores the request ID with the result; a repeat with the same ID returns the stored result instead of charging again.'),
    ],
  }),
  lesson({
    id: 'ds-consensus',
    title: 'Consensus and leader election',
    summary: 'How a cluster agrees on one leader and one history, and why you need a majority.',
    paragraphs: [
      'Many systems need exactly one node in charge: one primary database, one controller. If two nodes both believe they are the leader (“split brain”), they accept conflicting writes and the data diverges.',
      'Consensus algorithms such as Raft prevent this with majorities. A node becomes leader only if a majority of the cluster votes for it in a numbered term, and a write is committed only once a majority has stored it. Two majorities always overlap in at least one node, so two leaders can never both make progress.',
      'The cost is availability: the side of a network split that has no majority must stop accepting writes. That is the “C” choice in CAP. It is also why clusters have odd sizes — three nodes tolerate one failure, five tolerate two; a fourth node adds cost but no extra tolerance.',
    ],
    states: [
      state('Healthy', 'The leader replicates every write; it is committed once 2 of 3 nodes have it.', [box('l', 'Leader', 1, 0, { sub: 'term 4', tone: 'good' }), box('f1', 'Follower', 0, 1), box('f2', 'Follower', 2, 1)], [edge('l', 'f1', { label: 'log' }), edge('l', 'f2', { label: 'log' })]),
      state('Leader dies', 'Followers stop hearing heartbeats. One asks for votes, wins 2 of 3, and becomes leader of term 5.', [box('l', 'Old leader', 1, 0, { sub: '✕ crashed', tone: 'bad' }), box('f1', 'New leader', 0, 1, { sub: 'term 5', tone: 'good' }), box('f2', 'Follower', 2, 1, { sub: 'voted yes' })], [edge('f2', 'f1', { label: 'vote', tone: 'good' })]),
      state('Network split', 'The isolated node cannot reach a majority, so it must refuse writes. Only the majority side keeps going.', [box('l', 'Isolated node', 1, 0, { sub: 'no majority: stops', tone: 'warn' }), box('f1', 'Leader', 0, 1, { sub: 'majority side', tone: 'good' }), box('f2', 'Follower', 2, 1, { tone: 'good' })], [edge('f1', 'f2', { label: 'log', tone: 'good' }), edge('l', 'f1', { label: 'cut ✕', tone: 'bad', dashed: true })]),
    ],
    card: {
      points: ['A leader needs votes from a majority; a write needs a majority to commit.', 'Any two majorities overlap, which rules out two active leaders (split brain).', 'N nodes tolerate (N − 1) / 2 failures: use 3 or 5, not 4.'],
      insight: 'Consensus buys consistency by giving up availability on the minority side. Use it for the small, critical state (who is leader, config), not for every write path.',
      source: SOURCE,
    },
    quiz: [
      q('How many node failures can a 5-node Raft cluster survive?', ['1', '2', '3', '4'], 1, 'A majority of 5 is 3, so 2 nodes can fail and the remaining 3 still form a majority.'),
      q('During a network split, what must the minority side do?', ['Elect its own leader', 'Keep accepting writes and merge later', 'Stop accepting writes', 'Delete its data'], 2, 'Without a majority it cannot commit anything safely. Refusing writes is what prevents split brain.'),
    ],
  }),
  lesson({
    id: 'ds-quorums',
    title: 'Quorums: tuning consistency with N, R and W',
    summary: 'In leaderless stores you choose how many replicas must answer a write and a read.',
    paragraphs: [
      'Leaderless databases such as Cassandra and Dynamo keep N copies of each item and let any replica accept a write. You choose W, the number of replicas that must confirm a write, and R, the number that must answer a read.',
      'If R + W > N, every read overlaps with the latest write in at least one replica, so the reader is guaranteed to see the newest value. If R + W ≤ N, a read may hit only replicas that missed the write and return stale data — but both operations are faster and survive more failures.',
      'This is the dial behind “tunable consistency”. A higher W makes writes slower and less available; a higher R does the same to reads. Stale replicas are repaired in the background (read repair, anti-entropy).',
    ],
    states: [
      state('W=2, R=2', 'R + W = 4 > 3: the read set always overlaps the write set, so the newest value is seen.', [box('c', 'Client', 1, 0), store('r1', 'Replica 1', 0, 1, { sub: 'v2 ✓ write', tone: 'good' }), store('r2', 'Replica 2', 1, 1, { sub: 'v2 ✓ write+read', tone: 'good' }), store('r3', 'Replica 3', 2, 1, { sub: 'v1 (stale) read', tone: 'warn' })], [edge('c', 'r1'), edge('c', 'r2'), edge('c', 'r3')]),
      state('W=1, R=1', 'R + W = 2 ≤ 3: fast and highly available, but a read can land on a replica that missed the write.', [box('c', 'Client', 1, 0), store('r1', 'Replica 1', 0, 1, { sub: 'v2 ✓ write', tone: 'good' }), store('r2', 'Replica 2', 1, 1, { sub: 'v1', tone: 'muted' }), store('r3', 'Replica 3', 2, 1, { sub: 'v1 ← read: stale!', tone: 'bad' })], [edge('c', 'r1'), edge('c', 'r3', { tone: 'bad' })]),
      state('W=3, R=1', 'Every replica has every write, so any single read is fresh — but one replica down blocks all writes.', [box('c', 'Client', 1, 0), store('r1', 'Replica 1', 0, 1, { sub: 'v2', tone: 'good' }), store('r2', 'Replica 2', 1, 1, { sub: 'v2', tone: 'good' }), store('r3', 'Replica 3', 2, 1, { sub: 'v2', tone: 'good' })], [edge('c', 'r1'), edge('c', 'r2'), edge('c', 'r3')]),
    ],
    card: {
      points: ['N replicas, W confirmations per write, R answers per read.', 'R + W > N guarantees a read sees the latest write.', 'Lower R and W: faster and more available, possibly stale.'],
      insight: 'Consistency is not a property of the database but of how you call it — choose R and W per use case, not once for the system.',
      source: SOURCE,
    },
    quiz: [
      q('N = 3. Which setting guarantees reading your latest write?', ['W=1, R=1', 'W=1, R=2', 'W=2, R=2', 'W=2, R=1'], 2, 'R + W must exceed N: 2 + 2 = 4 > 3. The other options sum to 3 or less.'),
      q('What do you give up with W = N?', ['Read speed', 'Write availability: one replica down blocks every write', 'Durability', 'Nothing'], 1, 'Every replica must confirm, so a single failure stops writes.'),
    ],
  }),
  lesson({
    id: 'ds-consistent-hashing',
    title: 'Consistent hashing',
    summary: 'Spread keys across servers so that adding or removing one moves only a small share of them.',
    paragraphs: [
      'The obvious way to pick a server for a key is hash(key) mod N. It spreads keys evenly — until N changes. Add one server and almost every key now maps somewhere else: a cache fleet loses nearly all its contents at once, and a database must move nearly all its data.',
      'Consistent hashing places both servers and keys on a ring of hash values. A key belongs to the first server found clockwise from it. Adding a server only takes over the keys between it and its predecessor — about 1/N of them — and everything else stays put.',
      'Real systems give each server many positions on the ring (“virtual nodes”) so load stays even and a departing server’s keys are shared among many others rather than dumped on one neighbour.',
    ],
    states: [
      state('hash mod N', 'Going from 3 to 4 servers changes the result for about three quarters of the keys: nearly everything moves.', [box('k', 'key → hash mod N', 0, 0, { span: 3 }), store('s1', 'Server 1', 0, 1, { sub: 'most keys move', tone: 'bad' }), store('s2', 'Server 2', 1, 1, { sub: 'most keys move', tone: 'bad' }), store('s3', 'Server 3', 2, 1, { sub: 'most keys move', tone: 'bad' }), store('s4', 'Server 4 (new)', 1, 2, { tone: 'info' })], [edge('k', 's1'), edge('k', 's2'), edge('k', 's3')]),
      state('Hash ring', 'The new server takes only the keys between it and its predecessor — about a quarter. The rest do not move.', [box('k', 'key → next server on the ring', 0, 0, { span: 3 }), store('s1', 'Server 1', 0, 1, { sub: 'unchanged', tone: 'good' }), store('s2', 'Server 2', 1, 1, { sub: 'gives up ~1/4', tone: 'warn' }), store('s3', 'Server 3', 2, 1, { sub: 'unchanged', tone: 'good' }), store('s4', 'Server 4 (new)', 1, 2, { sub: 'takes ~1/4', tone: 'info' })], [edge('k', 's1'), edge('k', 's2'), edge('k', 's3'), edge('s2', 's4', { label: 'moves', tone: 'info' })]),
    ],
    card: {
      points: ['hash mod N remaps almost every key when N changes.', 'On a hash ring, adding or removing a server moves only about 1/N of the keys.', 'Virtual nodes even out the load and spread a failed server’s keys.'],
      insight: 'Reach for it whenever the set of servers changes while holding state: cache fleets, sharded stores, partition assignment.',
      source: SOURCE,
    },
    quiz: [
      q('A cache fleet using hash mod N grows from 4 to 5 nodes. What happens?', ['About a fifth of keys move', 'Nothing moves', 'Most keys map to a different node, so the cache is effectively cold', 'Only new keys are affected'], 2, 'mod 4 and mod 5 disagree for most hashes. With consistent hashing only about a fifth would move.'),
      q('Why do implementations use virtual nodes?', ['To use less memory', 'To keep load even and spread a removed server’s keys over many others', 'To make hashing faster', 'To encrypt keys'], 1, 'One position per server gives uneven arcs; many positions average out.'),
    ],
  }),
  lesson({
    id: 'ds-time-ordering',
    title: 'Time, ordering and logical clocks',
    summary: 'Wall clocks lie across machines. Order events by causality instead.',
    paragraphs: [
      'Clocks on different machines drift by milliseconds or more, and can jump when they are corrected. If two servers timestamp two writes and you keep the “later” one (last write wins), a server with a fast clock silently overwrites newer data.',
      'Logical clocks order events without trusting time. A Lamport clock is a counter: increment it on every event, send it with every message, and on receiving a message jump to max(own, received) + 1. If A caused B, then A’s number is smaller.',
      'Vector clocks keep one counter per node, which also reveals when two events are concurrent — neither caused the other. That is what lets a store detect a genuine conflict and hand both versions to the application instead of quietly dropping one.',
    ],
    states: [
      state('Wall clocks', 'Node B’s clock is behind. Its later write gets the smaller timestamp and is discarded by last-write-wins.', [box('a', 'Node A', 0, 0, { sub: 'write at 10:00:05', tone: 'warn' }), box('b', 'Node B (slow clock)', 2, 0, { sub: 'later write: 10:00:03', tone: 'bad' }), store('s', 'Stored value', 1, 1, { sub: 'keeps A — wrong', tone: 'bad' })], [edge('a', 's'), edge('b', 's', { label: 'dropped', tone: 'bad', dashed: true })]),
      state('Lamport clock', 'B received A’s message carrying counter 5, so its next event is 6. Cause always has the smaller number.', [box('a', 'Node A', 0, 0, { sub: 'event 5', tone: 'good' }), box('b', 'Node B', 2, 0, { sub: 'max(2, 5) + 1 = 6', tone: 'good' })], [edge('a', 'b', { label: 'msg (5)', tone: 'good' })]),
      state('Vector clock', 'Neither version has seen the other: [2,0] and [0,1] are concurrent. The store keeps both and reports a conflict.', [box('a', 'Node A', 0, 0, { sub: 'version [2, 0]', tone: 'info' }), box('b', 'Node B', 2, 0, { sub: 'version [0, 1]', tone: 'info' }), store('s', 'Conflict', 1, 1, { sub: 'both kept', tone: 'warn' })], [edge('a', 's'), edge('b', 's')]),
    ],
    card: {
      points: ['Timestamps from different machines cannot order events reliably.', 'Lamport clocks order causally related events with one counter.', 'Vector clocks also detect concurrent updates, i.e. real conflicts.'],
      insight: 'Last-write-wins is data loss with good manners. If losing a concurrent update matters, detect the conflict and resolve it deliberately.',
      source: SOURCE,
    },
    quiz: [
      q('Why is last-write-wins by timestamp risky?', ['Timestamps are too long', 'Clock skew can make an older write look newer, silently discarding data', 'It is slow', 'It needs a leader'], 1, 'The “winner” is decided by whichever clock ran fast, not by what actually happened last.'),
      q('What can a vector clock tell you that a Lamport clock cannot?', ['The wall-clock time', 'That two events were concurrent', 'Which node is the leader', 'The size of the message'], 1, 'Comparing vectors shows whether one version descends from the other or neither does.'),
    ],
  }),
];
