// Replays a simulated day: live diagram, HUD and a traffic chart with a playhead.
import { useEffect, useState } from 'react';
import { TICKS_PER_DAY } from '../engine/catalog';
import { tickToClock } from '../engine/simulate';
import type { Incident, SimResult, TickResult } from '../engine/types';
import { Diagram } from './Diagram';
import type { DiagramNode } from './nodes';

type Props = { result: SimResult; incidents: Incident[]; nodes: DiagramNode[]; onFinished: () => void };

const TICK_MS = 55;
/** Slow down while something is going wrong so the player can watch it. */
const TROUBLE_TICK_MS = 160;
const CHART_HEIGHT = 56;

function inTrouble(tick: TickResult): boolean {
  return tick.activeIncidents.length > 0 || tick.okRps < tick.rps * 0.999;
}

function TrafficChart({ ticks, incidents, playhead }: { ticks: TickResult[]; incidents: Incident[]; playhead: number }) {
  const maxRps = Math.max(...ticks.map((t) => t.rps));
  const y = (rps: number) => CHART_HEIGHT - (rps / maxRps) * (CHART_HEIGHT - 4);
  const area = (pick: (t: TickResult) => number) => `0,${CHART_HEIGHT} ${ticks.map((t) => `${t.tick},${y(pick(t))}`).join(' ')} ${TICKS_PER_DAY - 1},${CHART_HEIGHT}`;
  return (
    <svg className="chart" viewBox={`0 0 ${TICKS_PER_DAY} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Traffic over the day; failed requests in red">
      <polygon className="chart-failed" points={area((t) => t.rps)} />
      <polygon className="chart-ok" points={area((t) => t.okRps)} />
      {incidents.map((incident, i) => <line key={i} className="chart-incident" x1={incident.atTick} x2={incident.atTick} y1={0} y2={CHART_HEIGHT} />)}
      <line className="chart-playhead" x1={playhead} x2={playhead} y1={0} y2={CHART_HEIGHT} />
    </svg>
  );
}

export function RunScreen({ result, incidents, nodes, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const tick = result.ticks[index];

  useEffect(() => {
    if (index >= TICKS_PER_DAY - 1) {
      const done = setTimeout(onFinished, 500);
      return () => clearTimeout(done);
    }
    const timer = setTimeout(() => setIndex(index + 1), inTrouble(tick) ? TROUBLE_TICK_MS : TICK_MS);
    return () => clearTimeout(timer);
  }, [index, tick, onFinished]);

  const success = tick.okRps / tick.rps;
  return (
    <div className="run">
      <div className="hud">
        <div className="hud-cell"><span className="hud-label">Time</span><span className="hud-value">{tickToClock(tick.tick)}</span></div>
        <div className="hud-cell"><span className="hud-label">p99</span><span className="hud-value">{Math.round(tick.p99Ms)} ms</span></div>
        <div className={success < 0.999 ? 'hud-cell hud-bad' : 'hud-cell'}><span className="hud-label">Success</span><span className="hud-value">{(Math.floor(success * 1000) / 10).toFixed(1)}%</span></div>
      </div>
      <TrafficChart ticks={result.ticks} incidents={incidents} playhead={index} />
      <div className="chart-legend"><span className="dot dot-ok" /> served <span className="dot dot-failed" /> failed <span className="dot dot-incident" /> incident</div>
      <div className={tick.activeIncidents.length > 0 ? 'incident-banner incident-on' : 'incident-banner'}>
        {tick.activeIncidents.length > 0 ? `⚠️ ${tick.activeIncidents.join(' · ')}` : 'All quiet.'}
      </div>
      <Diagram nodes={nodes} onSelect={null} tick={tick} />
      {tick.queueDelayMin >= 1 && <div className="callout callout-warn">Background jobs are running {Math.round(tick.queueDelayMin)} min behind.</div>}
      <button className="btn btn-block" onClick={onFinished}>Skip to results</button>
    </div>
  );
}
