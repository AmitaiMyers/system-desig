// The review stage: targets revealed one by one, then the post-mortem or the stars.
import type { Level } from '../../content/types';
import { formatMoney } from '../../engine/score';
import { tickToClock } from '../../engine/simulate';
import type { SimResult, Verdict } from '../../engine/types';
import { Stars } from '../primitives/controls';
import { Icon } from '../primitives/Icon';
import { Rich } from '../primitives/Rich';
import { Callout } from '../primitives/Screen';

export type Outcome = { result: SimResult; verdict: Verdict };

type Props = { level: Level; outcome: Outcome; onShowMoment: (tick: number) => void };

const REVEAL_STEP_MS = 120;

function starMessage(stars: number): string {
  if (stars === 3) return 'Reliable and lean. This is what a senior design looks like.';
  if (stars === 2) return 'Solid. There is still some money on the table (3 stars = under 70% of budget).';
  return 'It works, but it is expensive (2 stars = under 85% of budget, 3 stars = under 70%).';
}

export function ReviewView({ level, outcome, onShowMoment }: Props) {
  const { result, verdict } = outcome;
  const afterChecks = verdict.checks.length * REVEAL_STEP_MS;
  return (
    <>
      <div className={verdict.passed ? 'verdict verdict-pass' : 'verdict verdict-fail'} role="status">
        {verdict.passed && <Stars count={verdict.stars} animated />}
        <h2>{verdict.passed ? 'You survived the day' : 'Post-mortem'}</h2>
        <p>{verdict.passed ? starMessage(verdict.stars) : 'The system missed its targets. Here is what the incident review found.'}</p>
      </div>

      <ul className="checks">
        {verdict.checks.map((check, index) => (
          <li key={check.id} className={check.pass ? 'check check-pass reveal' : 'check check-fail reveal'} style={{ animationDelay: `${index * REVEAL_STEP_MS}ms` }}>
            <span className="check-mark"><Icon name={check.pass ? 'check' : 'cross'} size={16} /></span>
            <span className="check-label">{check.label}<small>{check.target}</small></span>
            <span className="check-actual"><span className="sr-only">{check.pass ? 'Met: ' : 'Missed: '}</span>{check.actual}</span>
          </li>
        ))}
      </ul>

      <div className="reveal stack" style={{ animationDelay: `${afterChecks}ms` }}>
        {verdict.findings.map(({ title, detail, tick }) => (
          <Callout key={title} tone="bad" title={`${title}.`}
            action={tick !== null ? <button className="btn btn-small" onClick={() => onShowMoment(tick)}>Show me {tickToClock(tick)}</button> : undefined}>
            <Rich text={detail} />
          </Callout>
        ))}
        {!verdict.passed && <Callout tone="info" title="Hint."><Rich text={level.hint} /></Callout>}

        <h3>Monthly bill — {formatMoney(result.cost.total)}</h3>
        <ul className="bill">
          {result.cost.lines.map((line) => <li key={line.id}><span>{line.label}</span><span>{formatMoney(line.monthly)}</span></li>)}
        </ul>
        <p className="muted">p50 latency {Math.round(result.p50Ms)} ms · p99 {Math.round(result.p99Ms)} ms</p>
      </div>
    </>
  );
}
