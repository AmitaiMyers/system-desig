import { box, edge, lesson, q, state, store, type Lesson } from '../lesson';

const SOURCE = 'AWS documentation and the AWS Well-Architected Framework';

export const AWS_LESSONS: Lesson[] = [
  lesson({
    id: 'aws-network',
    title: 'Regions, Availability Zones and the VPC',
    summary: 'Where your resources physically live, and the private network you put them in.',
    paragraphs: [
      'A Region is a geographic area such as eu-west-1. Each Region contains several Availability Zones (AZs): separate data centers with independent power and networking, close enough for low-latency links. Spreading servers across two or three AZs is the standard way to survive a data-center failure.',
      'A VPC is your own private network inside a Region. You divide it into subnets, each living in one AZ. A public subnet has a route to an Internet Gateway, so resources in it can be reached from the internet. A private subnet has no such route; its instances reach out through a NAT Gateway but cannot be reached from outside.',
      'The usual layout: load balancers in public subnets, application servers and databases in private ones. Security groups act as per-resource firewalls that allow only the traffic you name.',
    ],
    states: [
      state('Normal', 'The load balancer sits in public subnets; app servers and the database stay private, spread over two zones.', [box('alb', 'Load balancer', 0, 0, { sub: 'public subnets', span: 3, tone: 'info' }), box('a1', 'App (AZ a)', 0, 1, { sub: 'private', tone: 'good' }), box('a2', 'App (AZ b)', 2, 1, { sub: 'private', tone: 'good' }), store('db', 'RDS primary', 0, 2, { sub: 'AZ a' }), store('sb', 'RDS standby', 2, 2, { sub: 'AZ b' })], [edge('alb', 'a1'), edge('alb', 'a2'), edge('a1', 'db'), edge('db', 'sb', { label: 'sync', dashed: true })]),
      state('AZ a fails', 'Zone a goes dark. The load balancer sends everything to zone b and the database standby is promoted.', [box('alb', 'Load balancer', 0, 0, { sub: 'public subnets', span: 3, tone: 'info' }), box('a1', 'App (AZ a)', 0, 1, { sub: '✕ down', tone: 'bad' }), box('a2', 'App (AZ b)', 2, 1, { sub: 'takes all traffic', tone: 'good' }), store('db', 'RDS primary', 0, 2, { sub: '✕ down', tone: 'bad' }), store('sb', 'New primary', 2, 2, { sub: 'promoted', tone: 'good' })], [edge('alb', 'a2', { tone: 'good' }), edge('a2', 'sb', { tone: 'good' })]),
    ],
    card: {
      points: ['Region → Availability Zones → subnets. One subnet lives in one AZ.', 'Public subnet: route to an Internet Gateway. Private subnet: outbound only, via NAT.', 'Run in at least two AZs; keep app servers and databases in private subnets.'],
      insight: 'Multi-AZ is the cheap, default resilience. Multi-Region is an expensive, deliberate decision — know which failure you are paying to survive.',
      source: SOURCE,
    },
    quiz: [
      q('What makes a subnet “public”?', ['It has a public name', 'Its route table has a route to an Internet Gateway', 'It is in the first AZ', 'It has no security group'], 1, 'Public vs private is purely a routing property.'),
      q('Your database should be reachable only by your app servers. Where does it go?', ['A public subnet with a strong password', 'A private subnet, with a security group allowing only the app servers', 'Outside the VPC', 'Next to the Internet Gateway'], 1, 'No route from the internet, plus a security group that names the app tier as the only allowed source.'),
    ],
  }),
  lesson({
    id: 'aws-compute',
    title: 'Compute: EC2, containers and Lambda',
    summary: 'Three levels of “how much of the server do I manage?”',
    paragraphs: [
      'EC2 gives you virtual machines. You choose the instance type, patch the operating system and decide how to scale. It is the most flexible option and the one with the most to operate. Auto Scaling groups add and remove instances by load.',
      'Containers package the application with its dependencies. ECS and EKS (managed Kubernetes) schedule them for you; with Fargate you do not manage the underlying machines at all and pay per task for the CPU and memory you request.',
      'Lambda runs a function in response to an event and bills per invocation and duration. There is nothing to patch and it scales to zero, but executions are limited to 15 minutes, a cold start adds latency to the first request, and at steady high load it costs more than servers that are always busy.',
    ],
    states: [
      state('EC2', 'You manage the OS, patching and scaling. Best for steady load, special hardware or full control.', [box('you', 'You manage', 0, 0, { sub: 'app + runtime + OS', span: 2, tone: 'warn' }), box('aws', 'AWS', 2, 0, { sub: 'hardware', tone: 'muted' })], []),
      state('Fargate', 'You ship a container image and declare CPU and memory. AWS runs the machines.', [box('you', 'You manage', 0, 0, { sub: 'app + image', tone: 'good' }), box('aws', 'AWS manages', 1, 0, { sub: 'OS + servers + scaling', span: 2, tone: 'muted' })], []),
      state('Lambda', 'You ship a function. It scales per request and to zero — within a 15-minute limit and with cold starts.', [box('you', 'You', 0, 0, { sub: 'function code', tone: 'good' }), box('aws', 'AWS manages', 1, 0, { sub: 'everything else', span: 2, tone: 'muted' })], []),
    ],
    card: {
      points: ['EC2: full control, you operate the OS. Auto Scaling groups scale it.', 'ECS/EKS on Fargate: you ship containers, AWS runs the hosts.', 'Lambda: event-driven functions, per-use billing, 15-minute limit, cold starts.'],
      insight: 'Choose by load shape and ops budget: spiky or rare → Lambda; steady and heavy → containers or EC2. “Serverless” moves the cost from operations to the bill.',
      source: SOURCE,
    },
    quiz: [
      q('A job runs for 40 minutes once a night. Which is NOT a fit?', ['EC2', 'A Fargate task', 'Lambda', 'A container on ECS'], 2, 'A Lambda invocation is limited to 15 minutes.'),
      q('What is a cold start?', ['A region outage', 'Extra latency when a function instance has to be created before it can serve a request', 'A database restart', 'An unpatched server'], 1, 'The runtime and your code must be loaded first. It matters for latency-sensitive, infrequently called functions.'),
    ],
  }),
  lesson({
    id: 'aws-storage',
    title: 'Storage and databases: S3, EBS, RDS, DynamoDB',
    summary: 'Pick the store by the shape of the data and the way you query it.',
    paragraphs: [
      'S3 is object storage: files of any size addressed by key, with eleven nines of durability and storage classes that trade price for retrieval speed. It is where images, video, backups and data lakes go. EBS, in contrast, is a disk attached to one EC2 instance.',
      'RDS is managed relational databases (PostgreSQL, MySQL and others): AWS handles backups, patching and Multi-AZ failover. Aurora is AWS’s own engine with a shared distributed storage layer and fast read replicas. Use these when you need joins, transactions and flexible queries.',
      'DynamoDB is a managed key/value and document store. It scales horizontally without you managing shards and gives single-digit-millisecond lookups by key — as long as you design the table around your access patterns up front. Ad-hoc queries are not its strength.',
    ],
    states: [
      state('Files & media', 'Large objects addressed by key, served through a CDN: S3.', [box('app', 'App', 0, 0), store('s3', 'S3', 1, 0, { sub: 'objects by key', tone: 'good' }), box('cdn', 'CloudFront', 2, 0, { sub: 'CDN' })], [edge('app', 's3'), edge('s3', 'cdn')]),
      state('Relational', 'Joins, transactions, changing queries: RDS or Aurora with a standby in another AZ.', [box('app', 'App', 0, 0), store('rds', 'RDS / Aurora', 1, 0, { sub: 'SQL, transactions', tone: 'good' }), store('sb', 'Standby', 2, 0, { sub: 'other AZ' })], [edge('app', 'rds'), edge('rds', 'sb', { dashed: true })]),
      state('Key lookups at scale', 'Known access patterns, huge scale, lookups by key: DynamoDB.', [box('app', 'App', 0, 0), store('ddb', 'DynamoDB', 1, 0, { sub: 'partition + sort key', span: 2, tone: 'good' })], [edge('app', 'ddb')]),
    ],
    card: {
      points: ['S3: objects by key, extremely durable, tiered by access frequency. EBS: a disk for one instance.', 'RDS/Aurora: managed SQL with Multi-AZ failover and read replicas.', 'DynamoDB: horizontally scaled key/value; model the table around known queries.'],
      insight: 'DynamoDB removes operational scaling limits by making you commit to access patterns early. If you cannot list your queries yet, start relational.',
      source: SOURCE,
    },
    quiz: [
      q('Where do user-uploaded videos belong?', ['In RDS as BLOBs', 'On each server’s EBS volume', 'In S3, with metadata in a database', 'In DynamoDB items'], 2, 'Object storage for the bytes, a database for the metadata.'),
      q('When is DynamoDB a poor choice?', ['Lookups by key at very high volume', 'When queries are ad hoc and change often', 'Session storage', 'When you need single-digit-millisecond reads'], 1, 'Its efficiency comes from designing keys and indexes for known access patterns.'),
    ],
  }),
  lesson({
    id: 'aws-iam',
    title: 'IAM: users, roles and policies',
    summary: 'Who may do what to which resource — and why services should assume roles instead of holding keys.',
    paragraphs: [
      'Every request to AWS is authenticated and then checked against policies. A policy is a JSON document listing allowed or denied actions on specific resources. An explicit deny always wins, and anything not explicitly allowed is denied.',
      'Users represent people and have long-lived credentials. Roles have no credentials of their own: a trusted party assumes the role and receives temporary credentials that expire. An EC2 instance, a Lambda function or a Kubernetes pod should get its permissions from a role, so no access keys are stored in code or config.',
      'The guiding rule is least privilege: grant the specific actions on the specific resources a workload needs, nothing broader. Wildcards like “s3:*” on “*” are how one leaked credential becomes a full breach.',
    ],
    states: [
      state('Access keys', 'A long-lived key is baked into the app. If the code or the server leaks, the key works until someone revokes it.', [box('app', 'App', 0, 0, { sub: 'key in config', tone: 'bad' }), store('s3', 'S3 bucket', 2, 0)], [edge('app', 's3', { label: 'static key', tone: 'bad' })]),
      state('IAM role', 'The app assumes a role and gets temporary credentials that rotate automatically. Nothing secret is stored.', [box('app', 'App', 0, 0, { sub: 'no stored secrets', tone: 'good' }), box('sts', 'IAM role', 1, 0, { sub: 'temporary creds', tone: 'info' }), store('s3', 'S3 bucket', 2, 0, { sub: 'only this bucket' })], [edge('app', 'sts', { label: 'assume' }), edge('sts', 's3', { tone: 'good' })]),
    ],
    card: {
      points: ['Policies list allowed actions on resources; default is deny, explicit deny wins.', 'Roles hand out temporary credentials to whoever is trusted to assume them.', 'Least privilege: specific actions on specific resources.'],
      insight: 'If an access key appears in a repository or an environment file, the design is already wrong — workloads should assume roles.',
      source: SOURCE,
    },
    quiz: [
      q('How should code on an EC2 instance get permission to read an S3 bucket?', ['Access keys in an environment variable', 'An IAM role attached to the instance', 'The root account’s keys', 'A public bucket'], 1, 'The instance role provides short-lived, automatically rotated credentials.'),
      q('One policy allows s3:GetObject; another explicitly denies it. Result?', ['Allowed', 'Denied', 'Depends on order', 'Allowed for admins'], 1, 'An explicit deny always overrides an allow.'),
    ],
  }),
  lesson({
    id: 'aws-messaging',
    title: 'Decoupling: SQS, SNS and EventBridge',
    summary: 'Queues for work, topics for fan-out, an event bus for routing.',
    paragraphs: [
      'SQS is a queue. Producers send messages; consumers poll, process and delete them. A message that is not deleted within its visibility timeout becomes visible again, so delivery is at least once and consumers must be idempotent. Messages that keep failing move to a dead-letter queue for inspection.',
      'SNS is publish/subscribe: one message published to a topic is pushed to every subscriber. The common pattern is SNS fanning out to several SQS queues, so each downstream service gets its own copy and processes it at its own pace.',
      'EventBridge is an event bus with content-based routing: rules match on fields of the event and send it to targets. It suits many event types and many consumers. Standard SQS queues do not guarantee order; FIFO queues do, at lower throughput.',
    ],
    states: [
      state('Queue (SQS)', 'One consumer group works through the queue. A spike becomes backlog instead of failure.', [box('p', 'Order service', 0, 0), box('q', 'SQS queue', 1, 0, { tone: 'info' }), box('c', 'Workers', 2, 0, { tone: 'good' }), box('dlq', 'Dead-letter queue', 1, 1, { sub: 'repeated failures', tone: 'warn' })], [edge('p', 'q'), edge('q', 'c'), edge('q', 'dlq', { dashed: true })]),
      state('Fan-out (SNS → SQS)', 'One event, three independent consumers. Each has its own queue, so a slow one does not block the others.', [box('p', 'Order placed', 1, 0, { sub: 'SNS topic', tone: 'info' }), box('q1', 'Email queue', 0, 1), box('q2', 'Inventory queue', 1, 1), box('q3', 'Analytics queue', 2, 1)], [edge('p', 'q1'), edge('p', 'q2'), edge('p', 'q3')]),
    ],
    card: {
      points: ['SQS: pull-based queue, at-least-once, visibility timeout, dead-letter queue.', 'SNS: push to all subscribers; SNS → SQS gives each consumer its own buffer.', 'EventBridge: route events by content to many targets.'],
      insight: 'Put a queue wherever two parts of the system should be able to fail or scale independently — and make every consumer safe to run twice.',
      source: SOURCE,
    },
    quiz: [
      q('A worker crashes after receiving an SQS message but before deleting it. What happens?', ['The message is lost', 'It becomes visible again after the visibility timeout and is redelivered', 'The queue stops', 'It goes straight to another region'], 1, 'That is why processing must be idempotent.'),
      q('Three services must each react to “order placed”, independently. Simplest robust setup?', ['Three consumers on one SQS queue', 'An SNS topic fanning out to three SQS queues', 'One Lambda calling the three services in a row', 'A shared database table they all poll'], 1, 'On a single queue each message goes to only one consumer. Fan-out gives each service its own copy and buffer.'),
    ],
  }),
];
