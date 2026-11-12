// Interactive diagrams for caching, delivery, queues, resilience and estimation.
import { useState } from 'react';
import { EGRESS, LATENCY, WORKER } from '../../engine/catalog';
import { formatMoney } from '../../engine/score';
import { Segmented, Slider, Stepper, Switch } from '../primitives/controls';
import { Arrow, Box, Cyl, Frame, Lab, Meter, Note, toneForLoad, type Tone } from './kit';

const CACHE = { readsPerSec: 10_000, cacheableShare: 0.9, dbReadsPerSec: 4000 };

export function CacheLab() {
  const [nodes, setNodes] = useState(1);
  const [restarted, setRestarted] = useState(false);
  const warmShare = nodes === 0 ? 0 : restarted ? (nodes - 1) / nodes : 1;
  const hitRate = CACHE.cacheableShare * warmShare;
  const dbReads = CACHE.readsPerSec * (1 - hitRate);
  const dbLoad = dbReads / CACHE.dbReadsPerSec;
  const readout = `${Math.round(hitRate * 100)}% of reads are answered from memory. The database gets ${Math.round(dbReads).toLocaleString()} reads/s — ${Math.round(dbLoad * 100)}% of what it can handle${dbLoad > 1 ? ', so it is failing' : ''}.`;
  return (
    <Lab readout={readout}
      controls={<>
        <Stepper label="Cache nodes" value={nodes} min={0} max={4} steps={[1]} onChange={setNodes} />
        <Switch label="One node just restarted (empty)" value={restarted} onChange={setRestarted} />
      </>}>
      <Frame height={196} label={readout}>
        <Box x={118} y={4} label="App servers" sub="10,000 reads/s" />
        <Arrow x1={160} y1={42} x2={160} y2={62} />
        {nodes === 0 && <Note x={160} y={84} anchor="middle" text="no cache: every read goes to the database" />}
        {Array.from({ length: nodes }, (_, i) => {
          const empty = restarted && i === nodes - 1;
          return <Box key={i} x={160 - nodes * 38 + i * 76} y={62} w={70} label={`Cache ${i + 1}`} sub={empty ? 'empty' : 'warm'} tone={empty ? 'bad' : 'good'} />;
        })}
        <Arrow x1={160} y1={100} x2={160} y2={120} label="misses" tone={toneForLoad(dbLoad)} />
        <Cyl x={122} y={120} label="Database" tone={toneForLoad(dbLoad)} />
        <Meter x={20} y={184} w={280} value={dbLoad} tone={toneForLoad(dbLoad)} label="Database load" valueText={`${Math.round(dbLoad * 100)}%`} />
      </Frame>
    </Lab>
  );
}

const LRU_CAPACITY = 3;
const LRU_KEYS = ['A', 'B', 'C', 'D', 'E'];

export function LruLab() {
  /** Most recently used first. */
  const [order, setOrder] = useState<string[]>(['C', 'B', 'A']);
  const [readout, setReadout] = useState('The cache holds 3 entries. Tap a key to read it.');
  const read = (key: string) => {
    const hit = order.includes(key);
    const kept = order.filter((k) => k !== key);
    const evicted = !hit && kept.length >= LRU_CAPACITY ? kept[kept.length - 1] : null;
    setOrder([key, ...kept].slice(0, LRU_CAPACITY));
    setReadout(hit
      ? `Hit: ${key} was in the cache and moves to the front.`
      : `Miss: ${key} is loaded from the database${evicted === null ? '.' : ` and ${evicted} — the least recently used — is evicted.`}`);
  };
  return (
    <Lab readout={readout}
      controls={
        <div className="field" role="group" aria-label="Read a key">
          <div className="field-label">Read a key</div>
          <div className="segmented">{LRU_KEYS.map((key) => <button key={key} className="seg" onClick={() => read(key)}>{key}</button>)}</div>
        </div>
      }>
      <Frame height={92} label={`Cache contents from most to least recently used: ${order.join(', ')}.`}>
        <Note x={24} y={14} text="most recent" />
        <Note x={296} y={14} anchor="end" text="evicted next" />
        {Array.from({ length: LRU_CAPACITY }, (_, i) => (
          <Box key={i} x={24 + i * 96} y={24} w={80} h={48} label={i < order.length ? order[i] : '—'} tone={i === 0 ? 'good' : i === LRU_CAPACITY - 1 && order.length === LRU_CAPACITY ? 'warn' : 'plain'} />
        ))}
        <Arrow x1={104} y1={48} x2={120} y2={48} />
        <Arrow x1={200} y1={48} x2={216} y2={48} />
      </Frame>
    </Lab>
  );
}

const FAR_ORIGIN_MS = LATENCY.localNetwork + LATENCY.remoteRegionPenalty;

export function CdnLab() {
  const [on, setOn] = useState(false);
  const latency = on ? LATENCY.cdnEdge : FAR_ORIGIN_MS;
  const originShare = on ? 0.05 : 1;
  const perGb = on ? EGRESS.commercialCdnPerGb : EGRESS.originPerGb;
  const readout = on
    ? `The image comes from a nearby edge in ~${latency} ms. Your origin sees only the ~5% of requests the edge has not cached, and bandwidth costs $${perGb}/GB.`
    : `Every image crosses the ocean to your origin: ~${latency} ms, 100% of the load on your servers, $${perGb}/GB.`;
  return (
    <Lab readout={readout} controls={<Switch label="Use a CDN" value={on} onChange={setOn} />}>
      <Frame height={170} label={readout}>
        <Box x={4} y={46} w={70} label="User" sub="in Europe" />
        <Box x={122} y={6} w={76} label="CDN edge" sub="nearby" tone={on ? 'good' : 'muted'} />
        <Box x={236} y={46} w={80} label="Origin" sub="in the US" tone={on ? 'plain' : 'warn'} />
        {on ? (
          <>
            <Arrow x1={74} y1={56} x2={122} y2={32} tone="good" label={`${LATENCY.cdnEdge} ms`} />
            <Arrow x1={198} y1={32} x2={236} y2={56} dashed label="misses" />
          </>
        ) : <Arrow x1={74} y1={70} x2={236} y2={70} tone="warn" label={`${FAR_ORIGIN_MS} ms`} />}
        <Meter x={20} y={116} w={280} value={latency / FAR_ORIGIN_MS} tone={on ? 'good' : 'warn'} label="Latency for the user" valueText={`${latency} ms`} />
        <Meter x={20} y={152} w={280} value={originShare} tone={on ? 'good' : 'warn'} label="Static requests reaching your origin" valueText={`${Math.round(originShare * 100)}%`} />
      </Frame>
    </Lab>
  );
}

function formatGb(gb: number): string {
  if (gb >= 1e9) return `${(gb / 1e9).toFixed(1)}B GB`;
  if (gb >= 1e6) return `${(gb / 1e6).toFixed(1)}M GB`;
  return `${Math.round(gb / 1e3).toLocaleString()}k GB`;
}

export function EgressCostLab() {
  const [exponent, setExponent] = useState(6);
  const gb = 10 ** exponent;
  const options = [
    { name: 'From your origin', cost: gb * EGRESS.originPerGb },
    { name: 'Commercial CDN', cost: gb * EGRESS.commercialCdnPerGb },
    { name: 'Own CDN appliances', cost: gb * EGRESS.ownCdnPerGb + EGRESS.ownCdnFixedMonthly },
  ];
  const most = Math.max(...options.map((o) => o.cost));
  const cheapest = options.reduce((best, o) => (o.cost < best.cost ? o : best));
  const readout = `At ${formatGb(gb)} a month, the cheapest option is “${cheapest.name}” at ${formatMoney(cheapest.cost)}/month.`;
  return (
    <Lab readout={readout} controls={<Slider label="Video and images delivered per month" value={exponent} min={4} max={9.3} step={0.1} format={(v) => formatGb(10 ** v)} onChange={setExponent} />}>
      <Frame height={128} label={readout}>
        {options.map((option, i) => (
          <Meter key={option.name} x={20} y={24 + i * 40} w={280} value={option.cost / most} tone={option === cheapest ? 'good' : 'muted'} label={option.name} valueText={`${formatMoney(option.cost)}/mo`} />
        ))}
      </Frame>
    </Lab>
  );
}

const RENDITIONS = [
  { name: '4K', mbps: 20 },
  { name: '1080p', mbps: 6 },
  { name: '720p', mbps: 3 },
  { name: '480p', mbps: 1.5 },
  { name: '240p', mbps: 0.5 },
];
/** A player keeps some headroom so a small dip does not cause buffering. */
const SAFE_SHARE = 0.8;

export function AbrLab() {
  const [mbps, setMbps] = useState(5);
  const chosen = RENDITIONS.find((r) => r.mbps <= mbps * SAFE_SHARE);
  const readout = chosen === undefined
    ? `At ${mbps} Mbit/s even the smallest version stalls: the player buffers.`
    : `At ${mbps} Mbit/s the player requests ${chosen.name} segments (${chosen.mbps} Mbit/s) and re-decides every few seconds.`;
  return (
    <Lab readout={readout} controls={<Slider label="Viewer’s connection" value={mbps} min={0.4} max={30} step={0.2} format={(v) => `${v} Mbit/s`} onChange={setMbps} />}>
      <Frame height={164} label={readout}>
        {RENDITIONS.map((r, i) => {
          const tone: Tone = r === chosen ? 'good' : r.mbps > mbps * SAFE_SHARE ? 'muted' : 'plain';
          return (
            <g key={r.name}>
              <Box x={20} y={4 + i * 32} w={70} h={26} label={r.name} tone={tone} />
              {[0, 1, 2, 3, 4].map((segment) => <rect key={segment} className={`fig-mini tone-${tone}`} x={104 + segment * 40} y={8 + i * 32} width={34} height={18} rx={4} />)}
            </g>
          );
        })}
      </Frame>
    </Lab>
  );
}

const BACKLOG = { baseJobsPerSec: 2000, spikeJobsPerSec: 12_000, spikeStartMin: 30, spikeEndMin: 60, horizonMin: 240, jobCost: 30, limitMin: 30 };
const JOBS_PER_WORKER = WORKER.unitsPerSec / BACKLOG.jobCost;
const BACKLOG_CHART = { left: 30, right: 310, top: 10, bottom: 112, maxDelayMin: 90 };

function backlogDelays(workers: number): number[] {
  const drain = workers * JOBS_PER_WORKER;
  let backlog = 0;
  return Array.from({ length: BACKLOG.horizonMin }, (_, minute) => {
    const arriving = minute >= BACKLOG.spikeStartMin && minute < BACKLOG.spikeEndMin ? BACKLOG.spikeJobsPerSec : BACKLOG.baseJobsPerSec;
    backlog = Math.max(0, backlog + (arriving - drain) * 60);
    return backlog / drain / 60;
  });
}

export function BacklogLab() {
  const [workers, setWorkers] = useState(60);
  const delays = backlogDelays(workers);
  const worst = Math.max(...delays);
  const x = (minute: number) => BACKLOG_CHART.left + (minute / BACKLOG.horizonMin) * (BACKLOG_CHART.right - BACKLOG_CHART.left);
  const y = (delay: number) => BACKLOG_CHART.bottom - (Math.min(delay, BACKLOG_CHART.maxDelayMin) / BACKLOG_CHART.maxDelayMin) * (BACKLOG_CHART.bottom - BACKLOG_CHART.top);
  const ok = worst <= BACKLOG.limitMin;
  const peakWorkers = Math.ceil(BACKLOG.spikeJobsPerSec / JOBS_PER_WORKER);
  const readout = `${workers} workers (${formatMoney(workers * WORKER.monthly)}/mo): jobs run at most ${Math.round(worst)} min late — ${ok ? 'within' : 'over'} the ${BACKLOG.limitMin}-minute limit. Sizing for the peak would take ${peakWorkers}.`;
  return (
    <Lab readout={readout} controls={<Stepper label="Workers" value={workers} min={40} max={200} steps={[10]} onChange={setWorkers} />}>
      <Frame height={136} label={readout}>
        <rect className="fig-band" x={x(BACKLOG.spikeStartMin)} y={BACKLOG_CHART.top} width={x(BACKLOG.spikeEndMin) - x(BACKLOG.spikeStartMin)} height={BACKLOG_CHART.bottom - BACKLOG_CHART.top} />
        <line className="fig-axis" x1={BACKLOG_CHART.left} y1={BACKLOG_CHART.bottom} x2={BACKLOG_CHART.right} y2={BACKLOG_CHART.bottom} />
        <line className="fig-guide tone-warn" x1={BACKLOG_CHART.left} y1={y(BACKLOG.limitMin)} x2={BACKLOG_CHART.right} y2={y(BACKLOG.limitMin)} />
        <polyline className={`fig-curve tone-${ok ? 'good' : 'bad'}`} points={delays.map((delay, minute) => `${x(minute)},${y(delay)}`).join(' ')} />
        <Note x={BACKLOG_CHART.left - 3} y={y(BACKLOG.limitMin) + 3} anchor="end" tone="warn" text="30m" />
        <Note x={x(45)} y={BACKLOG_CHART.top + 10} anchor="middle" tone="warn" text="6× spike" />
        <Note x={BACKLOG_CHART.left} y={130} text="how late jobs run, over 4 hours" />
      </Frame>
    </Lab>
  );
}

const USERS = [{ name: 'Americas', share: 0.5 }, { name: 'Europe', share: 0.3 }, { name: 'Asia', share: 0.2 }];
const LOCAL_MS = 40;

export function RegionsLab() {
  const [regions, setRegions] = useState(1);
  const [firstDown, setFirstDown] = useState(false);
  const isUp = (i: number) => i < regions && !(firstDown && i === 0);
  const anyUp = USERS.some((_, i) => isUp(i));
  const slowShare = USERS.reduce((sum, user, i) => (isUp(i) ? sum : sum + user.share), 0);
  const survivors = regions - (firstDown ? 1 : 0);
  const readout = !anyUp
    ? 'No region is up: a total outage for everyone.'
    : `${Math.round(slowShare * 100)}% of users cross an ocean (+${LATENCY.remoteRegionPenalty} ms). ${survivors} region${survivors === 1 ? '' : 's'} carry all traffic, so each needs ${Math.round(100 / survivors)}% of the total capacity.`;
  return (
    <Lab readout={readout}
      controls={<>
        <Stepper label="Regions deployed" value={regions} min={1} max={3} steps={[1]} onChange={setRegions} />
        <Switch label="Region 1 goes down" value={firstDown} onChange={setFirstDown} />
      </>}>
      <Frame height={146} label={readout}>
        {USERS.map((user, i) => {
          const x = 8 + i * 104;
          const deployed = i < regions;
          const up = isUp(i);
          const latency = !anyUp ? 'down' : up ? `${LOCAL_MS} ms` : `${LOCAL_MS + LATENCY.remoteRegionPenalty} ms`;
          return (
            <g key={user.name}>
              <Note x={x + 48} y={14} anchor="middle" strong tone="plain" text={`${user.name} ${Math.round(user.share * 100)}%`} />
              <Note x={x + 48} y={30} anchor="middle" tone={!anyUp ? 'bad' : up ? 'good' : 'warn'} text={latency} />
              <Arrow x1={x + 48} y1={36} x2={x + 48} y2={66} tone={up ? 'good' : 'muted'} dashed={!up} />
              <Box x={x} y={66} w={96} h={48} label={deployed ? `Region ${i + 1}` : 'no servers'} sub={!deployed ? undefined : up ? 'full stack' : '✕ offline'} tone={!deployed ? 'muted' : up ? 'good' : 'bad'} />
            </g>
          );
        })}
        <Note x={160} y={136} anchor="middle" text="users without a local region are routed to the nearest one that is up" />
      </Frame>
    </Lab>
  );
}

type Nines = '99' | '99.9' | '99.99' | '99.999';
const NINES: Nines[] = ['99', '99.9', '99.99', '99.999'];
const MINUTES_PER_YEAR = 365 * 24 * 60;

function formatDowntime(minutes: number): string {
  if (minutes >= 24 * 60) return `${(minutes / 60 / 24).toFixed(2)} days`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)} hours`;
  return minutes >= 1 ? `${minutes.toFixed(1)} minutes` : `${Math.round(minutes * 60)} seconds`;
}

export function NinesLab() {
  const [nines, setNines] = useState<Nines>('99');
  const downtime = (level: Nines) => (1 - Number(level) / 100) * MINUTES_PER_YEAR;
  const worst = Math.log10(downtime('99'));
  const readout = `${nines}% availability allows ${formatDowntime(downtime(nines))} of downtime a year — about ${formatDowntime(downtime(nines) / 12)} a month.`;
  return (
    <Lab readout={readout} controls={<Segmented label="Availability target" value={nines} onChange={setNines} options={NINES.map((n) => ({ value: n, label: `${n}%` }))} />}>
      <Frame height={164} label={readout}>
        {NINES.map((level, i) => (
          <Meter key={level} x={20} y={24 + i * 38} w={280} value={Math.log10(downtime(level)) / worst} tone={level === nines ? 'warn' : 'muted'} label={`${level}%`} valueText={`${formatDowntime(downtime(level))} / year`} />
        ))}
        <Note x={160} y={160} anchor="middle" text="bars are on a log scale: each nine is 10× less downtime" />
      </Frame>
    </Lab>
  );
}

const SECONDS_PER_DAY = 86_400;

function formatCount(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return String(Math.round(value));
}

function architectureFor(peakRps: number): string {
  if (peakRps < 1000) return 'one or two servers are enough';
  if (peakRps < 50_000) return 'a load-balanced fleet with a cache';
  return 'sharding, CDNs and several regions';
}

export function EstimatorLab() {
  const [dauExponent, setDauExponent] = useState(6);
  const [perUser, setPerUser] = useState(40);
  const [peakFactor, setPeakFactor] = useState(3);
  const dau = 10 ** dauExponent;
  const average = (dau * perUser) / SECONDS_PER_DAY;
  const peak = average * peakFactor;
  const readout = `About ${formatCount(peak)} requests per second at peak: ${architectureFor(peak)}.`;
  return (
    <Lab readout={readout}
      controls={<>
        <Slider label="Daily active users" value={dauExponent} min={3} max={9} step={0.1} format={(v) => formatCount(10 ** v)} onChange={setDauExponent} />
        <Slider label="Requests per user per day" value={perUser} min={1} max={200} step={1} format={String} onChange={setPerUser} />
        <Slider label="Peak ÷ average" value={peakFactor} min={1} max={10} step={0.5} format={(v) => `${v}×`} onChange={setPeakFactor} />
      </>}>
      <Frame height={70} label={readout}>
        <Box x={2} y={14} w={96} h={44} label={formatCount(dau * perUser)} sub="requests / day" />
        <Arrow x1={98} y1={36} x2={112} y2={36} />
        <Box x={112} y={14} w={96} h={44} label={`${formatCount(average)}/s`} sub="÷ 86,400 s" />
        <Arrow x1={208} y1={36} x2={222} y2={36} />
        <Box x={222} y={14} w={96} h={44} label={`${formatCount(peak)}/s`} sub={`× ${peakFactor} peak`} tone="info" />
      </Frame>
    </Lab>
  );
}
