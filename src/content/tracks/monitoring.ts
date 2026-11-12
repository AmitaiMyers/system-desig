import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'Prometheus, Grafana and Datadog documentation; Google SRE Book';

export const MONITORING_LESSONS: Lesson[] = [
  lesson({
    id: 'mon-pillars',
    title: 'Metrics, logs and traces',
    summary: 'Three kinds of telemetry that answer three different questions.',
    paragraphs: [
      'Metrics are numbers sampled over time: request rate, error count, latency percentiles, CPU. They are cheap to store and aggregate, so they are what dashboards and alerts are built on. They tell you that something is wrong.',
      'Logs are timestamped records of individual events. They carry the detail a metric cannot — the exact error, the user, the parameters — and are expensive at volume. Structured logs (JSON with consistent fields) can be searched and filtered; free text mostly cannot.',
      'Traces follow one request across services as a tree of timed spans. They show where the time went and which service failed. The three are linked in practice: a metric alert tells you there is a problem, a trace shows which hop, and the logs of that hop — found by the trace ID — tell you why.',
    ],
    states: [
      state('Metrics', '“Error rate is 4% and rising.” Cheap, aggregated, the basis for alerts — but no detail.', [box('m', 'Metrics', 0, 0, { sub: 'numbers over time', tone: 'good' }), box('q', 'Is something wrong?', 1, 0, { sub: 'dashboards, alerts', span: 2 })], [edge('m', 'q')]),
      state('Traces', '“The slow part is the call from checkout to pricing.” One request, every hop, with timings.', [box('t', 'Traces', 0, 0, { sub: 'spans per request', tone: 'good' }), box('q', 'Where is it wrong?', 1, 0, { sub: 'which service, which call', span: 2 })], [edge('t', 'q')]),
      state('Logs', '“Pricing threw: connection pool exhausted.” The detailed event, found via the trace ID.', [box('l', 'Logs', 0, 0, { sub: 'events with detail', tone: 'good' }), box('q', 'Why is it wrong?', 1, 0, { sub: 'the exact error', span: 2 })], [edge('l', 'q')]),
    ],
    card: {
      points: ['Metrics: cheap aggregated numbers — is something wrong?', 'Traces: one request across services — where?', 'Logs: detailed events — why? Put the trace ID in every log line.'],
      insight: 'The value is in the links. A trace ID in your logs and exemplars on your metrics turn three separate tools into one investigation path.',
      source: SOURCE,
    },
    quiz: [
      q('Which signal should alerts normally be built on?', ['Logs', 'Metrics', 'Traces', 'Screenshots'], 1, 'Metrics are cheap, aggregated and continuous.'),
      q('What lets you jump from a slow trace to the relevant log lines?', ['The hostname', 'A trace ID included in the logs', 'The log level', 'The timestamp only'], 1, 'Correlation IDs connect the signals.'),
    ],
  }),
  lesson({
    id: 'mon-prometheus',
    title: 'Prometheus',
    summary: 'A pull-based metrics system: it scrapes your services and stores time series with labels.',
    paragraphs: [
      'Prometheus pulls. Each service exposes its current metrics on an HTTP endpoint (usually /metrics), and Prometheus scrapes every target on an interval, typically 15–30 seconds, and stores the samples in its time-series database. Software that cannot expose metrics itself gets an exporter that translates for it.',
      'Every series is a metric name plus labels, such as http_requests_total{service="api", status="500"}. Labels make the data sliceable, and they are also the main cost: each distinct combination of label values is a separate series. Putting a user ID or a raw URL in a label creates millions of series and takes the server down — the cardinality problem.',
      'You query with PromQL. Counters only go up, so you ask for their rate: rate(http_requests_total[5m]). Histograms record latency in buckets, from which histogram_quantile estimates percentiles. Alert rules are PromQL expressions; when one fires, Alertmanager groups, deduplicates and routes the notification.',
    ],
    states: [
      state('Scrape', 'Prometheus pulls /metrics from each target on a schedule and stores the samples.', [box('s1', 'Service A', 0, 0, { sub: '/metrics' }), box('s2', 'Exporter', 2, 0, { sub: 'for Postgres, nodes…' }), store('p', 'Prometheus', 1, 1, { sub: 'time-series DB', tone: 'good' }), box('am', 'Alertmanager', 2, 2, { sub: 'route, group', tone: 'info' }), box('g', 'Grafana', 0, 2, { sub: 'PromQL queries' })], [edge('p', 's1', { label: 'pull' }), edge('p', 's2', { label: 'pull' }), edge('p', 'am'), edge('g', 'p')]),
      state('Cardinality', 'A user-ID label creates one series per user. Millions of series exhaust memory.', [box('m', 'requests{user_id=…}', 0, 0, { sub: '1 series per user', span: 2, tone: 'bad' }), store('p', 'Prometheus', 2, 0, { sub: 'out of memory', tone: 'bad' })], [edge('m', 'p', { tone: 'bad' })]),
    ],
    card: {
      points: ['Pull model: Prometheus scrapes /metrics endpoints; exporters adapt other software.', 'A series = metric name + labels. High-cardinality labels (user IDs, URLs) are the classic failure.', 'PromQL: rate() on counters, histogram_quantile() for percentiles; Alertmanager routes alerts.'],
      insight: 'Label a metric with things you will aggregate by and that have few values. Anything unbounded belongs in logs or traces, not in a label.',
      source: SOURCE,
    },
    quiz: [
      q('How does Prometheus get its data?', ['Services push to it', 'It scrapes HTTP endpoints exposed by the targets', 'It reads log files', 'It queries the database'], 1, 'Pull-based: Prometheus decides when and what to scrape.'),
      q('Why is a user_id label on a metric a bad idea?', ['It is not allowed', 'Each distinct value creates a new time series — cardinality explodes', 'Labels must be numbers', 'It slows the service'], 1, 'Memory and query cost grow with the number of series.'),
    ],
  }),
  lesson({
    id: 'mon-grafana',
    title: 'Grafana',
    summary: 'The dashboard and alerting layer on top of whatever stores your data.',
    paragraphs: [
      'Grafana stores no telemetry itself. It connects to data sources — Prometheus for metrics, Loki for logs, Tempo or Jaeger for traces, and also SQL databases and cloud services — and draws their query results as panels on dashboards.',
      'Good dashboards are layered: one overview per service showing the few signals that matter, linked to detailed dashboards for digging in. Variables (service, environment, region) turn one dashboard into a reusable template instead of a copy per service. Keeping dashboards as code in version control stops them drifting.',
      'Grafana can also evaluate alert rules against its data sources and send notifications. Prometheus, Loki, Tempo and Grafana together form a complete open-source observability stack; Grafana Cloud offers the same components as a hosted service.',
    ],
    states: [
      state('Data sources', 'Grafana queries each backend in its own language and shows the results side by side.', [box('g', 'Grafana', 1, 0, { sub: 'dashboards + alerts', tone: 'good' }), store('p', 'Prometheus', 0, 1, { sub: 'metrics' }), store('l', 'Loki', 1, 1, { sub: 'logs' }), store('t', 'Tempo', 2, 1, { sub: 'traces' })], [edge('g', 'p'), edge('g', 'l'), edge('g', 't')]),
      state('Drill-down', 'From a spike on a metrics panel, jump to the traces of that moment, then to the logs of the failing span.', [box('m', 'Latency panel', 0, 0, { sub: 'spike at 14:05', tone: 'warn' }), box('t', 'Trace', 1, 0, { sub: 'slow span: pricing', tone: 'info' }), box('l', 'Logs', 2, 0, { sub: 'pool exhausted', tone: 'bad' })], [edge('m', 't'), edge('t', 'l')]),
    ],
    card: {
      points: ['Grafana visualises and alerts; the data stays in its sources (Prometheus, Loki, Tempo, SQL, cloud).', 'Use variables and layered dashboards; keep dashboards in version control.', 'Prometheus + Loki + Tempo + Grafana is the common open-source stack.'],
      insight: 'A dashboard should answer a question. If nobody can say which decision a panel supports, it is decoration — and decoration hides the panel that matters during an incident.',
      source: SOURCE,
    },
    quiz: [
      q('Where does Grafana keep your metrics?', ['In its own database', 'It does not — it queries data sources such as Prometheus', 'In the browser', 'In log files'], 1, 'Grafana is the query and visualisation layer.'),
      q('What do dashboard variables give you?', ['Faster queries', 'One reusable dashboard for many services or environments', 'More storage', 'Automatic alerts'], 1, 'A template with a service selector instead of a copy per service.'),
    ],
  }),
  lesson({
    id: 'mon-datadog',
    title: 'Datadog, and build versus buy',
    summary: 'A hosted platform for all three signals — and how it compares with running your own stack.',
    paragraphs: [
      'Datadog is a SaaS observability platform. You install its agent on hosts or as a DaemonSet in Kubernetes; the agent collects system metrics, receives your application’s custom metrics and traces, tails logs, and sends everything to Datadog, where metrics, traces (APM) and logs are stored and linked for you. Hundreds of integrations cover common databases, queues and cloud services out of the box.',
      'Everything is organised by tags such as service, env and version. Consistent tagging is what lets you move from a dashboard to the traces and logs of the same service and deployment.',
      'The trade-off against a self-hosted Prometheus and Grafana stack is the usual build-versus-buy one. Datadog costs little engineering time and a lot of money at scale: pricing follows hosts, custom metrics, ingested and indexed logs, and traced spans, and bills grow quickly if nobody watches them. The open-source stack costs little in licences and real effort to run, scale and keep reliable. OpenTelemetry, a vendor-neutral standard for instrumentation, keeps the choice reversible.',
    ],
    states: [
      state('Datadog', 'One agent per host ships metrics, traces and logs to a hosted platform. Little to operate; pay by volume.', [box('app', 'Your services', 0, 0), box('ag', 'Datadog agent', 1, 0, { sub: 'per host / DaemonSet', tone: 'info' }), box('dd', 'Datadog (SaaS)', 2, 0, { sub: 'metrics + APM + logs', tone: 'good' })], [edge('app', 'ag'), edge('ag', 'dd')]),
      state('Self-hosted', 'You run and scale every component. Low licence cost, real operational work.', [box('app', 'Your services', 0, 0), store('p', 'Prometheus + Loki + Tempo', 1, 0, { sub: 'you operate these', span: 2, tone: 'warn' }), box('g', 'Grafana', 1, 1, { tone: 'good' })], [edge('app', 'p'), edge('g', 'p')]),
      state('OpenTelemetry', 'Instrument once with a vendor-neutral SDK; the collector can send the data to either backend.', [box('app', 'Services + OTel SDK', 0, 0, { tone: 'good' }), box('c', 'OTel Collector', 1, 0, { tone: 'info' }), box('b', 'Datadog or Grafana stack', 2, 0, { sub: 'your choice' })], [edge('app', 'c'), edge('c', 'b')]),
    ],
    card: {
      points: ['Datadog: agent-based SaaS for metrics, APM and logs with many integrations; unified by tags.', 'Cost scales with hosts, custom metrics, log volume and spans.', 'Self-hosted Prometheus/Grafana: cheap licences, real operations. OpenTelemetry keeps instrumentation portable.'],
      insight: 'Observability bills are driven by cardinality and log volume, whichever vendor you choose. Decide what you will sample, drop and retain before the invoice decides for you.',
      source: SOURCE,
    },
    quiz: [
      q('What is the main trade-off of Datadog versus a self-hosted Prometheus + Grafana stack?', ['Datadog has no dashboards', 'Less to operate, but cost grows with data volume', 'Datadog cannot do traces', 'Self-hosted cannot alert'], 1, 'You trade engineering effort for a usage-based bill.'),
      q('What does OpenTelemetry give you?', ['A database for metrics', 'Vendor-neutral instrumentation, so you can change backends without re-instrumenting', 'A replacement for logs', 'A dashboard tool'], 1, 'It standardises how telemetry is produced and exported.'),
    ],
  }),
  lesson({
    id: 'mon-alerting',
    title: 'What to measure and when to page',
    summary: 'Golden signals, RED and USE; SLOs and error budgets; alerting on symptoms.',
    paragraphs: [
      'For a request-serving service, measure the four golden signals: latency, traffic, errors and saturation. RED is the same idea for services — Rate, Errors, Duration. USE is for resources such as CPUs, disks and queues: Utilization, Saturation, Errors. Use percentiles for latency: an average hides the slow requests that users actually complain about.',
      'An SLO states the target, for example “99.9% of requests succeed over 30 days”. The remaining 0.1% is the error budget: about 43 minutes of full outage a month. While budget remains you can ship; when it is nearly spent, reliability work comes first.',
      'Page a human only for symptoms users feel — the error rate or latency SLO burning down fast — not for causes such as high CPU, which may be harmless. Every page should be urgent, actionable and need a person. Alerts that are routinely ignored train people to ignore the one that matters.',
    ],
    states: [
      state('RED (services)', 'Rate, Errors, Duration: how much traffic, how much fails, how long it takes — per service.', [box('r', 'Rate', 0, 0, { sub: 'requests / s', tone: 'good' }), box('e', 'Errors', 1, 0, { sub: 'failed / s', tone: 'bad' }), box('d', 'Duration', 2, 0, { sub: 'p50, p99', tone: 'info' })], []),
      state('USE (resources)', 'Utilization, Saturation, Errors: for each resource, how busy, how much is queued, and is it failing.', [box('u', 'Utilization', 0, 0, { sub: '% busy', tone: 'good' }), box('s', 'Saturation', 1, 0, { sub: 'queue length', tone: 'warn' }), box('e', 'Errors', 2, 0, { sub: 'device errors', tone: 'bad' })], []),
      state('Symptom vs cause', 'CPU at 90% with happy users: no page. Error budget burning fast: page now.', [box('c', 'CPU 90%', 0, 0, { sub: 'cause — ticket at most', tone: 'muted' }), box('s', 'SLO burn rate high', 2, 0, { sub: 'symptom — page', tone: 'bad' }), box('p', 'On-call engineer', 2, 1, { tone: 'info' })], [edge('s', 'p', { tone: 'bad' })]),
    ],
    card: {
      points: ['Golden signals: latency, traffic, errors, saturation. RED for services, USE for resources.', 'SLO = target; error budget = allowed failure (99.9% ≈ 43 min/month).', 'Page on user-visible symptoms and fast budget burn; causes go to dashboards and tickets.'],
      insight: 'An alert is a request for a human’s attention at 3 a.m. If the right response is “wait and see”, it should not have been a page.',
      source: SOURCE,
    },
    quiz: [
      q('Why track p99 latency and not only the average?', ['Averages are harder to compute', 'The average hides the slow tail that users actually experience', 'p99 is always lower', 'Dashboards require it'], 1, 'A few very slow requests barely move the mean.'),
      q('Which of these should page the on-call engineer?', ['CPU at 85% on one node', 'The checkout error rate is burning the monthly error budget in hours', 'A disk at 60%', 'A deployment finished'], 1, 'Page on symptoms users feel; investigate causes from there.'),
    ],
  }),
];
