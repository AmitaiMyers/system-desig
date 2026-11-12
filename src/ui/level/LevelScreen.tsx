// One level from start to finish: brief → build → run → review → learn (quiz + debrief).
import { useCallback, useMemo, useState } from 'react';
import { findCard, topicForCard } from '../../content';
import type { CaseStudy, Level } from '../../content/types';
import { evaluate } from '../../engine/score';
import { simulate } from '../../engine/simulate';
import type { Build } from '../../engine/types';
import { describeNodes, type NodeId } from '../diagram/nodes';
import { Figure } from '../figures';
import { DESKTOP_QUERY, useMediaQuery, useScrollTopOn } from '../primitives/hooks';
import { Icon } from '../primitives/Icon';
import { useOpenCardTopic } from '../primitives/nav';
import { CardView, Rich } from '../primitives/Rich';
import { Screen, StepIndicator, type Step } from '../primitives/Screen';
import { RunScreen } from '../run/RunScreen';
import { Quiz } from '../screens/Quiz';
import { BuildFooter, BuildView, type Coach } from './Build';
import { describeChanges } from './buildDiff';
import { ReviewView, type Outcome } from './Review';
import { ForecastList, IconRow, TargetList } from './Targets';

type Phase = 'brief' | 'build' | 'run' | 'review' | 'quiz' | 'debrief';
type StepId = 'brief' | 'build' | 'run' | 'review' | 'learn';

type Props = {
  level: Level;
  caseStudy: CaseStudy | null;
  /** Guide the player through their very first run. */
  tutorial: boolean;
  nextLabel: string | null;
  onWin: (stars: number) => void;
  onExit: () => void;
  onNext: () => void;
};

const STEPS: Step<StepId>[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'build', label: 'Build' },
  { id: 'run', label: 'Run' },
  { id: 'review', label: 'Review' },
  { id: 'learn', label: 'Learn' },
];
const STEP_OF_PHASE: Record<Phase, StepId> = { brief: 'brief', build: 'build', run: 'run', review: 'review', quiz: 'learn', debrief: 'learn' };

function coachFor(hasRun: boolean, changed: boolean, sheetOpen: boolean): Coach {
  if (!hasRun) return { step: '1 of 3', text: 'This is your whole system: one small server. Press “Run a day” to see how it copes.', target: 'run' };
  if (changed) return { step: '3 of 3', text: 'Design changed. Run the day again and see if it holds.', target: 'run' };
  if (sheetOpen) return { step: '2 of 3', text: 'Pick a bigger server size, then press Done.', target: 'sheet' };
  return { step: '2 of 3', text: 'It broke. Tap the server to change it.', target: 'app' };
}

function Brief({ level }: { level: Level }) {
  const { workload } = level.scenario;
  const openCardTopic = useOpenCardTopic();
  return (
    <>
      <p className="tagline">{level.tagline}</p>
      {level.story.map((paragraph) => <p key={paragraph}><Rich text={paragraph} /></p>)}
      <h3>The idea behind this level</h3>
      <Figure id={level.lab} />
      <button className="btn btn-small" onClick={() => openCardTopic(level.cardIds[0])}><Icon name="book" size={18} /> Study this subject: {topicForCard(level.cardIds[0]).topic.title}</button>
      <h3>Traffic</h3>
      <ul className="rows">
        <IconRow icon="trend">Peak <b>{workload.peakRps.toLocaleString()} req/s</b> (~{(workload.dau / 1e6).toLocaleString()}M daily users)</IconRow>
        <IconRow icon="book"><b>{Math.round(workload.readRatio * 100)}%</b> of dynamic requests are reads</IconRow>
        <IconRow icon="image"><b>{Math.round(workload.staticShare * 100)}%</b> of all requests are static files</IconRow>
      </ul>
      <h3>Your targets</h3>
      <TargetList level={level} />
      <h3>Forecast for today</h3>
      <ForecastList level={level} />
    </>
  );
}

function Debrief({ level, caseStudy }: { level: Level; caseStudy: CaseStudy | null }) {
  return (
    <>
      <h2>Concepts unlocked</h2>
      {level.cardIds.map((id, index) => (
        <div key={id} className="reveal" style={{ animationDelay: `${index * 140}ms` }}><CardView card={findCard(id)} /></div>
      ))}
      {caseStudy !== null && (
        <>
          <h2>How the real thing works</h2>
          <ul className="rows">{caseStudy.debrief.map((line) => <li key={line}>{line}</li>)}</ul>
          <h3>Sources</h3>
          <ul className="sources">{caseStudy.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        </>
      )}
    </>
  );
}

export function LevelScreen({ level, caseStudy, tutorial, nextLabel, onWin, onExit, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>('brief');
  const [build, setBuild] = useState<Build>(level.initialBuild);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lastRunBuild, setLastRunBuild] = useState<Build | null>(null);
  /** When set, the run opens paused at this moment instead of playing from midnight. */
  const [replayTick, setReplayTick] = useState<number | null>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const nodes = useMemo(() => describeNodes(build, level.unlocked), [build, level]);
  const runNodes = useMemo(() => describeNodes(lastRunBuild === null ? build : lastRunBuild, level.unlocked), [build, lastRunBuild, level]);
  const showReview = useCallback(() => setPhase('review'), []);
  useScrollTopOn(phase);

  const run = () => {
    const result = simulate(build, level.scenario);
    setOutcome({ result, verdict: evaluate(level.scenario, result) });
    setLastRunBuild(build);
    setSelected(null);
    setReplayTick(null);
    setPhase('run');
  };
  const showMoment = (tick: number) => {
    setReplayTick(tick);
    setPhase('run');
  };
  const finishQuiz = () => {
    if (outcome === null) throw new Error('Quiz finished without a run result');
    onWin(outcome.verdict.stars);
    setPhase('debrief');
  };

  const beforeLearning = phase !== 'quiz' && phase !== 'debrief';
  const canGo = (step: StepId) => beforeLearning && (step === 'brief' || step === 'build' || (step === 'review' && outcome !== null));
  const subheader = <StepIndicator steps={STEPS} current={STEP_OF_PHASE[phase]} canGo={canGo} onGo={(step) => setPhase(step as Phase)} />;
  const frame = { title: level.title, subheader };

  if (phase === 'brief') {
    return (
      <Screen {...frame} onBack={onExit} footer={<button className="btn btn-primary btn-block" onClick={() => setPhase('build')}>Open the architecture</button>}>
        <Brief level={level} />
      </Screen>
    );
  }
  if (phase === 'build') {
    const changed = lastRunBuild !== null && describeChanges(lastRunBuild, build).length > 0;
    const coach = tutorial ? coachFor(outcome !== null, changed, selected !== null) : null;
    return (
      <Screen {...frame} wide={desktop} onBack={() => setPhase('brief')} footer={<BuildFooter level={level} build={build} coach={coach} onRun={run} />}>
        <BuildView level={level} build={build} nodes={nodes} selected={selected} lastRunBuild={lastRunBuild} coach={coach} desktop={desktop} onChange={setBuild} onSelect={setSelected} />
      </Screen>
    );
  }
  if (outcome === null) throw new Error(`Phase "${phase}" requires a run result`);
  const { verdict } = outcome;

  if (phase === 'run') {
    return (
      <Screen {...frame} onBack={() => setPhase('build')} footer={<button className="btn btn-primary btn-block" onClick={showReview}>See results</button>}>
        <RunScreen key={String(replayTick)} result={outcome.result} incidents={level.scenario.incidents} nodes={runNodes} startTick={replayTick} onFinished={showReview} />
      </Screen>
    );
  }
  if (phase === 'review') {
    return (
      <Screen {...frame} onBack={() => setPhase('build')}
        footer={
          <div className="action-bar">
            <button className="btn" onClick={() => setPhase('build')}>{verdict.passed ? 'Tweak design' : 'Back to the architecture'}</button>
            {verdict.passed && <button className="btn btn-primary" onClick={() => setPhase('quiz')}>Continue</button>}
          </div>
        }>
        <ReviewView level={level} outcome={outcome} onShowMoment={showMoment} />
      </Screen>
    );
  }
  if (phase === 'quiz') {
    return <Screen {...frame} onBack={null}><Quiz questions={level.quiz} finishLabel="Finish" onDone={finishQuiz} /></Screen>;
  }
  return (
    <Screen {...frame} onBack={null}
      footer={
        <div className="action-bar">
          <button className="btn" onClick={onExit}><Icon name="map" size={18} /> Map</button>
          {nextLabel !== null && <button className="btn btn-primary" onClick={onNext}>Next: {nextLabel}</button>}
        </div>
      }>
      <Debrief level={level} caseStudy={caseStudy} />
    </Screen>
  );
}
