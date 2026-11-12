// Renders a diagram described as data (see content/lesson.ts): nodes on a grid, arrows between them,
// and a scenario switcher when the diagram has more than one state.
import { useState } from 'react';
import type { DiagramEdgeSpec, DiagramNodeSpec, DiagramState, StateDiagram } from '../../content/types';
import { Segmented } from '../primitives/controls';
import { Arrow, Box, Cyl, Frame, WIDTH } from './kit';

const ROW_HEIGHT = 64;
const NODE_HEIGHT = 40;
const STORE_HEIGHT = 46;
const TOP = 6;
const GUTTER = 10;

type Placed = { spec: DiagramNodeSpec; x: number; y: number; w: number; h: number };

function place(spec: DiagramNodeSpec, cols: number): Placed {
  const columnWidth = WIDTH / cols;
  const h = spec.shape === 'store' ? STORE_HEIGHT : NODE_HEIGHT;
  return { spec, x: spec.col * columnWidth + GUTTER / 2, y: TOP + spec.row * ROW_HEIGHT, w: columnWidth * spec.span - GUTTER, h };
}

/** Arrows leave and enter at the sides that face each other. */
function endpoints(from: Placed, to: Placed): { x1: number; y1: number; x2: number; y2: number } {
  const centerX = (p: Placed) => p.x + p.w / 2;
  const centerY = (p: Placed) => p.y + p.h / 2;
  if (from.spec.row === to.spec.row) {
    const leftToRight = from.x < to.x;
    return { x1: leftToRight ? from.x + from.w : from.x, y1: centerY(from), x2: leftToRight ? to.x : to.x + to.w, y2: centerY(to) };
  }
  const downwards = from.y < to.y;
  return { x1: centerX(from), y1: downwards ? from.y + from.h : from.y, x2: centerX(to), y2: downwards ? to.y : to.y + to.h };
}

function EdgeView({ edge, placed }: { edge: DiagramEdgeSpec; placed: Placed[] }) {
  const find = (id: string) => {
    const found = placed.find((p) => p.spec.id === id);
    if (found === undefined) throw new Error(`Diagram edge refers to unknown node "${id}"`);
    return found;
  };
  return <Arrow {...endpoints(find(edge.from), find(edge.to))} label={edge.label === null ? undefined : edge.label} tone={edge.tone} dashed={edge.dashed} />;
}

function StateView({ state }: { state: DiagramState }) {
  const placed = state.nodes.map((spec) => place(spec, state.cols));
  const height = Math.max(...placed.map((p) => p.y + p.h)) + TOP;
  return (
    <Frame height={height} label={state.readout}>
      {state.edges.map((edge) => <EdgeView key={`${edge.from}-${edge.to}`} edge={edge} placed={placed} />)}
      {placed.map(({ spec, x, y, w, h }) => {
        const Shape = spec.shape === 'store' ? Cyl : Box;
        return <Shape key={spec.id} x={x} y={y} w={w} h={h} label={spec.label} sub={spec.sub === null ? undefined : spec.sub} tone={spec.tone} />;
      })}
    </Frame>
  );
}

export function StateDiagramView({ diagram }: { diagram: StateDiagram }) {
  const [index, setIndex] = useState(0);
  const current = diagram.states[index];
  const interactive = diagram.states.length > 1;
  return (
    <figure className="figure">
      {interactive && <figcaption className="figure-badge">Interactive — switch the scenario</figcaption>}
      <div className="lab">
        <StateView state={current} />
        <p className="lab-readout" aria-live="polite">{current.readout}</p>
        {interactive && (
          <div className="lab-controls">
            <Segmented label="Scenario" value={String(index)} onChange={(value) => setIndex(Number(value))} options={diagram.states.map((s, i) => ({ value: String(i), label: s.name }))} />
          </div>
        )}
      </div>
    </figure>
  );
}
