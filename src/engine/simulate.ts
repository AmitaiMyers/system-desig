// Deterministic traffic simulation: one simulated day in 5-minute ticks.
// Pure functions only — the UI replays the returned ticks.

import {
  APP_SIZES,
  CACHE_NODE,
  CACHE_WARM_RATE,
  CDN_HIT_RATE,
  COLOCATED_SHARE,
  DAYS_PER_MONTH,
  DB_SIZES,
  FAILOVER_DOWNTIME_TICKS,
  HOT_STANDBY_WRITE_CAPACITY,
  HOT_STANDBY_WRITE_LATENCY,
  LATENCY,
  TICKS_PER_DAY,
  TICK_SECONDS,
  WORKER,
} from './catalog';
import { computeCost } from './cost';
import type { Build, DataLoss, DropCounts, Incident, Scenario, ShardKeyOption, SimResult, SpikeScope, TickResult, Workload } from './types';

const DATA_LOSS_ORDER: DataLoss[] = ['zero', 'seconds', 'hours', 'all'];
const SATURATED_UTILIZATION = 99;
const UNIFORM_KEY: ShardKeyOption = { id: 'uniform', label: 'uniform', hotShardShare: 0, readFanout: 0, note: '' };

type LatencyClass = { ms: number; rps: number };

type SimState = {
  cacheWarmth: number;
  backlogJobs: number;
  primaryDownUntilTick: number;
  dataLoss: DataLoss;
};

type TickOutput = { result: TickResult; classes: LatencyClass[]; cdnRps: number; originStaticRps: number };

export function dataLossRank(loss: DataLoss): number {
  return DATA_LOSS_ORDER.indexOf(loss);
}

/** Daily traffic shape in [0.3, 1]: quiet night, lunch bump, evening peak at 20:00. */
export function trafficShape(tick: number): number {
  const hour = (tick / TICKS_PER_DAY) * 24;
  const bell = (center: number, width: number) => Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
  return Math.min(1, 0.3 + 0.7 * bell(20, 3) + 0.25 * bell(12, 2.5));
}

export function tickToClock(tick: number): string {
  const minutes = Math.round((tick / TICKS_PER_DAY) * 24 * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

export function weightedPercentile(classes: LatencyClass[], percentile: number): number {
  const sorted = classes.filter((c) => c.rps > 0).sort((a, b) => a.ms - b.ms);
  const total = sorted.reduce((sum, c) => sum + c.rps, 0);
  if (total === 0) return 0;
  let seen = 0;
  for (const c of sorted) {
    seen += c.rps;
    if (seen >= total * percentile) return c.ms;
  }
  return sorted[sorted.length - 1].ms;
}

function isActive(incident: Incident, tick: number): boolean {
  if (incident.kind === 'cacheNodeDown' || incident.kind === 'dbPrimaryDown') return incident.atTick === tick;
  return tick >= incident.atTick && tick < incident.atTick + incident.durationTicks;
}

function spikeMultiplier(active: Incident[], scope: SpikeScope): number {
  return active.reduce((m, i) => (i.kind === 'trafficSpike' && i.scope === scope ? m * i.multiplier : m), 1);
}

function utilization(load: number, capacity: number): number {
  if (load <= 0) return 0;
  if (capacity <= 0) return SATURATED_UTILIZATION;
  return Math.min(load / capacity, SATURATED_UTILIZATION);
}

function okShare(util: number): number {
  return util <= 1 ? 1 : 1 / util;
}

function queueingFactor(util: number): number {
  if (util >= 1) return LATENCY.maxQueueingFactor;
  return Math.min(1 / (1 - util), LATENCY.maxQueueingFactor);
}

function selectedShardKey(build: Build, workload: Workload): ShardKeyOption {
  if (build.db.shards === 1 || workload.shardKeys.length === 0) return UNIFORM_KEY;
  const key = workload.shardKeys.find((k) => k.id === build.db.shardKey);
  if (key === undefined) throw new Error(`Unknown shard key "${build.db.shardKey}"`);
  return key;
}

function effectiveFailover(build: Build): keyof typeof FAILOVER_DOWNTIME_TICKS {
  if (build.db.failover === 'hot') return 'hot';
  if (build.db.replicas > 0) return 'warm';
  if (build.db.failover === 'cold') return 'cold';
  return 'none';
}

const FAILOVER_DATA_LOSS: Record<keyof typeof FAILOVER_DOWNTIME_TICKS, DataLoss> = { hot: 'zero', warm: 'seconds', cold: 'hours', none: 'all' };

function worseLoss(a: DataLoss, b: DataLoss): DataLoss {
  return dataLossRank(a) >= dataLossRank(b) ? a : b;
}

type ShardGroup = { share: number; shardCount: number; primaryDown: boolean };
type ShardGroupLoad = ShardGroup & { readUtil: number; writeUtil: number; readOk: number; writeOk: number };

function shardGroups(build: Build, key: ShardKeyOption, hotKeyActive: boolean, primaryDown: boolean): ShardGroup[] {
  const shards = build.db.shards;
  if (shards === 1) return [{ share: 1, shardCount: 1, primaryDown }];
  const hottest = hotKeyActive ? Math.max(1 / shards, key.hotShardShare) : 1 / shards;
  return [
    { share: hottest, shardCount: 1, primaryDown },
    { share: (1 - hottest) / (shards - 1), shardCount: shards - 1, primaryDown: false },
  ];
}

function simulateTick(build: Build, workload: Workload, incidents: Incident[], tick: number, state: SimState): TickOutput {
  const active = incidents.filter((i) => isActive(i, tick));
  const has = (kind: Incident['kind']) => active.some((i) => i.kind === kind);

  // --- Incidents that change state at the moment they start ---
  const regionDown = has('regionDown');
  const healthyRegions = build.regions - (regionDown ? 1 : 0);
  if (has('cacheNodeDown') && build.cache.nodes > 0) {
    const totalNodes = build.cache.nodes * Math.max(healthyRegions, 1);
    state.cacheWarmth *= (totalNodes - 1) / totalNodes;
  }
  if (has('dbPrimaryDown')) {
    const mode = effectiveFailover(build);
    state.primaryDownUntilTick = tick + FAILOVER_DOWNTIME_TICKS[mode];
    state.dataLoss = worseLoss(state.dataLoss, FAILOVER_DATA_LOSS[mode]);
  }

  // --- Load ---
  const base = workload.peakRps * trafficShape(tick) * spikeMultiplier(active, 'all');
  const staticRps = base * workload.staticShare * spikeMultiplier(active, 'static');
  const dynamic = base * (1 - workload.staticShare);
  const writes = dynamic * (1 - workload.readRatio) * spikeMultiplier(active, 'writes');
  const reads = dynamic * workload.readRatio;
  const totalRps = staticRps + reads + writes;

  const cdnRps = build.cdn === 'none' ? 0 : staticRps * CDN_HIT_RATE;
  const originStatic = staticRps - cdnRps;
  const classes: LatencyClass[] = [{ ms: LATENCY.cdnEdge, rps: cdnRps }];
  const dropped: DropCounts = { app: 0, dbRead: 0, dbWrite: 0, outage: 0 };
  const activeIncidents = active.map((i) => i.label);

  if (healthyRegions <= 0) {
    dropped.outage = totalRps - cdnRps;
    return {
      result: {
        tick, rps: totalRps, okRps: cdnRps, p99Ms: LATENCY.cdnEdge,
        utilization: { app: SATURATED_UTILIZATION, cache: 0, dbRead: 0, dbWrite: 0, workers: 0 },
        cacheWarmth: state.cacheWarmth, queueDelayMin: 0, dropped, activeIncidents,
        served: { cdn: cdnRps, objectStorage: 0, app: 0, cache: 0, db: 0 },
        flags: { regionDown: true, appServerDown: false, primaryDown: false, hotKey: false },
      },
      classes, cdnRps, originStaticRps: 0,
    };
  }

  // --- Network: users whose region has no healthy deployment pay a cross-region penalty ---
  const localShare = workload.geo.reduce((sum, share, region) => {
    const deployed = region < build.regions;
    const down = regionDown && region === 0;
    return deployed && !down ? sum + share : sum;
  }, 0);
  const pushClass = (serverMs: number, rps: number) => {
    classes.push({ ms: LATENCY.localNetwork + serverMs, rps: rps * localShare });
    classes.push({ ms: LATENCY.localNetwork + LATENCY.remoteRegionPenalty + serverMs, rps: rps * (1 - localShare) });
  };

  // --- App tier ---
  const jobs = writes * workload.jobShare * spikeMultiplier(active, 'jobs');
  const jobsPerWrite = jobs / Math.max(writes, 1e-9);
  const inlineJobs = build.queue.enabled ? 0 : jobs;
  const appStatic = build.objectStorage ? 0 : originStatic;
  const appLoad = reads + writes + appStatic + inlineJobs * workload.jobCost;
  const serversPerRegion = build.loadBalancer ? build.app.count : 1;
  const healthyServers = Math.max(0, serversPerRegion * healthyRegions - (has('appServerDown') ? 1 : 0));
  const boxShare = build.db.colocated ? COLOCATED_SHARE : 1;
  const appUtil = utilization(appLoad, healthyServers * APP_SIZES[build.app.size].rps * boxShare);
  const appOk = okShare(appUtil);
  const appMs = (build.loadBalancer ? LATENCY.loadBalancer : 0) + LATENCY.app * queueingFactor(appUtil);
  dropped.app = (reads + writes + appStatic) * (1 - appOk);

  if (build.objectStorage) pushClass(LATENCY.objectStorage, originStatic);
  else pushClass(appMs, appStatic * appOk);

  // --- Cache ---
  const readsAtCache = reads * appOk;
  const cacheUtil = build.cache.nodes > 0 ? utilization(readsAtCache, build.cache.nodes * healthyRegions * CACHE_NODE.opsPerSec) : 0;
  const hitRate = build.cache.nodes > 0 ? workload.cacheableShare * state.cacheWarmth * okShare(cacheUtil) : 0;
  const cacheMs = build.cache.nodes > 0 ? LATENCY.cache : 0;
  pushClass(appMs + cacheMs, readsAtCache * hitRate);

  // --- Database ---
  const dbReads = readsAtCache * (1 - hitRate);
  const dbWrites = writes * appOk;
  const dbSize = DB_SIZES[build.db.colocated ? build.app.size : build.db.size];
  const dbFactor = boxShare * healthyRegions;
  const hotStandby = build.db.failover === 'hot';
  const writeCapacity = dbSize.writesPerSec * dbFactor * (hotStandby ? HOT_STANDBY_WRITE_CAPACITY : 1);
  const readCapacityPerNode = dbSize.readsPerSec * dbFactor;
  const key = selectedShardKey(build, workload);
  const fanout = build.db.shards > 1 ? key.readFanout : 0;
  const primaryDown = tick < state.primaryDownUntilTick;

  const groups: ShardGroupLoad[] = shardGroups(build, key, has('hotKey'), primaryDown).map((group) => {
    const w = dbWrites * group.share;
    const r = dbReads * ((1 - fanout) * group.share + fanout);
    const combined = utilization(w, writeCapacity) + utilization(r, readCapacityPerNode);
    const writeUtil = build.db.replicas === 0 ? combined : utilization(w, writeCapacity);
    const readUtil = build.db.replicas === 0 ? combined : utilization(r, build.db.replicas * readCapacityPerNode);
    const readsSurvivePrimaryLoss = build.db.replicas > 0;
    return {
      ...group, readUtil, writeUtil,
      writeOk: group.primaryDown ? 0 : okShare(writeUtil),
      readOk: group.primaryDown && !readsSurvivePrimaryLoss ? 0 : okShare(readUtil),
    };
  });

  const writeMsBase = LATENCY.dbWrite * (hotStandby ? HOT_STANDBY_WRITE_LATENCY : 1);
  const inlineJobMs = inlineJobLatencyMs(build, workload);
  let writesOk = 0;
  let singleShardReadsOk = 0;
  for (const g of groups) {
    const groupWritesOk = dbWrites * g.share * g.shardCount * g.writeOk;
    const groupReadsOk = dbReads * (1 - fanout) * g.share * g.shardCount * g.readOk;
    writesOk += groupWritesOk;
    singleShardReadsOk += groupReadsOk;
    const writeMs = appMs + writeMsBase * queueingFactor(g.writeUtil);
    const withInlineJob = inlineJobs > 0 ? Math.min(1, jobsPerWrite) : 0;
    pushClass(writeMs, groupWritesOk * (1 - withInlineJob));
    pushClass(writeMs + inlineJobMs, groupWritesOk * withInlineJob);
    pushClass(appMs + cacheMs + LATENCY.dbRead * queueingFactor(g.readUtil), groupReadsOk);
  }
  // Scatter-gather reads need every shard: as slow and as reliable as the worst one.
  const worstReadOk = Math.min(...groups.map((g) => g.readOk));
  const worstReadUtil = Math.max(...groups.map((g) => g.readUtil));
  const fanoutReadsOk = dbReads * fanout * worstReadOk;
  pushClass(appMs + cacheMs + LATENCY.dbRead * queueingFactor(worstReadUtil), fanoutReadsOk);

  const dbReadsOk = singleShardReadsOk + fanoutReadsOk;
  dropped.dbRead = dbReads - dbReadsOk;
  dropped.dbWrite = dbWrites - writesOk;

  // --- Background jobs ---
  let queueDelayMin = 0;
  let workerUtil = 0;
  if (build.queue.enabled && workload.jobShare > 0) {
    const drainPerSec = (build.queue.workers * healthyRegions * WORKER.unitsPerSec) / workload.jobCost;
    const enqueuedPerSec = writesOk * jobsPerWrite;
    state.backlogJobs = Math.max(0, state.backlogJobs + (enqueuedPerSec - drainPerSec) * TICK_SECONDS);
    workerUtil = utilization(enqueuedPerSec, drainPerSec);
    queueDelayMin = drainPerSec > 0 ? state.backlogJobs / drainPerSec / 60 : state.backlogJobs > 0 ? 24 * 60 : 0;
  }

  // --- Cache re-warms only as fast as the database can serve the misses ---
  const dbReadSuccess = dbReads > 0 ? dbReadsOk / dbReads : 1;
  const warmthBefore = state.cacheWarmth;
  state.cacheWarmth += (1 - state.cacheWarmth) * CACHE_WARM_RATE * dbReadSuccess;

  const okRps = classes.reduce((sum, c) => sum + c.rps, 0);
  return {
    result: {
      tick, rps: totalRps, okRps, p99Ms: weightedPercentile(classes, 0.99),
      utilization: {
        app: appUtil, cache: cacheUtil,
        dbRead: Math.max(...groups.map((g) => g.readUtil)),
        dbWrite: Math.max(...groups.map((g) => g.writeUtil)),
        workers: workerUtil,
      },
      cacheWarmth: warmthBefore, queueDelayMin, dropped, activeIncidents,
      served: {
        cdn: cdnRps,
        objectStorage: build.objectStorage ? originStatic : 0,
        app: build.objectStorage ? 0 : appStatic * appOk,
        cache: readsAtCache * hitRate,
        db: dbReadsOk + writesOk,
      },
      flags: { regionDown, appServerDown: has('appServerDown'), primaryDown, hotKey: has('hotKey') && build.db.shards > 1 },
    },
    classes, cdnRps, originStaticRps: originStatic,
  };
}

/** Extra latency a write pays when its background job runs inside the request. */
export function inlineJobLatencyMs(build: Build, workload: Workload): number {
  if (build.queue.enabled || workload.jobShare === 0) return 0;
  return Math.min(workload.jobCost * LATENCY.inlineJobPerUnit, LATENCY.inlineJobCap);
}

function monthlyGb(rps: number, kb: number): number {
  return ((rps * kb * TICK_SECONDS) / 1e6) * DAYS_PER_MONTH;
}

export function simulate(build: Build, scenario: Scenario): SimResult {
  const { workload, incidents } = scenario;
  const state: SimState = { cacheWarmth: 1, backlogJobs: 0, primaryDownUntilTick: -1, dataLoss: 'zero' };
  const ticks: TickResult[] = [];
  const allClasses: LatencyClass[] = [];
  const dropped: DropCounts = { app: 0, dbRead: 0, dbWrite: 0, outage: 0 };
  let cdnGb = 0;
  let originGb = 0;

  for (let tick = 0; tick < TICKS_PER_DAY; tick++) {
    const out = simulateTick(build, workload, incidents, tick, state);
    ticks.push(out.result);
    allClasses.push(...out.classes);
    // With a CDN, every static byte reaches users through it (misses are fetched from origin once, then cached).
    const staticGb = monthlyGb(out.cdnRps + out.originStaticRps, workload.staticKb);
    if (build.cdn === 'none') originGb += staticGb;
    else cdnGb += staticGb;
    for (const k of Object.keys(dropped) as (keyof DropCounts)[]) dropped[k] += out.result.dropped[k];
  }

  const totalRps = ticks.reduce((sum, t) => sum + t.rps, 0);
  const okRps = ticks.reduce((sum, t) => sum + t.okRps, 0);
  const deployedShare = workload.geo.slice(0, build.regions).reduce((sum, share) => sum + share, 0);

  return {
    ticks,
    p50Ms: weightedPercentile(allClasses, 0.5),
    p99Ms: weightedPercentile(allClasses, 0.99),
    successRate: okRps / totalRps,
    dataLoss: state.dataLoss,
    maxQueueDelayMin: Math.max(...ticks.map((t) => t.queueDelayMin)),
    remoteUserShare: 1 - deployedShare,
    inlineJobLatencyMs: inlineJobLatencyMs(build, workload),
    dropped,
    cost: computeCost(build, workload, { cdnGb, originGb }),
  };
}
