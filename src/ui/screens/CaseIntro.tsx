// The first half of a case study: clarify requirements, then estimate the scale.
import { useState } from 'react';
import type { CaseStudy } from '../../content/types';
import { useScrollTopOn } from '../primitives/hooks';
import { Icon } from '../primitives/Icon';
import { Callout, Screen, StepIndicator, type Step } from '../primitives/Screen';
import { Quiz } from './Quiz';

type StepId = 'clarify' | 'estimate' | 'design';
type Stage = 'requirements' | 'review' | 'estimation';

const STEPS: Step<StepId>[] = [
  { id: 'clarify', label: 'Clarify' },
  { id: 'estimate', label: 'Estimate' },
  { id: 'design', label: 'Design' },
];

function reviewNote(good: boolean, chosen: boolean): string {
  if (good) return chosen ? 'Good question.' : 'You skipped this, but it is worth raising.';
  return chosen ? 'You picked a trap.' : 'Rightly skipped — a trap.';
}

export function CaseIntro({ caseStudy, onDone, onExit }: { caseStudy: CaseStudy; onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<Stage>('requirements');
  const [picked, setPicked] = useState<number[]>([]);
  useScrollTopOn(stage);
  const toggle = (index: number) => setPicked(picked.includes(index) ? picked.filter((i) => i !== index) : [...picked, index]);
  const steps = (current: StepId) => <StepIndicator steps={STEPS} current={current} canGo={(step) => step === 'clarify'} onGo={() => setStage('review')} />;

  if (stage === 'estimation') {
    return (
      <Screen title={caseStudy.title} subheader={steps('estimate')} onBack={() => setStage('review')}>
        <p className="muted">Back-of-the-envelope. Aim for the right order of magnitude.</p>
        <Quiz questions={caseStudy.estimation} finishLabel="Start designing" onDone={onDone} />
      </Screen>
    );
  }

  const reviewing = stage === 'review';
  const right = caseStudy.requirements.filter((r, i) => r.good === picked.includes(i)).length;
  const footer = reviewing
    ? <button className="btn btn-primary btn-block" onClick={() => setStage('estimation')}>Next: estimate the scale</button>
    : <button className="btn btn-primary btn-block" disabled={picked.length === 0} onClick={() => setStage('review')}>{picked.length === 0 ? 'Pick at least one question' : 'Check my questions'}</button>;

  return (
    <Screen title={caseStudy.title} subheader={steps('clarify')} onBack={onExit} footer={footer}>
      <div className="interviewer"><Icon name="mic" /> <span>{caseStudy.prompt}</span></div>
      <p>{caseStudy.requirementsIntro}</p>
      {reviewing && <Callout tone="good" title={`${right} of ${caseStudy.requirements.length} judged correctly.`}>Asking the right questions is often half the interview.</Callout>}
      <div className="options" role="group" aria-label="Questions you could ask">
        {caseStudy.requirements.map((requirement, index) => {
          const chosen = picked.includes(index);
          const judgedRight = requirement.good === chosen;
          const verdictClass = reviewing ? (judgedRight ? ' option-right' : ' option-wrong') : '';
          return (
            <button key={requirement.text} role="checkbox" aria-checked={chosen} aria-disabled={reviewing}
              className={`option${chosen ? ' option-picked' : ''}${verdictClass}`} onClick={() => !reviewing && toggle(index)}>
              <span className="option-row">
                <span className={chosen ? 'checkbox checkbox-on' : 'checkbox'} aria-hidden="true">{chosen && <Icon name="check" size={14} />}</span>
                <span>{requirement.text}</span>
              </span>
              {reviewing && <small><Icon name={judgedRight ? 'check' : 'cross'} size={14} /> <b>{reviewNote(requirement.good, chosen)}</b> {requirement.why}</small>}
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
