// The lane diagram. Build mode: tappable nodes with headroom bars. Run mode: live load,
// trouble badges and the request flow.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SimResult, TickResult } from '../../engine/types';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../primitives/hooks';
import { Icon } from '../primitives/Icon';
import { DIAGRAM_ROWS, nodeTrouble, nodeUtilization, peakUtilization, type DiagramNode, type NodeId } from './nodes';
import { RequestFlow, type Station } from './RequestFlow';

export type DiagramMode =
  | { kind: 'build'; onSelect: (id: NodeId) => void; selected: NodeId | null; baseline: SimResult; coachTarget: NodeId | null }
  | { kind: 'run'; tick: TickResult; maxRps: number; playing: boolean };

const DOWN_UTILIZATION = 9.9;

function loadClass(utilization: number): string {
  if (utilization >= 1) return 'load-red';
  if (utilization >= 0.9) return 'load-orange';
  if (utilization >= 0.7) return 'load-amber';
  return 'load-green';
}

function loadText(utilization: number): string {
  return utilization > DOWN_UTILIZATION ? 'DOWN' : `${Math.round(utilization * 100)}%`;
}

function LoadBar({ utilization, caption }: { utilization: number; caption: string }) {
  return (
    <span className="load">
      <span className="load-caption">{caption}</span>
      <span className="load-bar"><span className="load-fill" style={{ transform: `scaleX(${Math.min(utilization, 1)})` }} /></span>
      <span className="load-value">{loadText(utilization)}</span>
    </span>
  );
}

/** A ring that flashes once each time the node's settings change, so the eye finds what moved. */
function ChangePulse({ signature }: { signature: string }) {
  const previous = useRef(signature);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    setPulse((count) => count + 1);
  }, [signature]);
  return pulse === 0 ? null : <span key={pulse} className="node-pulse" aria-hidden="true" />;
}

function NodeBox({ node, mode }: { node: DiagramNode; mode: DiagramMode }) {
  const title = node.present ? node.name : `Add ${node.name.toLowerCase()}`;
  const body = (utilization: number | null, caption: string, trouble: string | null) => (
    <>
      <span className="node-icon"><Icon name={node.icon} /></span>
      <span className="node-text">
        <span className="node-name">{title}</span>
        <span className="node-summary">{node.summary}</span>
        {utilization !== null && <LoadBar utilization={utilization} caption={caption} />}
        {trouble !== null && <span className="node-trouble"><Icon name="alert" size={14} /> {trouble}</span>}
      </span>
    </>
  );

  if (mode.kind === 'run') {
    const utilization = node.present ? nodeUtilization(node.id, mode.tick) : null;
    const trouble = node.present ? nodeTrouble(node.id, mode.tick) : null;
    const classes = ['node', node.present ? 'node-on' : 'node-off', utilization !== null ? loadClass(utilization) : '', trouble !== null ? 'node-troubled' : ''].join(' ');
    return <div className={classes}>{body(utilization, 'Load', trouble)}</div>;
  }

  const peak = node.present ? peakUtilization(node.id, mode.baseline) : null;
  const classes = [
    'node', node.present ? 'node-on' : 'node-off', peak !== null ? loadClass(peak) : '',
    mode.selected === node.id ? 'node-selected' : '', mode.coachTarget === node.id ? 'coach-target' : '',
  ].join(' ');
  if (!node.editable) return <div className={classes}>{body(peak, 'Normal peak', null)}</div>;
  const label = `${title}: ${node.summary}${peak !== null ? `. Normal peak load ${loadText(peak)}` : ''}. Tap to change.`;
  return (
    <button className={`${classes} node-tappable`} aria-label={label} aria-pressed={mode.selected === node.id} onClick={() => mode.onSelect(node.id)}>
      {body(peak, 'Normal peak', null)}
      <span className="node-edit"><Icon name="chevron" size={20} /></span>
      <ChangePulse signature={node.summary} />
    </button>
  );
}

export function Diagram({ nodes, mode }: { nodes: DiagramNode[]; mode: DiagramMode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ stations: Station[]; height: number }>({ stations: [], height: 0 });
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const find = (id: NodeId | null) => nodes.find((n) => n.id === id);
  const regions = find('regions');
  const showRegions = regions !== undefined && (regions.editable || regions.summary !== '1 region');
  const rows = DIAGRAM_ROWS.map((row) => ({ id: row.main, main: find(row.main), side: find(row.side) })).filter((row) => row.main !== undefined || row.side !== undefined);
  const showFlow = mode.kind === 'run' && !reducedMotion;

  // The request flow needs to know where each lane sits; re-measure whenever the layout changes.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) throw new Error('Diagram mounted without its container');
    const measure = () => {
      const lanes = [...container.querySelectorAll<HTMLElement>('[data-station]')];
      setLayout({
        stations: lanes.map((lane) => ({ id: lane.dataset.station as NodeId, y: lane.offsetTop + lane.offsetHeight / 2 })),
        height: container.offsetHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [rows.length, showFlow]);

  return (
    <div className={showFlow ? 'diagram diagram-flow' : 'diagram'} ref={containerRef}>
      {mode.kind === 'run' && showFlow && layout.stations.length > 0 && (
        <RequestFlow stations={layout.stations} height={layout.height} tick={mode.tick} maxRps={mode.maxRps} playing={mode.playing} />
      )}
      <ol className="diagram-list" aria-label="Architecture, from users down to data">
        {showRegions && <li><NodeBox node={regions} mode={mode} /></li>}
        <li className="users">
          <Icon name="users" size={20} /> Users
          {mode.kind === 'run' && <strong> · {Math.round(mode.tick.rps).toLocaleString()} req/s</strong>}
        </li>
        {rows.map((row) => (
          <li key={row.id} className="lane" data-station={row.id}>
            {row.main !== undefined && <NodeBox node={row.main} mode={mode} />}
            {row.side !== undefined && <NodeBox node={row.side} mode={mode} />}
          </li>
        ))}
      </ol>
    </div>
  );
}
