// Drawing kit for the learning diagrams: a 320-unit-wide SVG canvas and a few shapes.
// Colours come from the tone classes in styles.css, so diagrams follow the design tokens.
import type { ReactNode } from 'react';
import type { FigureTone } from '../../content/types';

export type Tone = FigureTone;
export const WIDTH = 320;
const ARROW_HEAD = 5;

/** `label` is the text alternative: say what the diagram shows, not what it looks like. */
export function Frame({ height, label, children }: { height: number; label: string; children: ReactNode }) {
  return (
    <svg className="fig" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

type ShapeProps = { x: number; y: number; w?: number; h?: number; label: string; sub?: string; tone?: Tone };

const LABEL_CHAR_WIDTH = 6.3;
const SUB_CHAR_WIDTH = 4.9;
const TEXT_PADDING = 8;

/** Text longer than the shape is squeezed to fit instead of spilling out of it. */
function fitted(text: string, charWidth: number, width: number): { textLength?: number; lengthAdjust?: 'spacingAndGlyphs' } {
  const available = width - TEXT_PADDING;
  return text.length * charWidth > available ? { textLength: available, lengthAdjust: 'spacingAndGlyphs' } : {};
}

function ShapeText({ cx, cy, width, label, sub }: { cx: number; cy: number; width: number; label: string; sub?: string }) {
  return (
    <>
      <text className="fig-label" x={cx} y={sub === undefined ? cy + 4 : cy - 2} textAnchor="middle" {...fitted(label, LABEL_CHAR_WIDTH, width)}>{label}</text>
      {sub !== undefined && <text className="fig-sub" x={cx} y={cy + 11} textAnchor="middle" {...fitted(sub, SUB_CHAR_WIDTH, width)}>{sub}</text>}
    </>
  );
}

/** A service: server, load balancer, cache… */
export function Box({ x, y, w = 84, h = 38, label, sub, tone = 'plain' }: ShapeProps) {
  return (
    <g className={`fig-shape tone-${tone}`}>
      <rect x={x} y={y} width={w} height={h} rx={8} />
      <ShapeText cx={x + w / 2} cy={y + h / 2} width={w} label={label} sub={sub} />
    </g>
  );
}

/** A data store, drawn as a cylinder. */
export function Cyl({ x, y, w = 76, h = 46, label, sub, tone = 'plain' }: ShapeProps) {
  const ry = 6;
  return (
    <g className={`fig-shape tone-${tone}`}>
      <path d={`M${x} ${y + ry}v${h - 2 * ry}a${w / 2} ${ry} 0 0 0 ${w} 0v${-(h - 2 * ry)}a${w / 2} ${ry} 0 0 0 ${-w} 0a${w / 2} ${ry} 0 0 0 ${w} 0`} />
      <ShapeText cx={x + w / 2} cy={y + h / 2 + 4} width={w} label={label} sub={sub} />
    </g>
  );
}

type ArrowProps = { x1: number; y1: number; x2: number; y2: number; label?: string; tone?: Tone; dashed?: boolean };

export function Arrow({ x1, y1, x2, y2, label, tone = 'muted', dashed = false }: ArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const wing = (offset: number) => `${x2 - ARROW_HEAD * Math.cos(angle + offset)},${y2 - ARROW_HEAD * Math.sin(angle + offset)}`;
  return (
    <g className={`fig-arrow tone-${tone}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? '4 3' : undefined} />
      <polygon points={`${x2},${y2} ${wing(0.5)} ${wing(-0.5)}`} />
      {label !== undefined && <text className="fig-sub" x={(x1 + x2) / 2 + 5} y={(y1 + y2) / 2 - 3}>{label}</text>}
    </g>
  );
}

type NoteProps = { x: number; y: number; text: string; tone?: Tone; anchor?: 'start' | 'middle' | 'end'; strong?: boolean };

export function Note({ x, y, text, tone = 'muted', anchor = 'start', strong = false }: NoteProps) {
  return <text className={`${strong ? 'fig-label' : 'fig-sub'} tone-text-${tone}`} x={x} y={y} textAnchor={anchor}>{text}</text>;
}

/** A horizontal bar: `value` is the filled share (values above 1 are drawn full and should be labelled). */
export function Meter({ x, y, w, value, tone = 'good', label, valueText }: { x: number; y: number; w: number; value: number; tone?: Tone; label: string; valueText: string }) {
  return (
    <g>
      <text className="fig-sub" x={x} y={y - 4}>{label}</text>
      <text className={`fig-sub tone-text-${tone}`} x={x + w} y={y - 4} textAnchor="end">{valueText}</text>
      <rect className="fig-track" x={x} y={y} width={w} height={8} rx={4} />
      <rect className={`fig-fill tone-${tone}`} x={x} y={y} width={Math.max(0, Math.min(1, value)) * w} height={8} rx={4} />
    </g>
  );
}

export function toneForLoad(utilization: number): Tone {
  if (utilization >= 1) return 'bad';
  return utilization >= 0.8 ? 'warn' : 'good';
}

/** An interactive diagram: the drawing, its controls, and one sentence saying what the current state means. */
export function Lab({ children, controls, readout }: { children: ReactNode; controls: ReactNode; readout: string }) {
  return (
    <div className="lab">
      {children}
      <p className="lab-readout" aria-live="polite">{readout}</p>
      <div className="lab-controls">{controls}</div>
    </div>
  );
}
