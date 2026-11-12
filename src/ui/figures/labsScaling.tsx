// Interactive diagrams for scaling, databases and sharding.
import { useState } from 'react';
import { APP_SIZES, LATENCY, LOAD_BALANCER, SIZE_ORDER } from '../../engine/catalog';
import { Segmented, Slider, Stepper, Switch } from '../primitives/controls';
import { Arrow, Box, Cyl, Frame, Lab, Meter, Note, toneForLoad, type Tone } from './kit';

type Stage = 'one' | 'split' | 'fleet';
const STAGE_READOUT: Record<Stage, string> = {
  one: 'One machine does everything. If it dies, the whole product is down.',
  split: 'App and database no longer compete for one CPU — but now two machines can each take you down.',
  fleet: 'Any web server can die and the load balancer routes around it. The database is the single point of failure that is left.',
};

export function EvolveLab() {
  const [stage, setStage] = useState<Stage>('one');
  return (
    <Lab readout={STAGE_READOUT[stage]}
      controls={<Segmented label="Architecture" value={stage} onChange={setStage} options={[{ value: 'one', label: 'One box' }, { value: 'split', label: 'Split DB' }, { value: 'fleet', label: 'Load balanced' }]} />}>
      <Frame height={190} label={STAGE_READOUT[stage]}>
        {stage === 'one' && <Box x={98} y={66} w={124} h={52} label="App + database" sub="single point of failure" tone="bad" />}
        {stage === 'split' && (
          <>
            <Box x={118} y={24} label="App server" sub="can fail" tone="warn" />
            <Arrow x1={160} y1={62} x2={160} y2={112} />
            <Cyl x={122} y={112} label="Database" sub="can fail" tone="warn" />
          </>
        )}
        {stage === 'fleet' && (
          <>
            <Box x={118} y={4} label="Load balancer" />
            {[10, 118, 226].map((x) => (
              <g key={x}>
                <Arrow x1={160} y1={42} x2={x + 42} y2={72} />
                <Box x={x} y={72} label="Web server" sub="stateless" tone="good" />
                <Arrow x1={x + 42} y1={110} x2={160} y2={140} />
              </g>
            ))}
            <Cyl x={122} y={140} label="Database" sub="still one" tone="warn" />
          </>
        )}
      </Frame>
    </Lab>
  );
}

const FLEET_SERVER = APP_SIZES.medium;

export function ScaleOutLab() {
  const [rps, setRps] = useState(4000);
  const fitting = SIZE_ORDER.find((size) => APP_SIZES[size].rps >= rps);
  const fleetCount = Math.ceil(rps / FLEET_SERVER.rps) + 1;
  const fleetCost = fleetCount * FLEET_SERVER.monthly + LOAD_BALANCER.monthly;
  const boxText = fitting === undefined ? 'No server is big enough' : `1 × ${fitting} — $${APP_SIZES[fitting].monthly}/mo`;
  const readout = fitting === undefined
    ? `No single server handles ${rps.toLocaleString()} req/s. The fleet costs $${fleetCost.toLocaleString()}/mo and survives one failure.`
    : `One ${fitting} box costs $${APP_SIZES[fitting].monthly}/mo with no spare. The fleet costs $${fleetCost.toLocaleString()}/mo and survives one failure.`;
  const drawn = Math.min(fleetCount, 8);
  return (
    <Lab readout={readout} controls={<Slider label="Traffic to serve" value={rps} min={400} max={16000} step={400} format={(v) => `${v.toLocaleString()} req/s`} onChange={setRps} />}>
      <Frame height={132} label={readout}>
        <Note x={76} y={14} anchor="middle" strong text="Bigger box" />
        <Box x={16} y={26} w={120} h={60} label={fitting === undefined ? 'too much' : fitting} sub={fitting === undefined ? 'servers only come so large' : 'one machine'} tone={fitting === undefined ? 'bad' : 'warn'} />
        <Note x={76} y={104} anchor="middle" text={boxText} />
        <Note x={240} y={14} anchor="middle" strong text="More boxes" />
        {Array.from({ length: drawn }, (_, i) => (
          <rect key={i} className={`fig-mini tone-${i === drawn - 1 ? 'info' : 'good'}`} x={170 + (i % 4) * 36} y={26 + Math.floor(i / 4) * 32} width={30} height={26} rx={5} />
        ))}
        <Note x={240} y={104} anchor="middle" text={`${fleetCount} × medium + LB — $${fleetCost.toLocaleString()}/mo`} />
        <Note x={240} y={120} anchor="middle" tone="info" text="blue = the spare (N+1)" />
      </Frame>
    </Lab>
  );
}

const DEMAND_RPS = 6000;

export function NPlusOneLab() {
  const [servers, setServers] = useState(3);
  const [oneDown, setOneDown] = useState(false);
  const alive = servers - (oneDown ? 1 : 0);
  const utilization = alive === 0 ? Infinity : DEMAND_RPS / (alive * FLEET_SERVER.rps);
  const tone = toneForLoad(utilization);
  const readout = alive === 0
    ? 'No servers left: a total outage.'
    : utilization > 1
      ? `${alive} servers can take ${(alive * FLEET_SERVER.rps).toLocaleString()} req/s but ${DEMAND_RPS.toLocaleString()} arrive: ${Math.round((1 - 1 / utilization) * 100)}% of requests are dropped.`
      : `${alive} servers run at ${Math.round(utilization * 100)}% — ${utilization >= 0.8 ? 'it holds, but latency is climbing.' : 'comfortable.'}`;
  return (
    <Lab readout={readout}
      controls={<>
        <Stepper label="Servers (2,000 req/s each)" value={servers} min={1} max={6} steps={[1]} onChange={setServers} />
        <Switch label="One server fails" value={oneDown} onChange={setOneDown} />
      </>}>
      <Frame height={124} label={readout}>
        <Note x={160} y={14} anchor="middle" text={`${DEMAND_RPS.toLocaleString()} req/s arriving`} />
        {Array.from({ length: servers }, (_, i) => {
          const dead = oneDown && i === servers - 1;
          return <Box key={i} x={160 - servers * 25 + i * 50} y={24} w={44} h={40} label={dead ? '✕' : 'OK'} tone={dead ? 'bad' : 'good'} />;
        })}
        <Meter x={20} y={98} w={280} value={utilization} tone={tone} label="Load on the surviving servers" valueText={Number.isFinite(utilization) ? `${Math.round(utilization * 100)}%` : 'down'} />
      </Frame>
    </Lab>
  );
}

const CURVE = { left: 34, right: 306, top: 12, bottom: 122 };

export function LatencyCurveLab() {
  const [percent, setPercent] = useState(50);
  const factor = (u: number) => Math.min(1 / (1 - u), LATENCY.maxQueueingFactor);
  const x = (u: number) => CURVE.left + u * (CURVE.right - CURVE.left);
  const y = (f: number) => CURVE.bottom - ((f - 1) / (LATENCY.maxQueueingFactor - 1)) * (CURVE.bottom - CURVE.top);
  const points = Array.from({ length: 100 }, (_, i) => `${x(i / 100)},${y(factor(i / 100))}`).join(' ');
  const now = factor(percent / 100);
  const tone: Tone = percent >= 90 ? 'bad' : percent >= 70 ? 'warn' : 'good';
  const readout = `At ${percent}% busy, a request takes about ${now >= 10 ? Math.round(now) : now.toFixed(1)}× as long as on an idle server.`;
  return (
    <Lab readout={readout} controls={<Slider label="How busy the server is" value={percent} min={0} max={99} step={1} format={(v) => `${v}%`} onChange={setPercent} />}>
      <Frame height={146} label={readout}>
        <line className="fig-axis" x1={CURVE.left} y1={CURVE.bottom} x2={CURVE.right} y2={CURVE.bottom} />
        <line className="fig-axis" x1={CURVE.left} y1={CURVE.top} x2={CURVE.left} y2={CURVE.bottom} />
        <polyline className="fig-curve" points={points} />
        <line className={`fig-guide tone-${tone}`} x1={x(percent / 100)} y1={CURVE.bottom} x2={x(percent / 100)} y2={y(now)} />
        <circle className={`fig-point tone-${tone}`} cx={x(percent / 100)} cy={y(now)} r={5} />
        <Note x={CURVE.left - 4} y={CURVE.top + 6} anchor="end" text="20×" />
        <Note x={CURVE.left - 4} y={CURVE.bottom} anchor="end" text="1×" />
        <Note x={CURVE.left} y={140} text="idle" />
        <Note x={CURVE.right} y={140} anchor="end" text="100% busy" />
        <Note x={170} y={140} anchor="middle" text="latency vs. utilization" />
      </Frame>
    </Lab>
  );
}

type Standby = 'none' | 'cold' | 'warm' | 'hot';
const STANDBY: Record<Standby, { label: string; downtime: string; downShare: number; lost: string; lostShare: number; cost: string; tone: Tone }> = {
  none: { label: 'nothing', downtime: 'until someone rebuilds it', downShare: 1, lost: 'everything', lostShare: 1, cost: 'free', tone: 'bad' },
  cold: { label: 'last backup', downtime: '~30 minutes', downShare: 0.45, lost: 'hours of writes', lostShare: 0.5, cost: 'cheap', tone: 'warn' },
  warm: { label: 'replica', downtime: '~5 minutes', downShare: 0.12, lost: 'a few seconds', lostShare: 0.06, cost: 'one extra node', tone: 'good' },
  hot: { label: 'synced twin', downtime: 'none', downShare: 0, lost: 'nothing', lostShare: 0, cost: 'extra node + slower writes', tone: 'good' },
};

export function FailoverLab() {
  const [mode, setMode] = useState<Standby>('none');
  const s = STANDBY[mode];
  const readout = `Primary dies. Downtime: ${s.downtime}. Data lost: ${s.lost}. Price: ${s.cost}.`;
  return (
    <Lab readout={readout}
      controls={<Segmented label="What stands behind the primary" value={mode} onChange={setMode} options={[{ value: 'none', label: 'Nothing' }, { value: 'cold', label: 'Cold' }, { value: 'warm', label: 'Warm' }, { value: 'hot', label: 'Hot' }]} />}>
      <Frame height={168} label={readout}>
        <Cyl x={30} y={8} w={96} label="Primary" sub="✕ failed" tone="bad" />
        <Cyl x={194} y={8} w={96} label={mode === 'none' ? '—' : 'Standby'} sub={s.label} tone={mode === 'none' ? 'muted' : s.tone} />
        {mode !== 'none' && <Arrow x1={126} y1={32} x2={194} y2={32} dashed={mode === 'cold'} tone={s.tone} label={mode === 'cold' ? 'backup' : mode === 'warm' ? 'async' : 'sync'} />}
        <Meter x={20} y={96} w={280} value={s.downShare} tone={s.tone} label="Downtime" valueText={s.downtime} />
        <Meter x={20} y={136} w={280} value={s.lostShare} tone={s.tone} label="Data lost" valueText={s.lost} />
      </Frame>
    </Lab>
  );
}

type ShardKey = 'user' | 'post';
const SHARD_COUNT = 4;
const EVEN_LOAD = 0.6;
const CELEBRITY_LOAD = 1.3;

export function ShardsLab() {
  const [key, setKey] = useState<ShardKey>('user');
  const [celebrity, setCelebrity] = useState(false);
  const hot = key === 'user' && celebrity;
  const loads = Array.from({ length: SHARD_COUNT }, (_, i) => (hot ? (i === 0 ? CELEBRITY_LOAD : 0.45) : EVEN_LOAD));
  const readout = key === 'user'
    ? hot ? 'The celebrity’s shard is at 130% and dropping requests while the other three idle.' : 'Each user lives on one shard, so a timeline read touches one shard. Load is even — for now.'
    : `Posts are spread evenly${celebrity ? ', so the celebrity changes nothing' : ''}. But “all posts by a user” must ask all ${SHARD_COUNT} shards.`;
  return (
    <Lab readout={readout}
      controls={<>
        <Segmented label="Shard key" value={key} onChange={setKey} options={[{ value: 'user', label: 'user_id' }, { value: 'post', label: 'hash(post_id)' }]} />
        <Switch label="A celebrity joins" value={celebrity} onChange={setCelebrity} />
      </>}>
      <Frame height={166} label={readout}>
        <Box x={118} y={4} label="Router" sub={key === 'user' ? 'one shard' : 'asks all shards'} />
        {loads.map((load, i) => {
          const x = 6 + i * 79;
          return (
            <g key={i}>
              <Arrow x1={160} y1={42} x2={x + 35} y2={70} dashed={key === 'post'} tone={key === 'post' || i === 0 ? 'info' : 'muted'} />
              <Cyl x={x} y={70} w={70} label={`Shard ${i + 1}`} tone={toneForLoad(load)} />
              <Meter x={x} y={146} w={70} value={load} tone={toneForLoad(load)} label="load" valueText={`${Math.round(load * 100)}%`} />
            </g>
          );
        })}
      </Frame>
    </Lab>
  );
}

type CapPair = 'CP' | 'AP' | 'CA';
const CAP: Record<CapPair, { examples: string; readout: string }> = {
  CP: { examples: 'MongoDB · HBase · DynamoDB (strong)', readout: 'Consistent and partition-tolerant: during a network split the system refuses some requests rather than return stale data.' },
  AP: { examples: 'Cassandra', readout: 'Available and partition-tolerant: every request is answered, but nodes may briefly disagree (eventual consistency).' },
  CA: { examples: 'Single-node MySQL / PostgreSQL', readout: 'Consistent and available only while there is no partition — in other words, not really distributed.' },
};
const CAP_VERTEX = { A: [160, 22], C: [56, 150], P: [264, 150] } as const;

export function CapLab() {
  const [pair, setPair] = useState<CapPair>('CP');
  const edge = (a: 'A' | 'C' | 'P', b: 'A' | 'C' | 'P', id: CapPair) => (
    <line className={pair === id ? 'fig-edge fig-edge-on' : 'fig-edge'} x1={CAP_VERTEX[a][0]} y1={CAP_VERTEX[a][1]} x2={CAP_VERTEX[b][0]} y2={CAP_VERTEX[b][1]} />
  );
  return (
    <Lab readout={CAP[pair].readout}
      controls={<Segmented label="Keep which two?" value={pair} onChange={setPair} options={[{ value: 'CP', label: 'C + P' }, { value: 'AP', label: 'A + P' }, { value: 'CA', label: 'C + A' }]} />}>
      <Frame height={176} label={CAP[pair].readout}>
        {edge('C', 'P', 'CP')}
        {edge('A', 'P', 'AP')}
        {edge('C', 'A', 'CA')}
        <Note x={160} y={14} anchor="middle" strong tone={pair !== 'CP' ? 'info' : 'muted'} text="Availability" />
        <Note x={56} y={166} anchor="middle" strong tone={pair !== 'AP' ? 'info' : 'muted'} text="Consistency" />
        <Note x={264} y={166} anchor="middle" strong tone={pair !== 'CA' ? 'info' : 'muted'} text="Partition tolerance" />
        <Note x={160} y={104} anchor="middle" tone="plain" text={CAP[pair].examples} />
      </Frame>
    </Lab>
  );
}
