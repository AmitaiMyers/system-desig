// Describes the architecture diagram: which nodes exist, what they say, and where they sit.
import type { Feature } from '../../content/types';
import { APP_SIZES } from '../../engine/catalog';
import type { Build, SimResult, TickResult } from '../../engine/types';
import type { IconName } from '../primitives/Icon';

export type NodeId = 'regions' | 'cdn' | 'loadBalancer' | 'app' | 'queue' | 'cache' | 'db' | 'objectStorage';

export type DiagramNode = {
  id: NodeId;
  icon: IconName;
  name: string;
  summary: string;
  /** false = not part of the build yet (shown as an "add" placeholder). */
  present: boolean;
  editable: boolean;
};

/** Rows of the diagram, top to bottom: a main-path node and an optional side node. */
export const DIAGRAM_ROWS: { main: NodeId; side: NodeId | null }[] = [
  { main: 'cdn', side: null },
  { main: 'loadBalancer', side: null },
  { main: 'app', side: 'queue' },
  { main: 'cache', side: null },
  { main: 'db', side: 'objectStorage' },
];

const DB_FEATURES: Feature[] = ['splitDb', 'dbSize', 'replicas', 'failover', 'shards'];
const CDN_LABEL = { none: 'Off', commercial: 'Commercial CDN', own: 'Own CDN appliances' };

function plural(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;
}

function dbSummary(build: Build): string {
  const { db } = build;
  if (db.colocated) return 'Runs on the app server';
  const parts = [`${db.shards > 1 ? `${db.shards} shards × ` : ''}${db.size} primary`];
  if (db.replicas > 0) parts.push(`${plural(db.replicas, 'replica')}${db.shards > 1 ? ' each' : ''}`);
  if (db.failover !== 'none') parts.push(`${db.failover} standby`);
  return parts.join(' + ');
}

export function describeNodes(build: Build, unlocked: Feature[]): DiagramNode[] {
  const can = (feature: Feature) => unlocked.includes(feature);
  const servers = build.loadBalancer ? build.app.count : 1;
  const nodes: DiagramNode[] = [
    { id: 'regions', icon: 'globe', name: 'Regions', summary: build.regions === 1 ? '1 region' : `${build.regions} regions — counts below are per region`, present: true, editable: can('regions') },
    { id: 'cdn', icon: 'bolt', name: 'CDN', summary: CDN_LABEL[build.cdn], present: build.cdn !== 'none', editable: can('cdn') },
    { id: 'loadBalancer', icon: 'balancer', name: 'Load balancer', summary: build.loadBalancer ? 'Spreads traffic, skips dead servers' : 'Off', present: build.loadBalancer, editable: can('loadBalancer') },
    {
      id: 'app', icon: 'server', name: build.db.colocated ? 'Server (app + database)' : 'App servers',
      summary: `${servers} × ${build.app.size} (${(servers * APP_SIZES[build.app.size].rps).toLocaleString()} req/s)`,
      present: true, editable: can('appSize') || can('loadBalancer'),
    },
    { id: 'queue', icon: 'queue', name: 'Queue + workers', summary: build.queue.enabled ? plural(build.queue.workers, 'worker') : 'Off', present: build.queue.enabled, editable: can('queue') },
    { id: 'cache', icon: 'cache', name: 'Cache', summary: build.cache.nodes > 0 ? plural(build.cache.nodes, 'node') : 'Off', present: build.cache.nodes > 0, editable: can('cache') },
    { id: 'db', icon: 'database', name: 'Database', summary: dbSummary(build), present: !build.db.colocated, editable: DB_FEATURES.some(can) },
    { id: 'objectStorage', icon: 'bucket', name: 'Object storage', summary: build.objectStorage ? 'Holds images & video' : 'Off', present: build.objectStorage, editable: can('objectStorage') },
  ];
  return nodes.filter((node) => node.present || node.editable);
}

/** Load / capacity of a node in one tick; null for nodes without a capacity limit in this model. */
export function nodeUtilization(id: NodeId, tick: TickResult): number | null {
  switch (id) {
    case 'app': return tick.utilization.app;
    case 'cache': return tick.utilization.cache;
    case 'db': return Math.max(tick.utilization.dbRead, tick.utilization.dbWrite);
    case 'queue': return tick.utilization.workers;
    case 'regions':
    case 'cdn':
    case 'loadBalancer':
    case 'objectStorage':
      return null;
  }
}

/** Highest load of a node over a whole (incident-free) day: the "headroom" shown while building. */
export function peakUtilization(id: NodeId, baseline: SimResult): number | null {
  const perTick = baseline.ticks.map((tick) => nodeUtilization(id, tick));
  if (perTick.some((value) => value === null)) return null;
  return Math.max(...(perTick as number[]));
}

const WARM_ENOUGH = 0.95;

/** A short label for what is wrong with a node right now, or null when nothing is. */
export function nodeTrouble(id: NodeId, tick: TickResult): string | null {
  switch (id) {
    case 'regions': return tick.flags.regionDown ? 'Region 1 offline' : null;
    case 'app': return tick.flags.appServerDown ? 'A server is down' : null;
    case 'cache': return tick.cacheWarmth < WARM_ENOUGH ? `Only ${Math.round(tick.cacheWarmth * 100)}% warm` : null;
    case 'db': return tick.flags.primaryDown ? 'Primary down — failing over' : tick.flags.hotKey ? 'One shard is hot' : null;
    case 'queue': return tick.queueDelayMin >= 1 ? `${Math.round(tick.queueDelayMin)} min behind` : null;
    case 'cdn':
    case 'loadBalancer':
    case 'objectStorage':
      return null;
  }
}
