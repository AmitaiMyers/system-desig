// The level's targets and forecast, as a full list (brief) and as a compact always-visible strip (build).
import type { ReactNode } from 'react';
import type { Level } from '../../content/types';
import { formatMoney, formatPercent } from '../../engine/score';
import { tickToClock } from '../../engine/simulate';
import { Icon, type IconName } from '../primitives/Icon';

const DATA_LOSS_TARGET = { zero: 'No data loss at all', seconds: 'Lose at most a few seconds of data', hours: 'Lose at most hours of data', all: null };
const DATA_LOSS_CHIP = { zero: 'no data loss', seconds: 'data loss ≤ seconds', hours: 'data loss ≤ hours', all: null };

export function IconRow({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <li className="icon-row"><Icon name={icon} size={20} /><span>{children}</span></li>;
}

export function TargetList({ level }: { level: Level }) {
  const { slos } = level.scenario;
  const dataLoss = DATA_LOSS_TARGET[slos.maxDataLoss];
  return (
    <ul className="rows">
      <IconRow icon="clock">p99 latency ≤ <b>{slos.p99Ms} ms</b></IconRow>
      <IconRow icon="check">At least <b>{formatPercent(slos.successRate)}</b> of requests succeed</IconRow>
      <IconRow icon="money">Monthly cost ≤ <b>{formatMoney(slos.budget)}</b></IconRow>
      {dataLoss !== null && <IconRow icon="database">{dataLoss}</IconRow>}
      {slos.maxQueueDelayMin !== null && <IconRow icon="queue">Background jobs at most <b>{slos.maxQueueDelayMin} min</b> late</IconRow>}
    </ul>
  );
}

export function ForecastList({ level }: { level: Level }) {
  const { incidents } = level.scenario;
  if (incidents.length === 0) return <p className="muted">A normal day: quiet night, lunch bump, evening peak.</p>;
  return (
    <ul className="rows">
      {incidents.map((incident) => <IconRow key={incident.label} icon="alert"><b>{tickToClock(incident.atTick)}</b> — {incident.label}</IconRow>)}
    </ul>
  );
}

/** One scrollable line of chips so the targets never leave the screen while building. */
export function TargetStrip({ level }: { level: Level }) {
  const { slos, incidents } = level.scenario;
  const dataLoss = DATA_LOSS_CHIP[slos.maxDataLoss];
  return (
    <ul className="strip" aria-label="Targets and forecast">
      <li className="chip">p99 ≤ {slos.p99Ms} ms</li>
      <li className="chip">≥ {formatPercent(slos.successRate)} succeed</li>
      <li className="chip">≤ {formatMoney(slos.budget)}/mo</li>
      {dataLoss !== null && <li className="chip">{dataLoss}</li>}
      {slos.maxQueueDelayMin !== null && <li className="chip">jobs ≤ {slos.maxQueueDelayMin} min late</li>}
      {incidents.map((incident) => (
        <li key={incident.label} className="chip chip-warn"><Icon name="alert" size={14} /> {tickToClock(incident.atTick)} {incident.label}</li>
      ))}
    </ul>
  );
}
