// Balance tests: every level must fail as given, be winnable with 3 stars,
// and reject the tempting-but-wrong shortcut it was designed to teach against.
import { describe, expect, test } from 'vitest';
import { CAMPAIGN } from '../src/content/campaign';
import { CASES } from '../src/content/cases';
import { CARDS } from '../src/content/cards';
import type { Level } from '../src/content/types';
import { evaluate } from '../src/engine/score';
import { simulate } from '../src/engine/simulate';
import type { Build } from '../src/engine/types';

type BuildChange = (initial: Build) => Build;
type Reference = { solution: BuildChange; wrong: Record<string, BuildChange> };

const fleet = (count: number) => ({ size: 'medium' as const, count });

const REFERENCE: Record<string, Reference> = {
  'hello-world': {
    solution: (i) => ({ ...i, app: fleet(1) }),
    wrong: {},
  },
  'split-the-box': {
    solution: (i) => ({ ...i, db: { ...i.db, colocated: false, size: 'medium' } }),
    wrong: { 'just buy the biggest box': (i) => ({ ...i, app: { size: 'xlarge', count: 1 } }) },
  },
  'load-balancer': {
    solution: (i) => ({ ...i, loadBalancer: true, app: fleet(5) }),
    wrong: { 'no spare server (N+0)': (i) => ({ ...i, loadBalancer: true, app: fleet(4) }) },
  },
  'cache-me': {
    solution: (i) => ({ ...i, cache: { nodes: 2 } }),
    wrong: {
      'single cache node': (i) => ({ ...i, cache: { nodes: 1 } }),
      'bigger database instead of a cache': (i) => ({ ...i, db: { ...i.db, size: 'xlarge' } }),
    },
  },
  replicas: {
    solution: (i) => ({ ...i, db: { ...i.db, size: 'large', replicas: 1 } }),
    wrong: {
      'cold standby': (i) => ({ ...i, db: { ...i.db, failover: 'cold' } }),
      'hot standby on the giant node': (i) => ({ ...i, db: { ...i.db, failover: 'hot' } }),
    },
  },
  'go-global': {
    solution: (i) => ({ ...i, cdn: 'commercial', objectStorage: true, app: fleet(15) }),
    wrong: { 'object storage without a CDN': (i) => ({ ...i, objectStorage: true }) },
  },
  'shard-it': {
    solution: (i) => ({ ...i, db: { ...i.db, size: 'medium', shards: 12, replicas: 1, shardKey: 'post_id' } }),
    wrong: { 'user_id key on small shards': (i) => ({ ...i, db: { ...i.db, size: 'medium', shards: 8, replicas: 1, shardKey: 'user_id' } }) },
  },
  queues: {
    solution: (i) => ({ ...i, app: fleet(45), queue: { enabled: true, workers: 125 } }),
    wrong: {
      'more app servers, no queue': (i) => ({ ...i, app: fleet(250) }),
      'too few workers': (i) => ({ ...i, app: fleet(45), queue: { enabled: true, workers: 60 } }),
    },
  },
  'region-down': {
    solution: (i) => ({ ...i, regions: 3, app: fleet(30), cache: { nodes: 1 }, queue: { enabled: true, workers: 35 }, db: { ...i.db, shards: 8 } }),
    wrong: { 'two regions': (i) => ({ ...i, regions: 2, app: fleet(45), cache: { nodes: 2 }, queue: { enabled: true, workers: 50 }, db: { ...i.db, shards: 12 } }) },
  },
  'case-url-shortener': {
    solution: (i) => ({ ...i, loadBalancer: true, app: fleet(45), cache: { nodes: 4 }, db: { ...i.db, size: 'medium', replicas: 2 } }),
    wrong: { 'single cache node': (i) => ({ ...i, loadBalancer: true, app: fleet(45), cache: { nodes: 1 }, db: { ...i.db, size: 'large', replicas: 2 } }) },
  },
  'case-youtube': {
    solution: (i) => ({ ...i, loadBalancer: true, app: fleet(60), cache: { nodes: 3 }, db: { ...i.db, size: 'large', replicas: 2 }, cdn: 'commercial', objectStorage: true, queue: { enabled: true, workers: 1500 } }),
    wrong: {
      'no CDN': (i) => ({ ...i, loadBalancer: true, app: fleet(60), cache: { nodes: 3 }, db: { ...i.db, size: 'large', replicas: 2 }, objectStorage: true, queue: { enabled: true, workers: 1500 } }),
      'transcode inside the request': (i) => ({ ...i, loadBalancer: true, app: fleet(400), cache: { nodes: 3 }, db: { ...i.db, size: 'large', replicas: 2 }, cdn: 'commercial', objectStorage: true }),
    },
  },
  'case-netflix': {
    solution: (i) => ({ ...i, regions: 3, loadBalancer: true, app: fleet(40), cache: { nodes: 2 }, db: { ...i.db, size: 'large', replicas: 2 }, cdn: 'own', objectStorage: true }),
    wrong: {
      'commercial CDN': (i) => ({ ...i, regions: 3, loadBalancer: true, app: fleet(40), cache: { nodes: 2 }, db: { ...i.db, size: 'large', replicas: 2 }, cdn: 'commercial', objectStorage: true }),
      'two regions': (i) => ({ ...i, regions: 2, loadBalancer: true, app: fleet(90), cache: { nodes: 2 }, db: { ...i.db, size: 'large', replicas: 2 }, cdn: 'own', objectStorage: true }),
    },
  },
};

const ALL_LEVELS: Level[] = [...CAMPAIGN, ...CASES.map((c) => c.level)];
const run = (level: Level, build: Build) => evaluate(level.scenario, simulate(build, level.scenario));

describe.each(ALL_LEVELS.map((level) => [level.id, level] as const))('level %s', (id, level) => {
  const reference = REFERENCE[id];

  test('has a reference solution', () => expect(reference).toBeDefined());
  test('fails with the initial build', () => expect(run(level, level.initialBuild).passed).toBe(false));
  test('a failed run always explains itself', () => expect(run(level, level.initialBuild).findings.length).toBeGreaterThan(0));
  test('reference solution earns 3 stars', () => expect(run(level, reference.solution(level.initialBuild)).stars).toBe(3));
  test.each(Object.entries(reference.wrong))('rejects: %s', (_name, change) => {
    expect(run(level, change(level.initialBuild)).passed).toBe(false);
  });
  test('content is well-formed', () => {
    expect(level.quiz.length).toBeGreaterThan(0);
    for (const q of level.quiz) expect(q.options[q.answerIndex]).toBeDefined();
    for (const cardId of level.cardIds) expect(CARDS.some((c) => c.id === cardId), `card ${cardId}`).toBe(true);
    for (const incident of level.scenario.incidents) expect(Number.isInteger(incident.atTick)).toBe(true);
  });
});

test('every concept card is unlocked by some level', () => {
  const used = new Set(ALL_LEVELS.flatMap((l) => l.cardIds));
  expect(CARDS.filter((c) => !used.has(c.id)).map((c) => c.id)).toEqual([]);
});

test('case studies have well-formed interview content', () => {
  for (const c of CASES) {
    expect(c.requirements.some((r) => r.good) && c.requirements.some((r) => !r.good)).toBe(true);
    for (const q of c.estimation) expect(q.options[q.answerIndex]).toBeDefined();
  }
});
