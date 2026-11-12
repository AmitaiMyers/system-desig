// One level from start to finish: brief → build → run → result → quiz → debrief.
import { useCallback, useMemo, useState } from 'react';
import { findCard } from '../content';
import type { CaseStudy, Level } from '../content/types';
import { fixedCost } from '../engine/cost';
import { evaluate, formatMoney, formatPercent } from '../engine/score';
import { simulate, tickToClock } from '../engine/simulate';
import type { Build, SimResult, Verdict } from '../engine/types';
import { CardView } from './Codex';
import { ComponentSheet } from './ComponentSheet';
import { Screen, Stars, useScrollTopOn } from './controls';
import { Diagram } from './Diagram';
import { describeNodes, type NodeId } from './nodes';
import { Quiz } from './Quiz';
import { RunScreen } from './RunScreen';

type Phase = 'brief' | 'build' | 'run' | 'result' | 'quiz' | 'debrief';
type Outcome = { result: SimResult; verdict: Verdict };

type Props = {
  level: Level;
  caseStudy: CaseStudy | null;
  nextLabel: string | null;
  onWin: (stars: number) => void;
  onExit: () => void;
  onNext: () => void;
};

const DATA_LOSS_TARGET = { zero: 'No data loss at all', seconds: 'Lose at most a few seconds of data', hours: 'Lose at most hours of data', all: null };

function Targets({ level }: { level: Level }) {
  const { slos } = level.scenario;
  const dataLoss = DATA_LOSS_TARGET[slos.maxDataLoss];
  return (
    <ul className="targets">
      <li>⏱️ p99 latency ≤ <b>{slos.p99Ms} ms</b></li>
      <li>✅ At least <b>{formatPercent(slos.successRate)}</b> of requests succeed</li>
      <li>💰 Monthly cost ≤ <b>{formatMoney(slos.budget)}</b></li>
      {dataLoss !== null && <li>💾 {dataLoss}</li>}
      {slos.maxQueueDelayMin !== null && <li>📨 Background jobs at most <b>{slos.maxQueueDelayMin} min</b> late</li>}
    </ul>
  );
}

function Brief({ level, onStart }: { level: Level; onStart: () => void }) {
  const { workload, incidents } = level.scenario;
  return (
    <>
      <p className="tagline">{level.tagline}</p>
      {level.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <h3>Traffic</h3>
      <ul className="targets">
        <li>📈 Peak <b>{workload.peakRps.toLocaleString()} req/s</b> (~{(workload.dau / 1e6).toLocaleString()}M daily users)</li>
        <li>📖 <b>{Math.round(workload.readRatio * 100)}%</b> of dynamic requests are reads</li>
        <li>🖼️ <b>{Math.round(workload.staticShare * 100)}%</b> of all requests are static files</li>
      </ul>
      <h3>Your targets</h3>
      <Targets level={level} />
      <h3>Forecast for today</h3>
      {incidents.length === 0 ? <p className="muted">A normal day: quiet night, lunch bump, evening peak.</p> : (
        <ul className="targets">
          {incidents.map((incident) => <li key={incident.label}>⚠️ <b>{tickToClock(incident.atTick)}</b> — {incident.label}</li>)}
        </ul>
      )}
      <button className="btn btn-primary btn-block" onClick={onStart}>Open the architecture</button>
    </>
  );
}

function ResultView({ level, outcome, onRetry, onContinue }: { level: Level; outcome: Outcome; onRetry: () => void; onContinue: () => void }) {
  const { result, verdict } = outcome;
  return (
    <>
      <div className={verdict.passed ? 'verdict verdict-pass' : 'verdict verdict-fail'}>
        {verdict.passed ? <><Stars count={verdict.stars} /><h2>You survived the day</h2></> : <h2>🔥 Post-mortem</h2>}
        <p>{verdict.passed ? starMessage(verdict.stars) : 'The system missed its targets. Here is what the incident review found.'}</p>
      </div>
      <ul className="checks">
        {verdict.checks.map((check) => (
          <li key={check.id} className={check.pass ? 'check check-pass' : 'check check-fail'}>
            <span className="check-mark">{check.pass ? '✓' : '✗'}</span>
            <span className="check-label">{check.label}<small>{check.target}</small></span>
            <span className="check-actual">{check.actual}</span>
          </li>
        ))}
      </ul>
      {verdict.findings.map((finding) => (
        <div key={finding.title} className="callout callout-bad"><strong>{finding.title}.</strong> {finding.detail}</div>
      ))}
      {!verdict.passed && <div className="callout callout-hint"><strong>Hint.</strong> {level.hint}</div>}
      <h3>Monthly bill — {formatMoney(result.cost.total)}</h3>
      <ul className="bill">
        {result.cost.lines.map((line) => <li key={line.id}><span>{line.label}</span><span>{formatMoney(line.monthly)}</span></li>)}
      </ul>
      <p className="muted">p50 latency {Math.round(result.p50Ms)} ms · p99 {Math.round(result.p99Ms)} ms</p>
      {verdict.passed && <button className="btn btn-primary btn-block" onClick={onContinue}>Continue</button>}
      <button className="btn btn-block" onClick={onRetry}>{verdict.passed ? 'Tweak the design for more stars' : 'Back to the architecture'}</button>
    </>
  );
}

function starMessage(stars: number): string {
  if (stars === 3) return 'Reliable and lean. This is what a senior design looks like.';
  if (stars === 2) return 'Solid. There is still some money on the table (3 stars = under 70% of budget).';
  return 'It works, but it is expensive (2 stars = under 85% of budget, 3 stars = under 70%).';
}

function Debrief({ level, caseStudy, nextLabel, onExit, onNext }: Pick<Props, 'level' | 'caseStudy' | 'nextLabel' | 'onExit' | 'onNext'>) {
  return (
    <>
      <h2>Concepts unlocked</h2>
      {level.cardIds.map((id) => <CardView key={id} card={findCard(id)} />)}
      {caseStudy !== null && (
        <>
          <h2>How the real thing works</h2>
          <ul className="targets">{caseStudy.debrief.map((line) => <li key={line}>{line}</li>)}</ul>
          <h3>Sources</h3>
          <ul className="sources">{caseStudy.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        </>
      )}
      {nextLabel !== null && <button className="btn btn-primary btn-block" onClick={onNext}>Next: {nextLabel}</button>}
      <button className="btn btn-block" onClick={onExit}>Back to the map</button>
    </>
  );
}

export function LevelScreen({ level, caseStudy, nextLabel, onWin, onExit, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>('brief');
  const [build, setBuild] = useState<Build>(level.initialBuild);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const nodes = useMemo(() => describeNodes(build, level.unlocked), [build, level]);
  const showResult = useCallback(() => setPhase('result'), []);
  useScrollTopOn(phase);

  const run = () => {
    const result = simulate(build, level.scenario);
    setOutcome({ result, verdict: evaluate(level.scenario, result) });
    setSelected(null);
    setPhase('run');
  };
  const finishQuiz = () => {
    if (outcome === null) throw new Error('Quiz finished without a run result');
    onWin(outcome.verdict.stars);
    setPhase('debrief');
  };

  if (phase === 'brief') {
    return <Screen title={level.title} onBack={onExit}><Brief level={level} onStart={() => setPhase('build')} /></Screen>;
  }
  if (phase === 'build') {
    const fixed = fixedCost(build, level.scenario.workload);
    const budget = level.scenario.slos.budget;
    return (
      <Screen title={level.title} onBack={() => setPhase('brief')}
        footer={
          <div className="build-footer">
            <div className={fixed > budget ? 'cost cost-over' : 'cost'}>
              <span className="cost-label">Servers &amp; services{level.scenario.workload.staticKb > 0 ? ' (before bandwidth)' : ''}</span>
              <span className="cost-value">{formatMoney(fixed)} <small>of {formatMoney(budget)}/mo</small></span>
            </div>
            <button className="btn btn-primary" onClick={run}>Run a day ▶</button>
          </div>
        }>
        <details className="targets-fold"><summary>Targets &amp; forecast</summary><Targets level={level} />
          <ul className="targets">{level.scenario.incidents.map((i) => <li key={i.label}>⚠️ <b>{tickToClock(i.atTick)}</b> — {i.label}</li>)}</ul>
        </details>
        <p className="muted">Tap a component to change it.</p>
        <Diagram nodes={nodes} onSelect={setSelected} tick={null} />
        <button className="btn btn-small btn-ghost" onClick={() => setBuild(level.initialBuild)}>Reset to the starting design</button>
        {selected !== null && <ComponentSheet nodeId={selected} build={build} level={level} onChange={setBuild} onClose={() => setSelected(null)} />}
      </Screen>
    );
  }
  if (outcome === null) throw new Error(`Phase "${phase}" requires a run result`);
  if (phase === 'run') {
    return <Screen title="Simulating a day…" onBack={null}><RunScreen result={outcome.result} incidents={level.scenario.incidents} nodes={nodes} onFinished={showResult} /></Screen>;
  }
  if (phase === 'result') {
    return <Screen title={level.title} onBack={() => setPhase('build')}><ResultView level={level} outcome={outcome} onRetry={() => setPhase('build')} onContinue={() => setPhase('quiz')} /></Screen>;
  }
  if (phase === 'quiz') {
    return <Screen title="Lock it in" onBack={null}><Quiz questions={level.quiz} finishLabel="Finish" onDone={finishQuiz} /></Screen>;
  }
  return <Screen title="Debrief" onBack={null}><Debrief level={level} caseStudy={caseStudy} nextLabel={nextLabel} onExit={onExit} onNext={onNext} /></Screen>;
}
