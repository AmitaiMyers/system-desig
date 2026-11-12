// Turns a simulation result into pass/fail checks, stars and a post-mortem.
// The post-mortem diagnoses what broke; it never hands out the full solution.

import { dataLossRank, tickToClock } from './simulate';
import type { DataLoss, DropCounts, Finding, Scenario, SimResult, SloCheck, TickResult, Verdict } from './types';

const TWO_STAR_BUDGET_SHARE = 0.85;
const THREE_STAR_BUDGET_SHARE = 0.7;
const HIGH_UTILIZATION = 0.8;
const OUTAGE_UTILIZATION = 50;

const DATA_LOSS_LABEL: Record<DataLoss, string> = {
  zero: 'none',
  seconds: 'a few seconds',
  hours: 'hours of data',
  all: 'everything',
};

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 10_000) return `$${(amount / 1000).toFixed(0)}k`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${Math.round(amount)}`;
}

export function formatPercent(share: number): string {
  const percent = share * 100;
  // Never round a miss up to a pass-looking number.
  return `${(Math.floor(percent * 100) / 100).toFixed(2)}%`;
}

function sloChecks(scenario: Scenario, result: SimResult): SloCheck[] {
  const { slos } = scenario;
  const checks: SloCheck[] = [
    { id: 'p99', label: 'p99 latency', target: `≤ ${slos.p99Ms} ms`, actual: `${Math.round(result.p99Ms)} ms`, pass: result.p99Ms <= slos.p99Ms },
    { id: 'success', label: 'Successful requests', target: `≥ ${formatPercent(slos.successRate)}`, actual: formatPercent(result.successRate), pass: result.successRate >= slos.successRate },
    { id: 'budget', label: 'Monthly cost', target: `≤ ${formatMoney(slos.budget)}`, actual: formatMoney(result.cost.total), pass: result.cost.total <= slos.budget },
    { id: 'dataLoss', label: 'Data loss', target: `at most: ${DATA_LOSS_LABEL[slos.maxDataLoss]}`, actual: DATA_LOSS_LABEL[result.dataLoss], pass: dataLossRank(result.dataLoss) <= dataLossRank(slos.maxDataLoss) },
  ];
  if (slos.maxQueueDelayMin !== null) {
    checks.push({ id: 'queueDelay', label: 'Background job delay', target: `≤ ${slos.maxQueueDelayMin} min`, actual: `${Math.round(result.maxQueueDelayMin)} min`, pass: result.maxQueueDelayMin <= slos.maxQueueDelayMin });
  }
  return checks;
}

const DROP_EXPLANATION: Record<keyof DropCounts, { title: string; why: string }> = {
  outage: { title: 'Total outage', why: 'Every server that could answer was gone. A single region (or data center) is a single point of failure.' },
  app: { title: 'App tier overloaded', why: 'The app servers received more work than they can process, so requests were dropped. Capacity must cover the peak — including when a server is lost.' },
  dbRead: { title: 'Database could not serve reads', why: 'More reads reached the database than its nodes can answer. Think about what could answer reads instead of the primary.' },
  dbWrite: { title: 'Database could not accept writes', why: 'Writes can only go to a primary. One primary has a hard write ceiling, and while it is down nobody can write.' },
};

function worstTick(ticks: TickResult[], key: keyof DropCounts): TickResult {
  return ticks.reduce((worst, t) => (t.dropped[key] > worst.dropped[key] ? t : worst));
}

function incidentContext(tick: TickResult): string {
  if (tick.activeIncidents.length === 0) return 'under normal traffic — no incident was active';
  return `during “${tick.activeIncidents.join('” and “')}”`;
}

function successFindings(result: SimResult): Finding[] {
  const keys = (Object.keys(result.dropped) as (keyof DropCounts)[]).filter((k) => result.dropped[k] > 0);
  keys.sort((a, b) => result.dropped[b] - result.dropped[a]);
  return keys.slice(0, 2).map((key) => {
    const tick = worstTick(result.ticks, key);
    const { title, why } = DROP_EXPLANATION[key];
    return {
      title,
      detail: `Worst at ${tickToClock(tick.tick)}: ${Math.round(tick.dropped[key]).toLocaleString()} req/s lost ${incidentContext(tick)}. ${why}`,
    };
  });
}

function latencyFindings(result: SimResult): Finding[] {
  const findings: Finding[] = [];
  if (result.remoteUserShare > 0.01) {
    findings.push({
      title: 'Users are far from your servers',
      detail: `${Math.round(result.remoteUserShare * 100)}% of users live in a region where you have no servers. Every request they make crosses an ocean (+100 ms). No amount of hardware in the wrong place fixes the speed of light.`,
    });
  }
  if (result.inlineJobLatencyMs > 0) {
    findings.push({
      title: 'Slow work runs inside the request',
      detail: `Some writes trigger heavy background work, and the user waits ${Math.round(result.inlineJobLatencyMs).toLocaleString()} ms while the app server does it. The user does not need that work finished before getting a response.`,
    });
  }
  const peak = (pick: (t: TickResult) => number) => result.ticks.reduce((worst, t) => (pick(t) > pick(worst) ? t : worst));
  const components: { name: string; pick: (t: TickResult) => number }[] = [
    { name: 'App servers', pick: (t) => t.utilization.app },
    { name: 'Database (reads)', pick: (t) => t.utilization.dbRead },
    { name: 'Database (writes)', pick: (t) => t.utilization.dbWrite },
  ];
  const hot = components.map(({ name, pick }) => {
    const tick = peak(pick);
    return { name, tick, value: pick(tick) };
  });
  // A component that is completely gone is an outage (reported under failed requests), not a hot one.
  for (const h of hot.filter((x) => x.value >= HIGH_UTILIZATION && x.value < OUTAGE_UTILIZATION)) {
    findings.push({
      title: `${h.name} ran hot`,
      detail: `Peak utilization was ${Math.round(h.value * 100)}% at ${tickToClock(h.tick.tick)} ${incidentContext(h.tick)}. Latency explodes as a component nears 100%: at 90% busy, requests wait about 10× longer than on an idle machine.`,
    });
  }
  const coldest = result.ticks.reduce((worst, t) => (t.cacheWarmth < worst.cacheWarmth ? t : worst));
  if (coldest.cacheWarmth < 0.6) {
    findings.push({
      title: 'Cold cache',
      detail: `At ${tickToClock(coldest.tick)} the cache was only ${Math.round(coldest.cacheWarmth * 100)}% warm. Every miss falls through to the database, which was sized for a warm cache.`,
    });
  }
  return findings;
}

const BUDGET_ADVICE: Record<string, string> = {
  app: 'Are requests reaching app servers that something cheaper could answer? Also compare price per request across server sizes.',
  db: 'Database nodes are the most expensive way to serve a read. What could absorb reads before they reach the database?',
  originEgress: 'Sending bytes from your own servers is the priciest bandwidth there is. Who can deliver static bytes cheaper and closer to users?',
  cdnEgress: 'At this volume a commercial CDN bill dwarfs everything else. Very large streaming companies stop renting and start owning.',
  workers: 'Workers sized for the worst spike sit idle all day. A queue lets you size for the average and absorb the spike as backlog.',
  cache: 'Cache nodes are cheap, but each one handles a huge number of lookups — you may have more than you need.',
  ownCdn: 'Owning CDN hardware has a large fixed cost. It only pays off above a certain traffic volume.',
};

function budgetFindings(result: SimResult): Finding[] {
  const top = result.cost.lines.reduce((worst, line) => (line.monthly > worst.monthly ? line : worst));
  const advice = top.id in BUDGET_ADVICE ? BUDGET_ADVICE[top.id] : 'Look for capacity you are paying for but not using.';
  return [{
    title: 'Over budget',
    detail: `Your biggest cost is “${top.label}” at ${formatMoney(top.monthly)}/month (${Math.round((top.monthly / result.cost.total) * 100)}% of the bill). ${advice}`,
  }];
}

const DATA_LOSS_FINDING: Record<DataLoss, string> = {
  zero: '',
  seconds: 'The replica was a few seconds behind when the primary died (asynchronous replication), so the last writes are gone. For money, that is not acceptable.',
  hours: 'You restored from a periodic backup. Everything written since the last backup is gone — and the restore took half an hour.',
  all: 'The only copy of the database died. There was nothing to fail over to and nothing to restore from.',
};

function buildFindings(checks: SloCheck[], result: SimResult): Finding[] {
  const failed = (id: SloCheck['id']) => checks.some((c) => c.id === id && !c.pass);
  const findings: Finding[] = [];
  if (failed('dataLoss')) findings.push({ title: 'Data was lost', detail: DATA_LOSS_FINDING[result.dataLoss] });
  if (failed('success')) findings.push(...successFindings(result));
  if (failed('p99')) findings.push(...latencyFindings(result));
  if (failed('queueDelay')) {
    findings.push({
      title: 'Background jobs piled up',
      detail: `The queue fell up to ${Math.round(result.maxQueueDelayMin)} minutes behind. Jobs arrive faster than the workers drain them. A queue absorbs a spike, but the backlog still has to be worked off.`,
    });
  }
  if (failed('budget')) findings.push(...budgetFindings(result));
  return findings;
}

export function evaluate(scenario: Scenario, result: SimResult): Verdict {
  const checks = sloChecks(scenario, result);
  const passed = checks.every((c) => c.pass);
  const budgetShare = result.cost.total / scenario.slos.budget;
  const stars = !passed ? 0 : budgetShare <= THREE_STAR_BUDGET_SHARE ? 3 : budgetShare <= TWO_STAR_BUDGET_SHARE ? 2 : 1;
  return { checks, passed, stars, findings: buildFindings(checks, result) };
}
