import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Apache Kafka documentation (kafka.apache.org/documentation)';

export const KAFKA_LESSONS: Lesson[] = [
  lesson({
    id: 'kafka-log',
    title: 'The log: topics, partitions and offsets',
    summary: 'Kafka is an append-only log that consumers read at their own pace.',
    paragraphs: [
      'A topic is a named stream of records. It is split into partitions, and each partition is an ordered, append-only log stored on disk. Every record in a partition gets a sequential number, its offset.',
      'Unlike a traditional queue, reading does not remove anything. Records stay for a configured retention period, and each consumer simply remembers the offset it has reached. That means many independent consumers can read the same data, and any of them can rewind and replay.',
      'Order is guaranteed only within a partition, not across the topic. Partitions are also the unit of parallelism: more partitions allow more consumers to work at once, and throughput comes from sequential disk writes and batching.',
    ],
    states: [
      state('Append', 'Producers append to the end of a partition. Each record gets the next offset.', [box('p', 'Producer', 0, 0), store('l', 'Partition 0', 1, 0, { sub: 'offsets 0 1 2 3 4 → 5', span: 2, tone: 'good' })], [edge('p', 'l', { label: 'append' })]),
      state('Two readers', 'Reading removes nothing. Each consumer tracks its own offset in the same log.', [store('l', 'Partition 0', 0, 0, { sub: 'offsets 0 … 5', span: 3, tone: 'good' }), box('a', 'Billing', 0, 1, { sub: 'at offset 5' }), box('b', 'Analytics', 2, 1, { sub: 'at offset 2 (behind)', tone: 'warn' })], [edge('l', 'a'), edge('l', 'b')]),
      state('Replay', 'A bug was fixed: Analytics resets its offset to 0 and processes the retained history again.', [store('l', 'Partition 0', 0, 0, { sub: 'retained for 7 days', span: 3, tone: 'good' }), box('b', 'Analytics', 1, 1, { sub: 'rewinds to offset 0', tone: 'info' })], [edge('l', 'b', { tone: 'info' })]),
    ],
    card: {
      points: ['Topic → partitions; each partition is an ordered append-only log with offsets.', 'Consuming does not delete; records live for the retention period, so consumers can replay.', 'Ordering holds within a partition only; partitions are the unit of parallelism.'],
      insight: 'Think of Kafka as a durable, replayable history shared by many readers — not as a queue that happens to be fast.',
      source: SOURCE,
    },
    quiz: [
      q('What happens to a record after a consumer reads it?', ['It is deleted', 'Nothing — it stays until retention expires', 'It moves to another partition', 'It is archived to S3'], 1, 'Consumers only advance their own offset.'),
      q('Where does Kafka guarantee ordering?', ['Across the whole topic', 'Within a single partition', 'Across all topics', 'Nowhere'], 1, 'Records in different partitions have no defined relative order.'),
    ],
  }),
  lesson({
    id: 'kafka-producers',
    title: 'Producers: keys, partitioning and acks',
    summary: 'The key decides the partition; acks decides how safe the write is.',
    paragraphs: [
      'A producer sends each record to one partition. If the record has a key, the partition is chosen by hashing the key, so all records with the same key land in the same partition and stay in order. Use the entity’s ID as the key — order ID, user ID — when the order of its events matters.',
      'The acks setting controls durability. With acks=0 the producer does not wait at all. With acks=1 it waits for the partition leader only, so a write is lost if the leader dies before followers copy it. With acks=all it waits until all in-sync replicas have the record.',
      'Retries can duplicate records. The idempotent producer (enabled by default in current versions) tags each batch with a sequence number so the broker discards duplicates, giving exactly-once writes per partition. Uneven keys cause hot partitions: one very active key puts all its traffic on one partition.',
    ],
    states: [
      state('By key', 'Records with the same key hash to the same partition, so one order’s events stay in order.', [box('p', 'Producer', 1, 0, { sub: 'key = order ID' }), store('p0', 'Partition 0', 0, 1, { sub: 'order 17, order 17', tone: 'good' }), store('p1', 'Partition 1', 1, 1, { sub: 'order 4' }), store('p2', 'Partition 2', 2, 1, { sub: 'order 9, order 9', tone: 'good' })], [edge('p', 'p0'), edge('p', 'p1'), edge('p', 'p2')]),
      state('acks=1', 'Only the leader has confirmed. If it dies now, before followers copy the record, the record is gone.', [box('p', 'Producer', 1, 0, { sub: 'got ack' }), store('l', 'Leader', 0, 1, { sub: 'has record', tone: 'warn' }), store('f1', 'Follower', 1, 1, { sub: 'not yet', tone: 'muted' }), store('f2', 'Follower', 2, 1, { sub: 'not yet', tone: 'muted' })], [edge('p', 'l', { tone: 'warn' })]),
      state('acks=all', 'The ack comes only after all in-sync replicas have the record. It survives the leader failing.', [box('p', 'Producer', 1, 0, { sub: 'got ack' }), store('l', 'Leader', 0, 1, { sub: 'has record', tone: 'good' }), store('f1', 'Follower', 1, 1, { sub: 'has record', tone: 'good' }), store('f2', 'Follower', 2, 1, { sub: 'has record', tone: 'good' })], [edge('p', 'l', { tone: 'good' }), edge('l', 'f1', { dashed: true })]),
    ],
    card: {
      points: ['Same key → same partition → ordered. No key → spread across partitions.', 'acks=0 no wait, acks=1 leader only, acks=all all in-sync replicas.', 'The idempotent producer removes duplicates caused by retries.'],
      insight: 'Choose the key for ordering first and check its distribution second: a skewed key gives you one overloaded partition that more brokers cannot fix.',
      source: SOURCE,
    },
    quiz: [
      q('How do you keep all events of one order in order?', ['Use one partition for everything', 'Use the order ID as the record key', 'Set acks=all', 'Use more consumers'], 1, 'Same key, same partition, and partitions are ordered.'),
      q('Which setting waits for all in-sync replicas before acknowledging?', ['acks=0', 'acks=1', 'acks=all', 'retries=0'], 2, 'It is the durable setting, usually combined with min.insync.replicas=2.'),
    ],
  }),
  lesson({
    id: 'kafka-consumers',
    title: 'Consumer groups and rebalancing',
    summary: 'A group shares the partitions of a topic among its members.',
    paragraphs: [
      'Consumers join a consumer group. Kafka assigns each partition of the topic to exactly one consumer in the group, so the group as a whole reads every record once and the members share the work. Different groups are independent: each gets its own copy of the stream and its own offsets.',
      'Because a partition has only one reader per group, the number of partitions caps the group’s parallelism. Three partitions and five consumers means two consumers sit idle.',
      'When a consumer joins, leaves or stops sending heartbeats, the group rebalances: partitions are reassigned among the members. A consumer commits the offset it has processed; after a rebalance the new owner resumes from the last committed offset, so anything processed but not yet committed is processed again. Consumer lag — how far the committed offset trails the end of the log — is the key health metric.',
    ],
    states: [
      state('1 consumer', 'One consumer reads all three partitions.', [store('p0', 'Partition 0', 0, 0), store('p1', 'Partition 1', 1, 0), store('p2', 'Partition 2', 2, 0), box('c1', 'Consumer A', 1, 1, { sub: 'reads all three', tone: 'warn' })], [edge('p0', 'c1'), edge('p1', 'c1'), edge('p2', 'c1')]),
      state('3 consumers', 'After a rebalance each consumer owns one partition: three times the throughput.', [store('p0', 'Partition 0', 0, 0), store('p1', 'Partition 1', 1, 0), store('p2', 'Partition 2', 2, 0), box('c1', 'Consumer A', 0, 1, { tone: 'good' }), box('c2', 'Consumer B', 1, 1, { tone: 'good' }), box('c3', 'Consumer C', 2, 1, { tone: 'good' })], [edge('p0', 'c1'), edge('p1', 'c2'), edge('p2', 'c3')]),
      state('Consumer B dies', 'B stops heartbeating. The group rebalances and A takes over partition 1 from its last committed offset.', [store('p0', 'Partition 0', 0, 0), store('p1', 'Partition 1', 1, 0), store('p2', 'Partition 2', 2, 0), box('c1', 'Consumer A', 0, 1, { sub: 'now owns 0 and 1', tone: 'warn' }), box('c2', 'Consumer B', 1, 1, { sub: '✕ gone', tone: 'bad' }), box('c3', 'Consumer C', 2, 1, { tone: 'good' })], [edge('p0', 'c1'), edge('p1', 'c1', { tone: 'warn' }), edge('p2', 'c3')]),
    ],
    card: {
      points: ['Within a group, each partition is read by exactly one consumer; groups are independent of each other.', 'Parallelism is capped by the partition count.', 'Membership changes trigger a rebalance; consumption resumes from committed offsets. Watch consumer lag.'],
      insight: 'Plan partition count for the consumer parallelism you will need later — adding partitions afterwards changes which partition a key maps to and breaks per-key ordering.',
      source: SOURCE,
    },
    quiz: [
      q('A topic has 3 partitions and the group has 5 consumers. How many consumers do work?', ['5', '3', '1', '0'], 1, 'One consumer per partition; the other two are idle spares.'),
      q('What is consumer lag?', ['Network latency', 'How far the group’s committed offset is behind the end of the log', 'The time to rebalance', 'Disk usage'], 1, 'Growing lag means consumers are not keeping up with producers.'),
    ],
  }),
  lesson({
    id: 'kafka-replication',
    title: 'Replication, ISR and the controller',
    summary: 'How a partition survives a broker failure without losing acknowledged data.',
    paragraphs: [
      'Each partition is replicated to several brokers, typically three. One replica is the leader and handles reads and writes; the others are followers that copy the leader’s log. The in-sync replicas (ISR) are the followers that are fully caught up.',
      'With acks=all, a write is acknowledged only when all in-sync replicas have it. The setting min.insync.replicas says how many must be in sync for writes to be accepted at all: with replication factor 3 and min.insync.replicas=2 you can lose one broker and keep writing, and an acknowledged record always exists on at least two brokers.',
      'When a leader fails, the controller elects a new leader from the ISR, so no acknowledged record is lost. Cluster metadata and controller election used to rely on ZooKeeper; modern Kafka uses KRaft, a Raft-based quorum of controllers built into Kafka itself.',
    ],
    states: [
      state('Healthy', 'One leader, two in-sync followers. A write with acks=all is on all three.', [store('l', 'Broker 1: leader', 0, 0, { tone: 'good' }), store('f1', 'Broker 2', 1, 0, { sub: 'in sync', tone: 'good' }), store('f2', 'Broker 3', 2, 0, { sub: 'in sync', tone: 'good' })], [edge('l', 'f1')]),
      state('Follower lags', 'Broker 3 falls behind and leaves the ISR. Writes continue with two in-sync replicas (min.insync.replicas = 2).', [store('l', 'Broker 1: leader', 0, 0, { tone: 'good' }), store('f1', 'Broker 2', 1, 0, { sub: 'in sync', tone: 'good' }), store('f2', 'Broker 3', 2, 0, { sub: 'out of ISR', tone: 'warn' })], [edge('l', 'f1')]),
      state('Leader fails', 'The controller promotes an in-sync follower. Every acknowledged record is already there.', [store('l', 'Broker 1', 0, 0, { sub: '✕ down', tone: 'bad' }), store('f1', 'Broker 2: new leader', 1, 0, { tone: 'good' }), store('f2', 'Broker 3', 2, 0, { sub: 'follows broker 2' })], [edge('f1', 'f2')]),
    ],
    card: {
      points: ['Each partition has a leader and followers; the ISR is the set of caught-up replicas.', 'acks=all + min.insync.replicas=2 with replication factor 3: survive one broker with no loss.', 'A new leader is elected from the ISR; KRaft replaced ZooKeeper for metadata.'],
      insight: 'Durability in Kafka is a three-way agreement between replication factor, min.insync.replicas and the producer’s acks. Setting only one of them protects nothing.',
      source: SOURCE,
    },
    quiz: [
      q('Replication factor 3, min.insync.replicas 2, acks=all. One broker dies. Can producers still write?', ['No', 'Yes — two in-sync replicas remain', 'Only with acks=0', 'Only after manual repair'], 1, 'Two replicas satisfy min.insync.replicas, so writes continue safely.'),
      q('What does modern Kafka use instead of ZooKeeper?', ['etcd', 'KRaft, a built-in Raft-based controller quorum', 'Redis', 'Nothing — it has no metadata'], 1, 'KRaft moved metadata management into Kafka.'),
    ],
  }),
  lesson({
    id: 'kafka-semantics',
    title: 'Delivery guarantees, retention and compaction',
    summary: 'At-most-once, at-least-once, exactly-once — and how long Kafka keeps the data.',
    paragraphs: [
      'The guarantee depends on when the consumer commits its offset. Commit before processing and a crash loses that record: at-most-once. Process first and commit afterwards, and a crash causes the record to be processed again: at-least-once, the usual choice, which requires idempotent processing.',
      'Exactly-once within Kafka uses transactions: a consumer reads, processes and writes results to another topic, and the output records and the offset commit succeed or fail together. This covers Kafka-to-Kafka pipelines. As soon as an external system is involved — a database, an email — you are back to at-least-once plus idempotency on that side.',
      'Data leaves by retention, not by consumption. Time- or size-based retention deletes old log segments. Log compaction instead keeps only the latest record for each key, turning a topic into a durable “current state per key” that a new consumer can read from the beginning to rebuild that state.',
    ],
    states: [
      state('At-most-once', 'Offset committed first, then a crash: the record is skipped forever.', [box('c', 'Commit offset', 0, 0, { tone: 'good' }), box('x', 'Crash ✕', 1, 0, { tone: 'bad' }), box('p', 'Process', 2, 0, { sub: 'never happens', tone: 'muted' })], [edge('c', 'x'), edge('x', 'p', { dashed: true })]),
      state('At-least-once', 'Processed, then a crash before the commit: on restart the record is processed a second time.', [box('p', 'Process', 0, 0, { tone: 'good' }), box('x', 'Crash ✕', 1, 0, { tone: 'bad' }), box('c', 'Commit offset', 2, 0, { sub: 'missing → redo', tone: 'warn' })], [edge('p', 'x'), edge('x', 'c', { dashed: true })]),
      state('Compaction', 'A compacted topic keeps the newest value per key: the full history shrinks to the current state.', [store('before', 'k1=A k2=B k1=C k1=D', 0, 0, { sub: 'full log', span: 3 }), store('after', 'k2=B k1=D', 0, 1, { sub: 'after compaction', span: 3, tone: 'good' })], [edge('before', 'after')]),
    ],
    card: {
      points: ['Commit before processing: at-most-once. Process before committing: at-least-once.', 'Transactions give exactly-once for read-process-write within Kafka only.', 'Retention deletes by time/size; compaction keeps the latest record per key.'],
      insight: 'Assume at-least-once and make consumers idempotent. Exactly-once ends at Kafka’s edge: the moment you call another system, duplicates are your problem again.',
      source: SOURCE,
    },
    quiz: [
      q('A consumer processes a record and crashes before committing. What happens on restart?', ['The record is lost', 'The record is processed again', 'The topic is rebuilt', 'The group is deleted'], 1, 'At-least-once: design the processing to be idempotent.'),
      q('What does log compaction keep?', ['The first record per key', 'The latest record per key', 'Only the last hour', 'Nothing'], 1, 'It turns a topic into a changelog of current state.'),
    ],
  }),
];
