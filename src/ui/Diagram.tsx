// The lane diagram. In build mode nodes are tappable; in run mode they show live load.
import type { TickResult } from '../engine/types';
import { DIAGRAM_ROWS, nodeUtilization, type DiagramNode, type NodeId } from './nodes';

type Props = {
  nodes: DiagramNode[];
  /** Build mode: called when a node is tapped. */
  onSelect: ((id: NodeId) => void) | null;
  /** Run mode: the tick being replayed. */
  tick: TickResult | null;
};

const DOWN_UTILIZATION = 9.9;

function loadClass(utilization: number): string {
  if (utilization >= 1) return 'load-red';
  if (utilization >= 0.9) return 'load-orange';
  if (utilization >= 0.7) return 'load-amber';
  return 'load-green';
}

function NodeBox({ node, onSelect, tick }: { node: DiagramNode; onSelect: Props['onSelect']; tick: TickResult | null }) {
  const utilization = tick !== null && node.present ? nodeUtilization(node.id, tick) : null;
  const classes = ['node', node.present ? 'node-on' : 'node-off', utilization !== null ? loadClass(utilization) : ''].join(' ');
  const tappable = onSelect !== null && node.editable;
  return (
    <button className={classes} disabled={!tappable} onClick={() => onSelect !== null && onSelect(node.id)}>
      <span className="node-icon">{node.icon}</span>
      <span className="node-text">
        <span className="node-name">{node.present ? node.name : `+ ${node.name}`}</span>
        <span className="node-summary">{node.summary}</span>
        {utilization !== null && (
          <span className="load">
            <span className="load-bar"><span className="load-fill" style={{ width: `${Math.min(utilization, 1) * 100}%` }} /></span>
            <span className="load-value">{utilization > DOWN_UTILIZATION ? 'DOWN' : `${Math.round(utilization * 100)}%`}</span>
          </span>
        )}
      </span>
      {tappable && <span className="node-edit">›</span>}
    </button>
  );
}

export function Diagram({ nodes, onSelect, tick }: Props) {
  const find = (id: NodeId | null) => nodes.find((n) => n.id === id);
  const regions = find('regions');
  const showRegions = regions !== undefined && (regions.editable || regions.summary !== '1 region');
  const rows = DIAGRAM_ROWS.map((row) => ({ main: find(row.main), side: find(row.side) })).filter((row) => row.main !== undefined || row.side !== undefined);
  return (
    <div className="diagram">
      {showRegions && <NodeBox node={regions} onSelect={onSelect} tick={tick} />}
      <div className="users">👥 Users{tick !== null && <strong> · {Math.round(tick.rps).toLocaleString()} req/s</strong>}</div>
      {rows.map((row, index) => (
        <div key={index} className="lane">
          <div className="arrow">↓</div>
          <div className="lane-row">
            {row.main !== undefined && <NodeBox node={row.main} onSelect={onSelect} tick={tick} />}
            {row.side !== undefined && <NodeBox node={row.side} onSelect={onSelect} tick={tick} />}
          </div>
        </div>
      ))}
    </div>
  );
}
