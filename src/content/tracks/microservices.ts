import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Sam Newman, Building Microservices; Chris Richardson, microservices.io patterns';

export const MICROSERVICES_LESSONS: Lesson[] = [
  lesson({
    id: 'ms-boundaries',
    title: 'Monolith or microservices?',
    summary: 'What you gain, what you pay, and where to draw the lines.',
    paragraphs: [
      'A monolith is one deployable unit with one database. It is simple to develop, test and run, and a function call cannot time out. Its problems appear with size: every team ships through the same release, one bad change takes everything down, and the whole thing scales as one block.',
      'Microservices split the system into small services that own their data and are deployed independently. Teams move without waiting for each other and each service scales on its own. The price is a distributed system: network calls that fail, data that is no longer in one transaction, and far more to operate and observe.',
      'Draw boundaries around business capabilities (orders, payments, catalog), not technical layers. A good boundary means most changes touch one service. If every feature needs three services changed and deployed together, you have built a distributed monolith — all of the cost and none of the benefit.',
    ],
    states: [
      state('Monolith', 'One deployable, one database. Simple — until many teams and very different scaling needs share it.', [box('m', 'Orders + Payments + Catalog', 0, 0, { sub: 'one deployable', span: 3, tone: 'info' }), store('db', 'One database', 1, 1)], [edge('m', 'db')]),
      state('Microservices', 'Each service owns its data and ships on its own schedule. Calls between them now cross a network.', [box('o', 'Orders', 0, 0, { tone: 'good' }), box('p', 'Payments', 1, 0, { tone: 'good' }), box('c', 'Catalog', 2, 0, { tone: 'good' }), store('od', 'Orders DB', 0, 1), store('pd', 'Payments DB', 1, 1), store('cd', 'Catalog DB', 2, 1)], [edge('o', 'od'), edge('p', 'pd'), edge('c', 'cd'), edge('o', 'p', { label: 'API' })]),
      state('Distributed monolith', 'Separate services sharing one database: a schema change breaks all of them, and they must be deployed together.', [box('o', 'Orders', 0, 0, { tone: 'warn' }), box('p', 'Payments', 1, 0, { tone: 'warn' }), box('c', 'Catalog', 2, 0, { tone: 'warn' }), store('db', 'Shared database', 0, 1, { sub: 'hidden coupling', span: 3, tone: 'bad' })], [edge('o', 'db'), edge('p', 'db'), edge('c', 'db')]),
    ],
    card: {
      points: ['Monolith: simple and transactional; hard to scale teams and parts independently.', 'Microservices: independent deployment and scaling, at the cost of a distributed system.', 'Split by business capability; a service owns its data.'],
      insight: 'Microservices solve an organisational problem more than a technical one. Start with a well-structured monolith and extract services when a boundary has proven stable.',
      source: SOURCE,
    },
    quiz: [
      q('What is the clearest sign of a “distributed monolith”?', ['Services use different languages', 'Services must be deployed together because they share a database or change in lockstep', 'There is an API gateway', 'Each service has its own repository'], 1, 'Independent deployability is the whole point. Shared schemas and lockstep releases remove it.'),
      q('A team of five is building a new product with unclear requirements. Sensible start?', ['Thirty microservices', 'A modular monolith, splitting later where boundaries prove stable', 'One service per database table', 'A service mesh first'], 1, 'Boundaries are expensive to move once they are network boundaries. Learn the domain first.'),
    ],
  }),
  lesson({
    id: 'ms-communication',
    title: 'Talking to each other: sync calls vs events',
    summary: 'Request/response couples services in time; events decouple them.',
    paragraphs: [
      'A synchronous call (REST or gRPC) is simple to reason about: ask, wait, get an answer. But the caller is only up when the callee is up, and latency adds along the chain. If a request passes through five services that are each 99.9% available, the chain is only about 99.5% available.',
      'With asynchronous messaging a service publishes an event (“order placed”) to a broker and moves on. Interested services consume it when they can. The publisher does not know or care who listens, a slow consumer does not slow the publisher, and a consumer that is down catches up later.',
      'The trade-off is eventual consistency and harder debugging: there is no single request to follow, and the answer to “did it work?” arrives later. Use synchronous calls when the user needs the answer now; use events for everything that merely has to happen.',
    ],
    states: [
      state('Synchronous chain', 'Orders waits for Payments, which waits for Fraud. If Fraud is slow or down, the order request is too.', [box('o', 'Orders', 0, 0), box('p', 'Payments', 1, 0), box('f', 'Fraud check', 2, 0, { sub: 'slow', tone: 'bad' })], [edge('o', 'p', { label: 'waits' }), edge('p', 'f', { label: 'waits', tone: 'bad' })]),
      state('Events', 'Orders publishes once and returns. Consumers work independently; a slow one only delays itself.', [box('o', 'Orders', 0, 0, { tone: 'good' }), box('b', 'Event broker', 1, 0, { sub: 'order placed', tone: 'info' }), box('p', 'Payments', 0, 1), box('e', 'Email', 1, 1), box('a', 'Analytics', 2, 1, { sub: 'slow — fine', tone: 'warn' })], [edge('o', 'b'), edge('b', 'p'), edge('b', 'e'), edge('b', 'a')]),
    ],
    card: {
      points: ['Sync (REST/gRPC): simple, immediate answer, availability multiplies along the chain.', 'Async events: publisher and consumers are decoupled in time; eventual consistency.', 'gRPC for efficient internal calls; REST/JSON for public, widely consumable APIs.'],
      insight: 'Every synchronous hop you add lowers availability and raises tail latency. Ask of each call: does the user actually need this answer before I respond?',
      source: SOURCE,
    },
    quiz: [
      q('Four services in a synchronous chain are each 99.9% available. Roughly how available is the chain?', ['99.99%', '99.9%', '99.6%', '90%'], 2, '0.999⁴ ≈ 0.996. Availability multiplies, so chains are weaker than their links.'),
      q('Which is the main cost of moving from sync calls to events?', ['Higher coupling', 'Eventual consistency and harder end-to-end debugging', 'Slower publishers', 'It requires a monolith'], 1, 'State converges later, and one user action is now spread over many independent handlers.'),
    ],
  }),
  lesson({
    id: 'ms-data',
    title: 'Data across services: sagas and the outbox',
    summary: 'No shared database means no shared transaction. Here is what replaces it.',
    paragraphs: [
      'When each service owns its database, one business operation — place order, charge card, reserve stock — spans several databases and cannot be a single ACID transaction. Two-phase commit across services is slow and blocks when a participant is down, so it is rarely used.',
      'A saga breaks the operation into local transactions, one per service, linked by events. If a later step fails, earlier steps are undone by compensating actions (refund the charge, release the stock). In choreography each service reacts to the previous one’s event; in orchestration a coordinator tells each service what to do, which is easier to follow for long flows.',
      'One trap remains: a service must update its database and publish an event, and doing these as two separate steps can leave one done and the other not. The outbox pattern writes the event into a table in the same local transaction as the data change; a separate process then publishes the outbox rows to the broker.',
    ],
    states: [
      state('Saga succeeds', 'Three local transactions, each triggered by the previous one’s event.', [box('o', 'Orders', 0, 0, { sub: '1 create order', tone: 'good' }), box('p', 'Payments', 1, 0, { sub: '2 charge card', tone: 'good' }), box('s', 'Stock', 2, 0, { sub: '3 reserve item', tone: 'good' })], [edge('o', 'p', { label: 'event', tone: 'good' }), edge('p', 's', { label: 'event', tone: 'good' })]),
      state('Step 3 fails', 'Stock cannot reserve. Compensations run backwards: refund the card, cancel the order.', [box('o', 'Orders', 0, 0, { sub: 'cancel order', tone: 'warn' }), box('p', 'Payments', 1, 0, { sub: 'refund', tone: 'warn' }), box('s', 'Stock', 2, 0, { sub: '✕ out of stock', tone: 'bad' })], [edge('s', 'p', { label: 'failed', tone: 'bad' }), edge('p', 'o', { label: 'refunded', tone: 'warn' })]),
      state('Outbox', 'Order row and event row commit together. A relay publishes the event afterwards — never one without the other.', [box('svc', 'Orders service', 0, 0), store('db', 'orders + outbox', 1, 0, { sub: 'one transaction', tone: 'good' }), box('relay', 'Relay', 1, 1), box('b', 'Broker', 2, 1, { tone: 'info' })], [edge('svc', 'db'), edge('db', 'relay'), edge('relay', 'b')]),
    ],
    card: {
      points: ['A saga is a sequence of local transactions with compensating actions for rollback.', 'Choreography: services react to events. Orchestration: a coordinator drives the steps.', 'Outbox: store the event in the same transaction as the data, publish it afterwards.'],
      insight: 'Compensation is not rollback: other people may have seen the intermediate state. Design the business process to tolerate “pending” and “cancelled”.',
      source: SOURCE,
    },
    quiz: [
      q('In a saga, how is a failure in step 3 handled?', ['The database rolls back all three services', 'Compensating actions undo steps 2 and 1', 'Nothing — it is retried forever', 'Two-phase commit aborts'], 1, 'Each earlier local transaction is reversed by an explicit compensating transaction.'),
      q('What problem does the outbox pattern solve?', ['Slow queries', 'Updating the database and publishing an event atomically', 'Service discovery', 'Too many services'], 1, 'Without it, a crash between the two steps leaves data changed with no event, or an event with no change.'),
    ],
  }),
  lesson({
    id: 'ms-resilience',
    title: 'Resilience: timeouts, retries and circuit breakers',
    summary: 'How to stop one slow dependency from taking the whole system down.',
    paragraphs: [
      'The most dangerous failure is not a crash but slowness. Callers wait, their threads and connections fill up, and they become slow too: a cascading failure. So every remote call needs a timeout, chosen from the latency you actually expect.',
      'Retries help with brief glitches but multiply load on a struggling service. Retry only idempotent operations, a small number of times, with exponential backoff and random jitter so that clients do not all retry in the same instant.',
      'A circuit breaker watches the failure rate of a dependency. When it crosses a threshold the breaker opens: calls fail immediately instead of waiting, which protects the caller and gives the dependency room to recover. After a pause it lets a few trial calls through (half-open) and closes again if they succeed. Bulkheads — separate connection pools per dependency — keep one bad dependency from exhausting everything.',
    ],
    states: [
      state('Closed', 'Normal operation: calls pass through and the breaker counts failures.', [box('a', 'Checkout', 0, 0), box('cb', 'Breaker: closed', 1, 0, { tone: 'good' }), box('b', 'Pricing', 2, 0, { tone: 'good' })], [edge('a', 'cb'), edge('cb', 'b', { tone: 'good' })]),
      state('Open', 'Pricing keeps timing out. The breaker opens: Checkout gets an instant error and uses a fallback instead of hanging.', [box('a', 'Checkout', 0, 0, { sub: 'uses cached price', tone: 'warn' }), box('cb', 'Breaker: open', 1, 0, { sub: 'fail fast', tone: 'bad' }), box('b', 'Pricing', 2, 0, { sub: 'overloaded', tone: 'bad' })], [edge('a', 'cb'), edge('cb', 'b', { label: 'blocked', tone: 'bad', dashed: true })]),
      state('Half-open', 'After a pause the breaker lets a few trial calls through. If they succeed it closes; if not it opens again.', [box('a', 'Checkout', 0, 0), box('cb', 'Breaker: half-open', 1, 0, { sub: 'trial calls', tone: 'warn' }), box('b', 'Pricing', 2, 0, { sub: 'recovering', tone: 'warn' })], [edge('a', 'cb'), edge('cb', 'b', { label: 'a few', tone: 'warn' })]),
    ],
    card: {
      points: ['Every remote call needs a timeout.', 'Retry idempotent calls only, few times, with exponential backoff and jitter.', 'Circuit breaker: closed → open (fail fast) → half-open (probe). Bulkheads isolate resources.'],
      insight: 'A fast failure is a feature. Decide in advance what each caller does when a dependency is unavailable — a default, a cached value, or a clear error.',
      source: SOURCE,
    },
    quiz: [
      q('Why add random jitter to retry delays?', ['To make logs harder to read', 'So many clients do not retry at the same moment and hit the service in waves', 'To retry faster', 'It is required by HTTP'], 1, 'Synchronised retries create load spikes exactly when the service is weakest.'),
      q('What does an open circuit breaker do?', ['Retries harder', 'Fails calls immediately without contacting the dependency', 'Restarts the dependency', 'Doubles the timeout'], 1, 'Failing fast frees the caller’s resources and stops piling load onto a failing service.'),
    ],
  }),
  lesson({
    id: 'ms-platform',
    title: 'Gateways, discovery and tracing',
    summary: 'The plumbing that makes dozens of services usable: one front door, a way to find each other, and a way to follow a request.',
    paragraphs: [
      'An API gateway is the single entry point for clients. It handles what every service would otherwise repeat — TLS, authentication, rate limiting, routing — and hides how the system is split. A backend-for-frontend is a gateway tailored to one client type, such as mobile.',
      'Service instances come and go, so addresses cannot be hard-coded. Service discovery keeps a registry of healthy instances; in Kubernetes this is built in through Services and DNS. A service mesh goes further and puts a proxy next to every instance to handle retries, timeouts, mutual TLS and traffic splitting uniformly, outside application code.',
      'One user action may touch ten services, so you need distributed tracing: a trace ID is created at the edge and passed along in headers on every call, and each service records timed spans under it. With that you can see the whole path of a request and where its time went.',
    ],
    states: [
      state('Request path', 'The gateway authenticates and routes. The trace ID created at the edge travels with every hop.', [box('c', 'Mobile app', 1, 0), box('g', 'API gateway', 1, 1, { sub: 'auth, rate limit, trace ID', tone: 'info' }), box('o', 'Orders', 0, 2, { sub: 'span 120 ms', tone: 'good' }), box('p', 'Payments', 2, 2, { sub: 'span 80 ms', tone: 'good' })], [edge('c', 'g'), edge('g', 'o'), edge('g', 'p')]),
      state('With a mesh', 'Each service gets a sidecar proxy that handles mTLS, retries and timeouts — the same way for every service.', [box('g', 'API gateway', 1, 0, { tone: 'info' }), box('o', 'Orders + proxy', 0, 1, { sub: 'mTLS, retries', tone: 'good' }), box('p', 'Payments + proxy', 2, 1, { sub: 'mTLS, retries', tone: 'good' })], [edge('g', 'o'), edge('g', 'p'), edge('o', 'p', { label: 'encrypted' })]),
    ],
    card: {
      points: ['API gateway: one entry point for auth, rate limiting and routing.', 'Service discovery finds healthy instances; a mesh adds uniform mTLS, retries and traffic control.', 'Distributed tracing: one trace ID propagated across every hop, spans per service.'],
      insight: 'Push cross-cutting concerns into the platform so each team does not reimplement them slightly differently — but adopt a mesh only when you feel that pain.',
      source: SOURCE,
    },
    quiz: [
      q('What must every service do for distributed tracing to work?', ['Log to the same file', 'Propagate the trace ID it received on its outgoing calls', 'Use the same language', 'Share a database'], 1, 'If one hop drops the context, the trace is cut in two.'),
      q('Which belongs in an API gateway rather than in each service?', ['Business rules for pricing', 'Authentication and rate limiting', 'The orders database schema', 'Domain events'], 1, 'Cross-cutting edge concerns go to the gateway; business logic stays in the services.'),
    ],
  }),
];
