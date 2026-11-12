// Replays a simulated day: request flow, live load, incidents, and a timeline you can pause and scrub.
import { useEffect, useState } from 'react';
import { TICKS_PER_DAY } from '../../engine/catalog';
import { tickToClock } from '../../engine/simulate';
import type { Incident, SimResult } from '../../engine/types';
import { Diagram } from '../diagram/Diagram';
import type { DiagramNode } from '../diagram/nodes';
import { Icon } from '../primitives/Icon';
import { isFailing, Timeline } from './Timeline';

type Props = {
  result: SimResult;
  incidents: Incident[];
  nodes: DiagramNode[];
  /** Open paused at this moment (used by "Show me" in the review). null = play from midnight. */
  startTick: number | null;
  onFinished: () => void;
};

const TICK_MS = 55;
/** Slow down while something is going wrong so the player can watch it. */
const TROUBLE_TICK_MS = 170;
const LAST_TICK = TICKS_PER_DAY - 1;
const AUTO_CONTINUE_MS = 700;
const INCIDENT_BUZZ_MS = 80;

export function RunScreen({ result, incidents, nodes, startTick, onFinished }: Props) {
  const [index, setIndex] = useState(startTick === null ? 0 : startTick);
  const [playing, setPlaying] = useState(startTick === null);
  const [speed, setSpeed] = useState<1 | 2>(1);
  /** Once the player takes control, the screen stops advancing on its own. */
  const [tookControl, setTookControl] = useState(startTick !== null);
  const tick = result.ticks[index];
  const incidentText = tick.activeIncidents.join(' · ');
  const atEnd = index >= LAST_TICK;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      if (tookControl) return setPlaying(false);
      const done = setTimeout(onFinished, AUTO_CONTINUE_MS);
      return () => clearTimeout(done);
    }
    const slow = tick.activeIncidents.length > 0 || isFailing(tick);
    const timer = setTimeout(() => setIndex(index + 1), (slow ? TROUBLE_TICK_MS : TICK_MS) / speed);
    return () => clearTimeout(timer);
  }, [index, playing, speed, atEnd, tookControl, tick, onFinished]);

  useEffect(() => {
    if (incidentText !== '' && playing && 'vibrate' in navigator) navigator.vibrate(INCIDENT_BUZZ_MS);
  }, [incidentText, playing]);

  const togglePlay = () => {
    setTookControl(true);
    if (atEnd && !playing) setIndex(0);
    setPlaying(!playing);
  };
  const scrub = (to: number) => {
    setTookControl(true);
    setPlaying(false);
    setIndex(to);
  };

  const success = tick.okRps / tick.rps;
  const maxRps = Math.max(...result.ticks.map((t) => t.rps));
  return (
    <div className="run">
      <div className="hud">
        <div className="hud-cell"><span className="hud-label">Time</span><span className="hud-value">{tickToClock(tick.tick)}</span></div>
        <div className="hud-cell"><span className="hud-label">p99 latency</span><span className="hud-value">{Math.round(tick.p99Ms)} ms</span></div>
        <div className={isFailing(tick) ? 'hud-cell hud-bad' : 'hud-cell'}><span className="hud-label">Success</span><span className="hud-value">{(Math.floor(success * 1000) / 10).toFixed(1)}%</span></div>
      </div>
      <Timeline ticks={result.ticks} incidents={incidents} playhead={index} onScrub={scrub} />
      <div className="run-controls">
        <button className="btn btn-small" onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} size={18} /> {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}</button>
        <button className="btn btn-small" aria-pressed={speed === 2} onClick={() => setSpeed(speed === 1 ? 2 : 1)}>{speed}× speed</button>
      </div>
      <div className={incidentText !== '' ? 'incident-banner incident-on' : 'incident-banner'}>
        {incidentText !== '' ? <><Icon name="alert" size={20} /> <span key={incidentText} className="incident-text">{incidentText}</span></> : 'All quiet.'}
      </div>
      <div className="sr-only" aria-live="polite">{incidentText !== '' ? `Incident: ${incidentText}` : ''}</div>
      <Diagram nodes={nodes} mode={{ kind: 'run', tick, maxRps, playing }} />
    </div>
  );
}
