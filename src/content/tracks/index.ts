// Every subject of the Learn tab. System design keeps its multi-section topics and gains the
// distributed-systems lessons; the other subjects are made of short lessons.
import type { Lesson } from '../lesson';
import { SYSTEM_DESIGN_TOPICS } from '../topics';
import type { ConceptCard, Topic, Track } from '../types';
import { AWS_LESSONS } from './aws';
import { DISTRIBUTED_LESSONS } from './distributed';
import { KAFKA_LESSONS } from './kafka';
import { KUBERNETES_LESSONS } from './kubernetes';
import { MICROSERVICES_LESSONS } from './microservices';
import { MONITORING_LESSONS } from './monitoring';
import { POSTGRESQL_LESSONS } from './postgresql';
import { PYTORCH_LESSONS } from './pytorch';
import { REDIS_LESSONS } from './redis';

const topicsOf = (lessons: Lesson[]): Topic[] => lessons.map((l) => l.topic);

export const TRACKS: Track[] = [
  { id: 'system-design', title: 'System design', summary: 'Scaling, data, caching, delivery, resilience, distributed systems and the interview itself.', topics: [...SYSTEM_DESIGN_TOPICS, ...topicsOf(DISTRIBUTED_LESSONS)] },
  { id: 'aws', title: 'AWS', summary: 'The building blocks a backend engineer uses most: networking, compute, storage, identity and messaging.', topics: topicsOf(AWS_LESSONS) },
  { id: 'microservices', title: 'Microservices', summary: 'Boundaries, communication, data ownership and staying up when a dependency does not.', topics: topicsOf(MICROSERVICES_LESSONS) },
  { id: 'kubernetes', title: 'Kubernetes', summary: 'How the control loop keeps your containers running, reachable, configured and scaled.', topics: topicsOf(KUBERNETES_LESSONS) },
  { id: 'postgresql', title: 'PostgreSQL', summary: 'MVCC, indexes, the query planner, isolation levels and replication.', topics: topicsOf(POSTGRESQL_LESSONS) },
  { id: 'redis', title: 'Redis', summary: 'Data structures, persistence, clustering, caching patterns and what else it is good for.', topics: topicsOf(REDIS_LESSONS) },
  { id: 'kafka', title: 'Kafka', summary: 'The log, partitions, consumer groups, replication and delivery guarantees.', topics: topicsOf(KAFKA_LESSONS) },
  { id: 'pytorch', title: 'PyTorch', summary: 'Tensors, autograd, the training loop, data loading and making it fast.', topics: topicsOf(PYTORCH_LESSONS) },
  { id: 'monitoring', title: 'Monitoring', summary: 'Metrics, logs and traces; Prometheus, Grafana and Datadog; what to alert on.', topics: topicsOf(MONITORING_LESSONS) },
];

export const TOPICS: Topic[] = TRACKS.flatMap((track) => track.topics);

export const LESSON_CARDS: ConceptCard[] = [
  DISTRIBUTED_LESSONS, AWS_LESSONS, MICROSERVICES_LESSONS, KUBERNETES_LESSONS, POSTGRESQL_LESSONS, REDIS_LESSONS, KAFKA_LESSONS, PYTORCH_LESSONS, MONITORING_LESSONS,
].flatMap((lessons) => lessons.map((l) => l.card));
