// Core domain types for the simulation engine. No React, no I/O.

export type SizeId = 'small' | 'medium' | 'large' | 'xlarge';
export type FailoverMode = 'none' | 'cold' | 'hot';
export type CdnMode = 'none' | 'commercial' | 'own';

/** The architecture the player builds. Counts are per region. */
export type Build = {
  regions: number;
  loadBalancer: boolean;
  app: { size: SizeId; count: number };
  cache: { nodes: number };
  db: {
    /** Database runs on the same box as the app server (single-server design). */
    colocated: boolean;
    size: SizeId;
    replicas: number;
    shards: number;
    shardKey: string;
    failover: FailoverMode;
  };
  cdn: CdnMode;
  objectStorage: boolean;
  queue: { enabled: boolean; workers: number };
};

export type ShardKeyOption = {
  id: string;
  label: string;
  /** Share of DB traffic that lands on the hottest shard while a hot-key incident is active. */
  hotShardShare: number;
  /** Share of reads that must query every shard (scatter-gather). */
  readFanout: number;
  note: string;
};

export type Workload = {
  dau: number;
  peakRps: number;
  /** Share of dynamic requests that are reads. */
  readRatio: number;
  /** Share of all requests that are static assets / media. */
  staticShare: number;
  /** Average size of one static response, in KB. */
  staticKb: number;
  /** Share of reads that can be answered from a cache. */
  cacheableShare: number;
  /** Share of writes that trigger heavy background work. */
  jobShare: number;
  /** Cost of one job, measured in "normal request" units of app-server work. */
  jobCost: number;
  /** Share of users per geographic region. Regions are deployed in this order. */
  geo: [number, number, number];
  /** Media/object data at rest, in GB. */
  dataGb: number;
  shardKeys: ShardKeyOption[];
};

export type SpikeScope = 'all' | 'static' | 'writes' | 'jobs';

export type Incident =
  | { kind: 'trafficSpike'; atTick: number; durationTicks: number; multiplier: number; scope: SpikeScope; label: string }
  | { kind: 'appServerDown'; atTick: number; durationTicks: number; label: string }
  | { kind: 'cacheNodeDown'; atTick: number; label: string }
  | { kind: 'dbPrimaryDown'; atTick: number; label: string }
  | { kind: 'hotKey'; atTick: number; durationTicks: number; label: string }
  | { kind: 'regionDown'; atTick: number; durationTicks: number; label: string };

/** Ordered from best to worst. */
export type DataLoss = 'zero' | 'seconds' | 'hours' | 'all';

export type Slos = {
  p99Ms: number;
  successRate: number;
  budget: number;
  maxDataLoss: DataLoss;
  /** null when the level has no background jobs. */
  maxQueueDelayMin: number | null;
};

export type Scenario = {
  workload: Workload;
  incidents: Incident[];
  slos: Slos;
};

export type ComponentId = 'cdn' | 'objectStorage' | 'loadBalancer' | 'app' | 'cache' | 'db' | 'queue' | 'workers' | 'regions';

export type TickResult = {
  tick: number;
  rps: number;
  okRps: number;
  p99Ms: number;
  /** load / capacity per component; 0 when the component is absent. */
  utilization: { app: number; cache: number; dbRead: number; dbWrite: number; workers: number };
  cacheWarmth: number;
  queueDelayMin: number;
  /** Requests per second lost at each component during this tick. */
  dropped: DropCounts;
  activeIncidents: string[];
};

export type DropCounts = { app: number; dbRead: number; dbWrite: number; outage: number };

export type CostLine = { id: string; label: string; monthly: number };

export type SimResult = {
  ticks: TickResult[];
  p50Ms: number;
  p99Ms: number;
  successRate: number;
  dataLoss: DataLoss;
  maxQueueDelayMin: number;
  remoteUserShare: number;
  inlineJobLatencyMs: number;
  dropped: DropCounts;
  cost: { lines: CostLine[]; total: number };
};

export type SloCheck = { id: 'p99' | 'success' | 'budget' | 'dataLoss' | 'queueDelay'; label: string; target: string; actual: string; pass: boolean };

export type Finding = { title: string; detail: string };

export type Verdict = {
  checks: SloCheck[];
  passed: boolean;
  /** 0 when failed, otherwise 1-3. */
  stars: number;
  findings: Finding[];
};
