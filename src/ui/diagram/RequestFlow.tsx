// Requests as dots flowing down a rail beside the diagram. A dot stops at the component
// that answered it; a dropped request turns red and falls away at the component that lost it.
import { useEffect, useRef } from 'react';
import type { TickResult } from '../../engine/types';
import type { NodeId } from './nodes';

export type Station = { id: NodeId; y: number };

type Props = { stations: Station[]; height: number; tick: TickResult; maxRps: number; playing: boolean };
type Dot = { y: number; targetY: number; dropped: boolean; endedAt: number | null };

export const RAIL_WIDTH = 28;
const RAIL_X = 10;
const SPEED_PX_PER_SEC = 320;
const MIN_DOTS_PER_SEC = 3;
const MAX_DOTS_PER_SEC = 42;
const END_ANIMATION_MS = 420;
const DOT_RADIUS = 3;

/** Where one request ends, sampled from the tick's real proportions. */
function pickFate(tick: TickResult, yOf: (id: NodeId) => number): { targetY: number; dropped: boolean } {
  const outcomes: { rps: number; station: NodeId; dropped: boolean }[] = [
    { rps: tick.served.cdn, station: 'cdn', dropped: false },
    { rps: tick.served.app, station: 'app', dropped: false },
    { rps: tick.served.cache, station: 'cache', dropped: false },
    { rps: tick.served.db + tick.served.objectStorage, station: 'db', dropped: false },
    { rps: tick.dropped.app + tick.dropped.outage, station: 'app', dropped: true },
    { rps: tick.dropped.dbRead + tick.dropped.dbWrite, station: 'db', dropped: true },
  ];
  let remaining = Math.random() * outcomes.reduce((sum, o) => sum + o.rps, 0);
  for (const outcome of outcomes) {
    remaining -= outcome.rps;
    if (remaining <= 0) return { targetY: yOf(outcome.station), dropped: outcome.dropped };
  }
  return { targetY: yOf('db'), dropped: false };
}

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function RequestFlow({ stations, height, tick, maxRps, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The animation loop reads the latest props through this ref so it never has to restart.
  const live = useRef({ stations, tick, maxRps, playing });
  live.current = { stations, tick, maxRps, playing };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) throw new Error('RequestFlow mounted without its canvas');
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('2D canvas is not available');
    const scale = window.devicePixelRatio;
    canvas.width = RAIL_WIDTH * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    const colors = { ok: cssColor('--mint'), dropped: cssColor('--red'), rail: cssColor('--border-subtle') };

    const dots: Dot[] = [];
    let spawnDebt = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function draw(now) {
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;
      const state = live.current;
      const bottom = Math.max(...state.stations.map((s) => s.y));
      const yOf = (id: NodeId) => {
        const exact = state.stations.find((s) => s.id === id);
        return exact === undefined ? bottom : exact.y;
      };

      if (state.playing) {
        spawnDebt += elapsed * (MIN_DOTS_PER_SEC + (MAX_DOTS_PER_SEC - MIN_DOTS_PER_SEC) * (state.tick.rps / state.maxRps));
        for (; spawnDebt >= 1; spawnDebt -= 1) dots.push({ y: 0, ...pickFate(state.tick, yOf), endedAt: null });
      }

      context.clearRect(0, 0, RAIL_WIDTH, height);
      context.strokeStyle = colors.rail;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(RAIL_X, 0);
      context.lineTo(RAIL_X, bottom);
      context.stroke();

      for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        if (dot.endedAt === null) {
          if (state.playing) dot.y += SPEED_PX_PER_SEC * elapsed;
          if (dot.y >= dot.targetY) {
            dot.y = dot.targetY;
            dot.endedAt = now;
          }
        }
        const ending = dot.endedAt === null ? 0 : (now - dot.endedAt) / END_ANIMATION_MS;
        if (ending >= 1) {
          dots.splice(i, 1);
          continue;
        }
        // Answered requests slide into their component; dropped ones turn red and fall off the rail.
        const x = RAIL_X + (dot.dropped ? -6 : 14) * ending;
        const y = dot.y + (dot.dropped ? 22 * ending * ending : 0);
        context.globalAlpha = 1 - ending;
        context.fillStyle = dot.dropped && dot.endedAt !== null ? colors.dropped : colors.ok;
        context.beginPath();
        context.arc(x, y, dot.dropped && dot.endedAt !== null ? DOT_RADIUS + 1 : DOT_RADIUS, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(frame);
  }, [height]);

  return <canvas ref={canvasRef} className="flow" style={{ width: RAIL_WIDTH, height }} aria-hidden="true" />;
}
