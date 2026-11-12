import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'PostgreSQL documentation (postgresql.org/docs)';

export const POSTGRESQL_LESSONS: Lesson[] = [
  lesson({
    id: 'pg-mvcc',
    title: 'MVCC and VACUUM',
    summary: 'Readers never block writers, because an update creates a new row version instead of changing the old one.',
    paragraphs: [
      'PostgreSQL uses multi-version concurrency control. An UPDATE does not overwrite a row: it writes a new version and marks the old one as expired. Each transaction sees the versions that were committed when its snapshot was taken. That is why a long report can read a consistent picture while other sessions keep writing, without anyone waiting.',
      'The cost is dead rows. Expired versions stay in the table until VACUUM marks their space reusable; autovacuum does this in the background. If it cannot keep up — or a forgotten long-running transaction holds an old snapshot and prevents cleanup — tables and indexes bloat and queries slow down.',
      'Every change is first written to the write-ahead log (WAL) and flushed to disk at commit. Data pages are written later. After a crash the WAL is replayed, which is what makes committed transactions durable.',
    ],
    states: [
      state('Before', 'One live version of the row.', [store('v1', 'Row v1', 1, 0, { sub: 'balance = 100', tone: 'good' })], []),
      state('UPDATE', 'A new version is written. The old one stays for transactions whose snapshot predates the update.', [store('v1', 'Row v1 (old)', 0, 0, { sub: 'balance = 100', tone: 'warn' }), store('v2', 'Row v2', 2, 0, { sub: 'balance = 70', tone: 'good' }), box('r', 'Long-running reader', 0, 1, { sub: 'still sees 100' }), box('w', 'New transactions', 2, 1, { sub: 'see 70' })], [edge('r', 'v1'), edge('w', 'v2')]),
      state('VACUUM', 'No transaction can see v1 any more. VACUUM reclaims its space for reuse.', [store('v1', 'Dead space', 0, 0, { sub: 'reusable', tone: 'muted' }), store('v2', 'Row v2', 2, 0, { sub: 'balance = 70', tone: 'good' })], []),
    ],
    card: {
      points: ['An UPDATE writes a new row version; readers see a consistent snapshot without blocking writers.', 'Dead versions are reclaimed by (auto)VACUUM; long transactions block cleanup and cause bloat.', 'WAL is flushed at commit and replayed after a crash: that is durability.'],
      insight: 'In PostgreSQL, a transaction left open for hours is an operational incident in slow motion — it pins old row versions for the whole database.',
      source: SOURCE,
    },
    quiz: [
      q('What does an UPDATE do physically?', ['Overwrites the row in place', 'Writes a new row version and expires the old one', 'Locks the whole table', 'Copies the table'], 1, 'Old versions remain visible to older snapshots until VACUUM removes them.'),
      q('Tables keep growing although row counts are stable. Likely cause?', ['Too many indexes', 'Dead row versions not being vacuumed, often due to a long-running transaction', 'WAL is disabled', 'The planner is wrong'], 1, 'Bloat: expired versions that autovacuum could not reclaim.'),
    ],
  }),
  lesson({
    id: 'pg-indexes',
    title: 'Indexes',
    summary: 'How a query finds rows without reading the whole table — and what each index costs.',
    paragraphs: [
      'Without an index, a filter means a sequential scan: read every row. A B-tree index, the default, keeps keys sorted so that equality and range conditions find their rows in a few page reads. It also serves ORDER BY on the indexed columns.',
      'A multi-column index is sorted by its first column, then the second, and so on. It helps queries that filter on a leading prefix of those columns — an index on (customer_id, created_at) serves “this customer, newest first”, but not a search by created_at alone. If the index contains every column the query needs (a covering index, using INCLUDE), PostgreSQL can answer from the index without visiting the table: an index-only scan.',
      'Indexes are not free: each one must be updated on every write and takes space. Specialised types exist for other shapes of data: GIN for JSONB, arrays and full-text search, GiST for geometric and range data, BRIN for huge tables whose values follow physical order, such as timestamps. A partial index covers only rows matching a condition.',
    ],
    states: [
      state('Seq scan', 'No usable index: every row is read and tested. Fine for small tables, painful for large ones.', [box('q', 'WHERE email = …', 0, 0), store('t', 'Table', 1, 0, { sub: 'reads all 10M rows', span: 2, tone: 'bad' })], [edge('q', 't', { tone: 'bad' })]),
      state('Index scan', 'The B-tree finds the matching entry in a few steps, then fetches that one row from the table.', [box('q', 'WHERE email = …', 0, 0), box('i', 'B-tree on email', 1, 0, { sub: '3–4 page reads', tone: 'good' }), store('t', 'Table', 2, 0, { sub: 'fetch 1 row' })], [edge('q', 'i'), edge('i', 't')]),
      state('Index-only', 'The index already holds every column the query asks for, so the table is not touched at all.', [box('q', 'SELECT email, name', 0, 0), box('i', 'Index (email) INCLUDE (name)', 1, 0, { sub: 'answers alone', span: 2, tone: 'good' })], [edge('q', 'i', { tone: 'good' })]),
    ],
    card: {
      points: ['B-tree: equality, ranges and ordering. Composite indexes work for a leading prefix of their columns.', 'Covering index (INCLUDE) enables index-only scans.', 'GIN for JSONB/arrays/full-text, GiST for ranges/geometry, BRIN for huge naturally ordered tables; partial indexes for subsets.'],
      insight: 'Order composite index columns by how you filter: equality columns first, then the range or sort column. And every index you add is a tax on every write.',
      source: SOURCE,
    },
    quiz: [
      q('Index on (customer_id, created_at). Which query can use it efficiently?', ['WHERE created_at > now() - interval \'1 day\'', 'WHERE customer_id = 42 ORDER BY created_at DESC', 'WHERE status = \'paid\'', 'WHERE amount > 100'], 1, 'It filters on the leading column and reads the second in index order.'),
      q('What is the cost of adding an index?', ['Slower reads', 'Slower writes and more storage', 'Loss of durability', 'Nothing'], 1, 'Every INSERT, UPDATE and DELETE must maintain it.'),
    ],
  }),
  lesson({
    id: 'pg-planner',
    title: 'The query planner and EXPLAIN',
    summary: 'PostgreSQL chooses how to run your SQL from statistics. EXPLAIN ANALYZE shows what it chose and what really happened.',
    paragraphs: [
      'SQL says what you want, not how to get it. The planner considers different plans — which index, which join order, which join method — estimates the cost of each from table statistics, and runs the cheapest. The statistics are gathered by ANALYZE (run automatically by autovacuum); stale statistics lead to bad plans.',
      'EXPLAIN shows the plan with estimated row counts. EXPLAIN ANALYZE actually executes the query and adds real row counts and timings. The first thing to look for is a node where estimated and actual rows differ by orders of magnitude: that is usually where the plan went wrong.',
      'Three join methods matter. A nested loop looks up the inner side once per outer row: ideal when the outer side is small and the inner side is indexed. A hash join builds a hash table of one side and probes it: good for large unsorted inputs. A merge join walks two sorted inputs together.',
    ],
    states: [
      state('Nested loop', 'Few outer rows, indexed inner table: one quick index lookup per outer row.', [store('o', 'orders (10 rows)', 0, 0, { tone: 'good' }), box('j', 'Nested loop', 1, 0, { sub: '10 index lookups', tone: 'info' }), store('c', 'customers (index)', 2, 0)], [edge('o', 'j'), edge('j', 'c')]),
      state('Hash join', 'Two large inputs: build a hash table from the smaller one, scan the other once and probe.', [store('o', 'orders (5M rows)', 0, 0), box('j', 'Hash join', 1, 0, { sub: 'build + probe', tone: 'info' }), store('c', 'customers (200k)', 2, 0, { sub: 'hashed' })], [edge('o', 'j'), edge('c', 'j')]),
      state('Bad estimate', 'The planner expected 10 rows and got 2 million, so its nested loop does 2 million lookups. Fix the statistics, not the SQL.', [store('o', 'orders', 0, 0, { sub: 'est. 10 · actual 2M', tone: 'bad' }), box('j', 'Nested loop', 1, 0, { sub: '2M lookups', tone: 'bad' }), store('c', 'customers', 2, 0)], [edge('o', 'j', { tone: 'bad' }), edge('j', 'c', { tone: 'bad' })]),
    ],
    card: {
      points: ['The planner picks the cheapest plan by estimated cost, based on statistics from ANALYZE.', 'EXPLAIN ANALYZE shows estimated vs actual rows and time per node.', 'Nested loop (small outer, indexed inner), hash join (large inputs), merge join (sorted inputs).'],
      insight: 'When a query is slow, read the plan before rewriting the SQL. A large gap between estimated and actual rows tells you the planner was misinformed.',
      source: SOURCE,
    },
    quiz: [
      q('What is the difference between EXPLAIN and EXPLAIN ANALYZE?', ['None', 'EXPLAIN ANALYZE runs the query and reports actual rows and timings', 'EXPLAIN ANALYZE updates statistics', 'EXPLAIN is only for indexes'], 1, 'Careful with writes: EXPLAIN ANALYZE really executes the statement.'),
      q('A plan node shows estimated rows 10, actual rows 2,000,000. First thing to check?', ['Add more RAM', 'Table statistics (run ANALYZE) and whether the estimate can be improved', 'Rewrite it in another language', 'Disable indexes'], 1, 'Mis-estimates drive bad join choices.'),
    ],
  }),
  lesson({
    id: 'pg-isolation',
    title: 'Transactions and isolation levels',
    summary: 'What concurrent transactions are allowed to see of each other.',
    paragraphs: [
      'Read Committed is the default. Each statement sees data committed before that statement began, so two statements in the same transaction can see different data. It prevents dirty reads but allows non-repeatable reads.',
      'Repeatable Read takes one snapshot for the whole transaction: everything you read is consistent as of its start. If you try to update a row that another transaction changed meanwhile, yours fails with a serialization error and must be retried. Serializable goes further and guarantees the result equals some one-at-a-time order of the transactions, also aborting one when it detects a dangerous pattern.',
      'Writers do block writers: updating a row locks it until the transaction ends. Two transactions that lock the same rows in opposite order deadlock; PostgreSQL detects it and aborts one. Keep transactions short, touch rows in a consistent order, and use SELECT … FOR UPDATE when you read a value in order to change it.',
    ],
    states: [
      state('Read Committed', 'Each statement sees the latest committed data. The same query run twice in one transaction can return different results.', [box('t1', 'Txn A reads 100', 0, 0), box('t2', 'Txn B commits 70', 1, 0, { tone: 'info' }), box('t3', 'Txn A reads 70', 2, 0, { sub: 'changed mid-transaction', tone: 'warn' })], [edge('t1', 't2'), edge('t2', 't3')]),
      state('Repeatable Read', 'One snapshot for the whole transaction: A keeps seeing 100. Updating that row would fail and need a retry.', [box('t1', 'Txn A reads 100', 0, 0), box('t2', 'Txn B commits 70', 1, 0, { tone: 'info' }), box('t3', 'Txn A reads 100', 2, 0, { sub: 'same snapshot', tone: 'good' })], [edge('t1', 't2'), edge('t2', 't3')]),
      state('Lost update', 'Both read 100 and write back their own result. Without a lock or a stricter level, one deduction disappears.', [box('a', 'A: read 100, −30', 0, 0, { tone: 'warn' }), box('b', 'B: read 100, −50', 2, 0, { tone: 'warn' }), store('r', 'balance = 50', 1, 1, { sub: 'should be 20', tone: 'bad' })], [edge('a', 'r'), edge('b', 'r')]),
    ],
    card: {
      points: ['Read Committed (default): snapshot per statement. Repeatable Read: snapshot per transaction. Serializable: as if run one at a time.', 'Stricter levels can abort with serialization errors — the application must retry.', 'Row locks last until commit; SELECT … FOR UPDATE locks what you intend to change.'],
      insight: 'Read-modify-write under Read Committed is the classic lost-update bug. Either do it in one UPDATE statement, lock with FOR UPDATE, or use a stricter level with retries.',
      source: SOURCE,
    },
    quiz: [
      q('What is PostgreSQL’s default isolation level?', ['Serializable', 'Repeatable Read', 'Read Committed', 'Read Uncommitted'], 2, 'Read Committed: each statement sees data committed before it started.'),
      q('Two requests read a balance, subtract, and write it back. How do you prevent a lost update?', ['Add an index', 'UPDATE … SET balance = balance − x in one statement, or SELECT … FOR UPDATE first', 'Use a longer transaction', 'Vacuum more often'], 1, 'Make the read and write atomic, or lock the row before reading it.'),
    ],
  }),
  lesson({
    id: 'pg-replication',
    title: 'Replication, pooling and partitioning',
    summary: 'How one PostgreSQL grows: replicas for reads and failover, a pooler for connections, partitions for huge tables.',
    paragraphs: [
      'Streaming replication ships the WAL to standby servers, which replay it and can serve read-only queries. By default it is asynchronous: a commit returns before the standby has it, so failover can lose the last moments. Synchronous replication waits for a standby to confirm, trading latency for zero loss. Logical replication instead sends row changes for selected tables, which allows different versions or partial copies.',
      'Each PostgreSQL connection is a separate server process with its own memory, so thousands of connections hurt. A connection pooler such as PgBouncer lets many application connections share a small number of real ones.',
      'Partitioning splits one large table into pieces by range, list or hash — for example one partition per month. Queries that filter on the partition key skip the other partitions, and dropping old data becomes detaching a partition instead of a huge DELETE. All of this still has a single primary for writes; going beyond that means sharding at the application level or with an extension such as Citus.',
    ],
    states: [
      state('Replicas', 'The primary takes all writes and streams its WAL to standbys that serve reads and can be promoted.', [box('app', 'App', 1, 0), box('pool', 'PgBouncer', 1, 1, { sub: 'few real connections', tone: 'info' }), store('p', 'Primary', 0, 2, { sub: 'writes', tone: 'good' }), store('r', 'Standby', 2, 2, { sub: 'reads' })], [edge('app', 'pool'), edge('pool', 'p'), edge('pool', 'r'), edge('p', 'r', { label: 'WAL', dashed: true })]),
      state('Partitioning', 'A query for March touches only the March partition; dropping January is instant.', [box('q', 'WHERE month = March', 1, 0), store('jan', 'events_jan', 0, 1, { sub: 'skipped', tone: 'muted' }), store('feb', 'events_feb', 1, 1, { sub: 'skipped', tone: 'muted' }), store('mar', 'events_mar', 2, 1, { sub: 'scanned', tone: 'good' })], [edge('q', 'mar', { tone: 'good' })]),
    ],
    card: {
      points: ['Streaming replication ships WAL; async by default (possible loss), sync for zero loss; logical replication for selected tables.', 'One process per connection: put PgBouncer in front.', 'Partition large tables by range/list/hash for pruning and cheap data removal.'],
      insight: 'A single PostgreSQL primary with replicas, a pooler and partitioning goes much further than most teams expect. Exhaust that before reaching for sharding.',
      source: SOURCE,
    },
    quiz: [
      q('Why put PgBouncer in front of PostgreSQL?', ['To cache query results', 'Because each connection is a process; pooling lets many clients share few connections', 'To replicate data', 'To add indexes automatically'], 1, 'Connection count, not query load, is often the first limit an app hits.'),
      q('With default (asynchronous) streaming replication, what can be lost on failover?', ['Nothing', 'Transactions committed on the primary but not yet received by the standby', 'All data', 'Only indexes'], 1, 'The primary acknowledged them before the standby had them.'),
    ],
  }),
];
