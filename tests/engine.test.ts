import { describe, expect, test } from 'vitest';
import { SINGLE_BOX } from '../src/content/campaign';
import { APP_SIZES, TICKS_PER_DAY } from '../src/engine/catalog';
import { evaluate } from '../src/engine/score';
import { simulate, tickToClock, trafficShape, weightedPercentile } from '../src/engine/simulate';
import type { Build, Incident, Scenario, Workload } from '../src/engine/types';

const WORKLOAD: Workload = {
  dau: 1, peakRps: 1000, readRatio: 0.9, staticShare: 0, staticKb: 0, cacheableShare: 0.9,
  jobShare: 0, jobCost: 0, geo: [1, 0, 0], dataGb: 0, shardKeys: [],
};
const BUILD: Build = { ...SINGLE_BOX, loadBalancer: true, app: { size: 'medium', count: 2 }, db: { ...SINGLE_BOX.db, colocated: false, size: 'large' } };
const scenario = (workload: Partial<Workload> = {}, incidents: Incident[] = []): Scenario => ({
  workload: { ...WORKLOAD, ...workload },
  incidents,
  slos: { p99Ms: 200, successRate: 0.999, budget: 1e9, maxDataLoss: 'zero', maxQueueDelayMin: null },
});

describe('traffic', () => {
  test('shape stays within [0.3, 1] and peaks in the evening', () => {
    const shape = Array.from({ length: TICKS_PER_DAY }, (_, t) => trafficShape(t));
    expect(Math.min(...shape)).toBeGreaterThanOrEqual(0.3);
    expect(Math.max(...shape)).toBeLessThanOrEqual(1);
    expect(tickToClock(shape.indexOf(Math.max(...shape))).slice(0, 2)).toBe('19');
  });
  test('weighted percentile', () => {
    const classes = [{ ms: 10, rps: 98 }, { ms: 500, rps: 2 }];
    expect(weightedPercentile(classes, 0.5)).toBe(10);
    expect(weightedPercentile(classes, 0.99)).toBe(500);
  });
});

describe('simulate', () => {
  test('a comfortably sized system serves everything', () => {
    const r = simulate(BUILD, scenario());
    expect(r.successRate).toBe(1);
    expect(r.dataLoss).toBe('zero');
  });
  test('an overloaded app tier drops the excess', () => {
    const r = simulate(BUILD, scenario({ peakRps: 2 * 2 * APP_SIZES.medium.rps }));
    const peak = r.ticks[240];
    expect(peak.okRps / peak.rps).toBeCloseTo(0.5, 2);
    expect(r.dropped.app).toBeGreaterThan(0);
  });
  test('extra servers do nothing without a load balancer', () => {
    const noLb = simulate({ ...BUILD, loadBalancer: false, app: { size: 'medium', count: 5 } }, scenario({ peakRps: 6000 }));
    expect(noLb.successRate).toBeLessThan(1);
  });
  test('latency rises as utilization approaches 100%', () => {
    const calm = simulate(BUILD, scenario({ peakRps: 1000 }));
    const busy = simulate(BUILD, scenario({ peakRps: 3800 }));
    expect(busy.p99Ms).toBeGreaterThan(calm.p99Ms * 2);
  });
  test('cache absorbs cacheable reads', () => {
    const noCache = simulate(BUILD, scenario()).ticks[240].utilization.dbRead;
    const cached = simulate({ ...BUILD, cache: { nodes: 1 } }, scenario()).ticks[240].utilization.dbRead;
    expect(cached).toBeLessThan(noCache * 0.5);
  });
  test('losing one of many cache nodes hurts less than losing the only one', () => {
    const flush: Incident[] = [{ kind: 'cacheNodeDown', atTick: 240, label: 'flush' }];
    const warmth = (nodes: number) => simulate({ ...BUILD, cache: { nodes } }, scenario({}, flush)).ticks[240].cacheWarmth;
    expect(warmth(1)).toBe(0);
    expect(warmth(4)).toBe(0.75);
  });
  test.each([
    ['none', 0, 'all'],
    ['cold', 0, 'hours'],
    ['none', 1, 'seconds'],
    ['hot', 0, 'zero'],
  ] as const)('primary failure with failover=%s replicas=%i loses: %s', (failover, replicas, loss) => {
    const down: Incident[] = [{ kind: 'dbPrimaryDown', atTick: 100, label: 'down' }];
    const r = simulate({ ...BUILD, db: { ...BUILD.db, failover, replicas } }, scenario({}, down));
    expect(r.dataLoss).toBe(loss);
  });
  test('reads survive a primary failure when replicas exist', () => {
    const down: Incident[] = [{ kind: 'dbPrimaryDown', atTick: 100, label: 'down' }];
    const r = simulate({ ...BUILD, db: { ...BUILD.db, replicas: 1 } }, scenario({}, down));
    expect(r.dropped.dbRead).toBe(0);
    expect(r.dropped.dbWrite).toBeGreaterThan(0);
  });
  test('sharding multiplies write capacity', () => {
    const heavy = scenario({ peakRps: 20_000, readRatio: 0.5, shardKeys: [{ id: 'user_id', label: '', hotShardShare: 0, readFanout: 0, note: '' }] });
    const big = { ...BUILD, app: { size: 'medium' as const, count: 20 } };
    expect(simulate(big, heavy).dropped.dbWrite).toBeGreaterThan(0);
    expect(simulate({ ...big, db: { ...big.db, shards: 4, replicas: 1 } }, heavy).dropped.dbWrite).toBe(0);
  });
  test('an unknown shard key fails fast', () => {
    const keyed = scenario({ shardKeys: [{ id: 'a', label: '', hotShardShare: 0, readFanout: 0, note: '' }] });
    expect(() => simulate({ ...BUILD, db: { ...BUILD.db, shards: 2, shardKey: 'nope' } }, keyed)).toThrow('Unknown shard key');
  });
  test('a queue turns a job spike into backlog instead of failure', () => {
    const jobs = scenario({ jobShare: 0.5, jobCost: 200 });
    const inline = simulate(BUILD, jobs);
    const queued = simulate({ ...BUILD, queue: { enabled: true, workers: 1 } }, jobs);
    expect(inline.successRate).toBeLessThan(1);
    expect(queued.successRate).toBe(1);
    expect(queued.maxQueueDelayMin).toBeGreaterThan(0);
  });
  test('a CDN keeps static traffic off the origin and is cheaper per GB', () => {
    const media = scenario({ staticShare: 0.8, staticKb: 1000 });
    const origin = simulate(BUILD, media);
    const cdn = simulate({ ...BUILD, cdn: 'commercial' }, media);
    expect(cdn.ticks[240].utilization.app).toBeLessThan(origin.ticks[240].utilization.app);
    expect(cdn.cost.total).toBeLessThan(origin.cost.total);
  });
  test('a region outage takes down a single-region system but not a multi-region one', () => {
    const outage: Incident[] = [{ kind: 'regionDown', atTick: 100, durationTicks: 6, label: 'region' }];
    expect(simulate(BUILD, scenario({}, outage)).dropped.outage).toBeGreaterThan(0);
    expect(simulate({ ...BUILD, regions: 2 }, scenario({}, outage)).successRate).toBe(1);
  });
  test('users without a nearby region pay a latency penalty', () => {
    const global = scenario({ geo: [0.5, 0.3, 0.2] });
    expect(simulate(BUILD, global).p99Ms - simulate({ ...BUILD, regions: 3 }, global).p99Ms).toBeGreaterThanOrEqual(100);
  });
});

describe('evaluate', () => {
  test('stars reward staying well under budget', () => {
    const s = scenario();
    const result = simulate(BUILD, s);
    const withBudget = (budget: number) => evaluate({ ...s, slos: { ...s.slos, budget } }, result);
    expect(withBudget(result.cost.total / 0.6).stars).toBe(3);
    expect(withBudget(result.cost.total / 0.8).stars).toBe(2);
    expect(withBudget(result.cost.total / 0.95).stars).toBe(1);
    expect(withBudget(result.cost.total * 0.9).passed).toBe(false);
  });
});
