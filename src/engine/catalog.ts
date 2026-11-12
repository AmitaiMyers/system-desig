// Reference numbers for every component. Rough real-world figures, rounded for play.
// All tunable numbers of the simulation live in this one file.

import type { SizeId } from './types';

export const SIZE_ORDER: SizeId[] = ['small', 'medium', 'large', 'xlarge'];

/** App/web server: requests per second and monthly price. Bigger boxes cost more per request. */
export const APP_SIZES: Record<SizeId, { rps: number; monthly: number }> = {
  small: { rps: 400, monthly: 40 },
  medium: { rps: 2000, monthly: 150 },
  large: { rps: 6000, monthly: 520 },
  xlarge: { rps: 14000, monthly: 1800 },
};

/** Database node: reads/s, writes/s and monthly price. */
export const DB_SIZES: Record<SizeId, { readsPerSec: number; writesPerSec: number; monthly: number }> = {
  small: { readsPerSec: 1000, writesPerSec: 300, monthly: 80 },
  medium: { readsPerSec: 4000, writesPerSec: 1200, monthly: 300 },
  large: { readsPerSec: 12000, writesPerSec: 4000, monthly: 1100 },
  xlarge: { readsPerSec: 30000, writesPerSec: 10000, monthly: 4200 },
};

export const LIMITS = {
  maxAppServers: 400,
  maxCacheNodes: 20,
  maxReplicas: 8,
  maxShards: 64,
  maxWorkers: 3000,
  maxRegions: 3,
};

export const CACHE_NODE = { opsPerSec: 100_000, monthly: 120 };
export const LOAD_BALANCER = { monthly: 25 };
export const QUEUE = { monthly: 30 };
export const GEO_ROUTING = { monthly: 50 };
/** A worker is a medium app server dedicated to background jobs. */
export const WORKER = { unitsPerSec: APP_SIZES.medium.rps, monthly: APP_SIZES.medium.monthly };
export const COLD_BACKUP = { monthlyPerShard: 20 };

export const OBJECT_STORAGE = { monthlyPerGb: 0.023 };
export const EGRESS = {
  originPerGb: 0.09,
  commercialCdnPerGb: 0.03,
  ownCdnPerGb: 0.004,
  ownCdnFixedMonthly: 60_000,
};

/** Share of static requests a CDN serves from the edge. */
export const CDN_HIT_RATE = 0.95;

/** App and DB share one box: each gets this share of the machine. */
export const COLOCATED_SHARE = 0.4;
/** Hot standby = synchronous writes to two nodes. */
export const HOT_STANDBY_WRITE_CAPACITY = 0.8;
export const HOT_STANDBY_WRITE_LATENCY = 1.5;

/** Base latencies in milliseconds. */
export const LATENCY = {
  localNetwork: 20,
  remoteRegionPenalty: 100,
  cdnEdge: 15,
  loadBalancer: 1,
  app: 15,
  cache: 1,
  dbRead: 5,
  dbWrite: 10,
  objectStorage: 40,
  /** Milliseconds of work per job unit when a job runs inside the request. */
  inlineJobPerUnit: 15,
  inlineJobCap: 10_000,
  /** A saturated component is at most this many times slower than idle. */
  maxQueueingFactor: 20,
};

export const TICKS_PER_DAY = 288;
export const TICK_SECONDS = 300;
export const DAYS_PER_MONTH = 30;

/** Ticks of database write outage after the primary dies, by effective failover mode. */
export const FAILOVER_DOWNTIME_TICKS = { hot: 0, warm: 1, cold: 6, none: TICKS_PER_DAY };

/** Share of the missing cache content that is re-filled per tick (when the DB can serve the misses). */
export const CACHE_WARM_RATE = 0.15;
