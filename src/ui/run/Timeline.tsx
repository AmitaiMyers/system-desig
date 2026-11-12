// The day at a glance: traffic served and failed, incident markers, and a draggable playhead.
import type { KeyboardEvent, PointerEvent } from 'react';
import { TICKS_PER_DAY } from '../../engine/catalog';
import { tickToClock } from '../../engine/simulate';
import type { Incident, TickResult } from '../../engine/types';

type Props = { ticks: TickResult[]; incidents: Incident[]; playhead: number; onScrub: (tick: number) => void };

const CHART_HEIGHT = 56;
const LAST_TICK = TICKS_PER_DAY - 1;
const KEY_STEP_TICKS = 6;
const FAILING_SHARE = 0.999;

export function isFailing(tick: TickResult): boolean {
  return tick.okRps < tick.rps * FAILING_SHARE;
}

/** "12:00–13:00 and 19:00–19:30": the stretches of the day in which requests failed. */
export function failureSummary(ticks: TickResult[]): string {
  const ranges: string[] = [];
  let start: number | null = null;
  ticks.forEach((tick, index) => {
    if (isFailing(tick) && start === null) start = index;
    const rangeEnds = start !== null && (!isFailing(tick) || index === LAST_TICK);
    if (rangeEnds && start !== null) {
      ranges.push(`${tickToClock(start)}–${tickToClock(isFailing(tick) ? index + 1 : index)}`);
      start = null;
    }
  });
  return ranges.length === 0 ? 'No requests failed today.' : `Requests failed ${ranges.join(' and ')}.`;
}

export function Timeline({ ticks, incidents, playhead, onScrub }: Props) {
  const maxRps = Math.max(...ticks.map((t) => t.rps));
  const y = (rps: number) => CHART_HEIGHT - (rps / maxRps) * (CHART_HEIGHT - 4);
  const area = (pick: (t: TickResult) => number) => `0,${CHART_HEIGHT} ${ticks.map((t) => `${t.tick},${y(pick(t))}`).join(' ')} ${LAST_TICK},${CHART_HEIGHT}`;
  const clamp = (tick: number) => Math.min(LAST_TICK, Math.max(0, tick));

  const scrubTo = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onScrub(clamp(Math.round(((event.clientX - box.left) / box.width) * LAST_TICK)));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubTo(event);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubTo(event);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    onScrub(clamp(playhead + direction * KEY_STEP_TICKS));
  };

  return (
    <div className="timeline">
      <div className="chart-wrap" role="slider" tabIndex={0} aria-label="Time of day" aria-valuemin={0} aria-valuemax={LAST_TICK} aria-valuenow={playhead} aria-valuetext={tickToClock(playhead)}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onKeyDown={onKeyDown}>
        <svg className="chart" viewBox={`0 0 ${TICKS_PER_DAY} ${CHART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <polygon className="chart-failed" points={area((t) => t.rps)} />
          <polygon className="chart-ok" points={area((t) => t.okRps)} />
          {incidents.map((incident, i) => <line key={i} className="chart-incident" x1={incident.atTick} x2={incident.atTick} y1={0} y2={CHART_HEIGHT} />)}
          <line className="chart-playhead" x1={playhead} x2={playhead} y1={0} y2={CHART_HEIGHT} />
        </svg>
      </div>
      <div className="chart-legend">
        <span><i className="dot dot-ok" /> served</span>
        <span><i className="dot dot-failed" /> failed</span>
        <span><i className="dot dot-incident" /> incident</span>
        <span className="chart-hint">drag to inspect</span>
      </div>
      <p className="sr-only">{failureSummary(ticks)}</p>
    </div>
  );
}
