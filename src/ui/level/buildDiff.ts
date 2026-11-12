// Human-readable list of what changed between two builds ("since last run").
import type { Build } from '../../engine/types';

type Field = { label: string; read: (build: Build) => string | number | boolean };

const FIELDS: Field[] = [
  { label: 'Regions', read: (b) => b.regions },
  { label: 'CDN', read: (b) => b.cdn },
  { label: 'Load balancer', read: (b) => b.loadBalancer },
  { label: 'Server size', read: (b) => b.app.size },
  { label: 'Servers', read: (b) => (b.loadBalancer ? b.app.count : 1) },
  { label: 'Cache nodes', read: (b) => b.cache.nodes },
  { label: 'Dedicated database', read: (b) => !b.db.colocated },
  { label: 'DB size', read: (b) => (b.db.colocated ? b.app.size : b.db.size) },
  { label: 'Replicas', read: (b) => b.db.replicas },
  { label: 'Standby', read: (b) => b.db.failover },
  { label: 'Shards', read: (b) => b.db.shards },
  { label: 'Shard key', read: (b) => (b.db.shards > 1 ? b.db.shardKey : 'n/a') },
  { label: 'Object storage', read: (b) => b.objectStorage },
  { label: 'Queue', read: (b) => b.queue.enabled },
  { label: 'Workers', read: (b) => (b.queue.enabled ? b.queue.workers : 0) },
];

function show(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  return typeof value === 'number' ? value.toLocaleString() : value;
}

export function describeChanges(before: Build, after: Build): string[] {
  return FIELDS.filter((field) => field.read(before) !== field.read(after)).map((field) => {
    const to = field.read(after);
    return typeof to === 'boolean' ? `${field.label} ${show(to)}` : `${field.label} ${show(field.read(before))} → ${show(to)}`;
  });
}
