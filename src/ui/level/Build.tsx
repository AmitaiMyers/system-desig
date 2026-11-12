// The build stage: diagram with headroom, component settings, targets strip and the cost meter.
import { useMemo } from 'react';
import type { Level } from '../../content/types';
import { fixedCost } from '../../engine/cost';
import { formatMoney } from '../../engine/score';
import { simulate } from '../../engine/simulate';
import type { Build } from '../../engine/types';
import { Diagram } from '../diagram/Diagram';
import type { DiagramNode, NodeId } from '../diagram/nodes';
import { useAnimatedNumber } from '../primitives/hooks';
import { Icon } from '../primitives/Icon';
import { Callout } from '../primitives/Screen';
import { Sheet } from '../primitives/Sheet';
import { describeChanges } from './buildDiff';
import { InspectorBody, inspectorTitle } from './Inspector';
import { TargetStrip } from './Targets';

/** First-level guidance: one sentence and the thing it points at. */
export type Coach = { step: string; text: string; target: 'run' | 'sheet' | NodeId };

type BuildProps = {
  level: Level;
  build: Build;
  nodes: DiagramNode[];
  selected: NodeId | null;
  /** The build used for the previous run, to show what changed since. */
  lastRunBuild: Build | null;
  coach: Coach | null;
  desktop: boolean;
  onChange: (build: Build) => void;
  onSelect: (id: NodeId | null) => void;
};

function CoachNote({ coach }: { coach: Coach }) {
  return <Callout tone="info" title={`Step ${coach.step}.`}>{coach.text}</Callout>;
}

export function BuildView({ level, build, nodes, selected, lastRunBuild, coach, desktop, onChange, onSelect }: BuildProps) {
  // An incident-free day shows how much headroom each component has at the normal peak.
  const baseline = useMemo(() => simulate(build, { ...level.scenario, incidents: [] }), [build, level]);
  const changes = lastRunBuild === null ? [] : describeChanges(lastRunBuild, build);
  const coachNode = coach !== null && coach.target !== 'run' && coach.target !== 'sheet' ? coach.target : null;
  const inspector = selected !== null && (
    <>
      {coach !== null && coach.target === 'sheet' && <CoachNote coach={coach} />}
      <InspectorBody nodeId={selected} build={build} level={level} onChange={onChange} />
    </>
  );

  return (
    <div className={desktop ? 'build build-panes' : 'build'}>
      <div className="build-main">
        <TargetStrip level={level} />
        {coach !== null && coach.target !== 'sheet' && <CoachNote coach={coach} />}
        {changes.length > 0 && (
          <ul className="strip" aria-label="Changed since the last run">
            <li className="strip-label">Since last run</li>
            {changes.map((change) => <li key={change} className="chip chip-info">{change}</li>)}
          </ul>
        )}
        <Diagram nodes={nodes} mode={{ kind: 'build', onSelect, selected, baseline, coachTarget: coachNode }} />
        <p className="muted">Bars show each component’s load at the normal daily peak — before any incident.</p>
        <button className="btn btn-small btn-ghost" onClick={() => onChange(level.initialBuild)}><Icon name="reset" size={18} /> Reset to the starting design</button>
      </div>
      {desktop && (
        <aside className="inspector" aria-label="Component settings">
          {selected === null ? <p className="muted">Select a component in the diagram to change it.</p> : <><h2>{inspectorTitle(selected)}</h2>{inspector}</>}
        </aside>
      )}
      {!desktop && selected !== null && <Sheet title={inspectorTitle(selected)} onClose={() => onSelect(null)}>{inspector}</Sheet>}
    </div>
  );
}

export function BuildFooter({ level, build, coach, onRun }: { level: Level; build: Build; coach: Coach | null; onRun: () => void }) {
  const fixed = fixedCost(build, level.scenario.workload);
  const budget = level.scenario.slos.budget;
  const shown = useAnimatedNumber(fixed);
  const over = fixed > budget;
  return (
    <div className="action-bar">
      {/* The key restarts the shake each time the cost crosses the budget. */}
      <div key={String(over)} className={over ? 'cost cost-over' : 'cost'}>
        <span className="cost-label">Servers &amp; services{level.scenario.workload.staticKb > 0 ? ' (before bandwidth)' : ''}</span>
        <span className="cost-value">{formatMoney(shown)} <small>of {formatMoney(budget)}/mo{over ? ' — over budget' : ''}</small></span>
      </div>
      <button className={coach !== null && coach.target === 'run' ? 'btn btn-primary coach-target' : 'btn btn-primary'} onClick={onRun}><Icon name="play" size={18} /> Run a day</button>
    </div>
  );
}
