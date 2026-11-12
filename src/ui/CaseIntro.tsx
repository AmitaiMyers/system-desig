// The first half of a case study: clarify requirements, then estimate the scale.
import { useState } from 'react';
import type { CaseStudy } from '../content/types';
import { Screen, useScrollTopOn } from './controls';
import { Quiz } from './Quiz';

type Step = 'requirements' | 'review' | 'estimation';

function reviewNote(good: boolean, chosen: boolean): string {
  if (good) return chosen ? '✓ Good question.' : '✗ You skipped this, but it is worth raising.';
  return chosen ? '✗ You picked a trap.' : '✓ Rightly skipped — a trap.';
}

export function CaseIntro({ caseStudy, onDone, onExit }: { caseStudy: CaseStudy; onDone: () => void; onExit: () => void }) {
  const [step, setStep] = useState<Step>('requirements');
  const [picked, setPicked] = useState<number[]>([]);
  useScrollTopOn(step);
  const toggle = (index: number) => setPicked(picked.includes(index) ? picked.filter((i) => i !== index) : [...picked, index]);

  if (step === 'estimation') {
    return (
      <Screen title="2 · Estimate" onBack={() => setStep('review')}>
        <p className="muted">Back-of-the-envelope. Aim for the right order of magnitude.</p>
        <Quiz questions={caseStudy.estimation} finishLabel="Start designing" onDone={onDone} />
      </Screen>
    );
  }

  const reviewing = step === 'review';
  const right = caseStudy.requirements.filter((r, i) => r.good === picked.includes(i)).length;
  return (
    <Screen title="1 · Clarify" onBack={onExit}>
      <div className="interviewer">🧑‍💼 <span>{caseStudy.prompt}</span></div>
      <p>{caseStudy.requirementsIntro}</p>
      <div className="options">
        {caseStudy.requirements.map((requirement, index) => {
          const chosen = picked.includes(index);
          const verdictClass = reviewing ? (requirement.good === chosen ? ' option-right' : ' option-wrong') : '';
          return (
            <button key={requirement.text} className={`option${chosen ? ' option-picked' : ''}${verdictClass}`} disabled={reviewing} onClick={() => toggle(index)}>
              <span>{chosen ? '☑' : '☐'} {requirement.text}</span>
              {reviewing && <small><b>{reviewNote(requirement.good, chosen)}</b> {requirement.why}</small>}
            </button>
          );
        })}
      </div>
      {reviewing ? (
        <>
          <div className="callout callout-good"><strong>{right} of {caseStudy.requirements.length} judged correctly.</strong> Asking the right questions is often half the interview.</div>
          <button className="btn btn-primary btn-block" onClick={() => setStep('estimation')}>Next: estimate the scale</button>
        </>
      ) : (
        <button className="btn btn-primary btn-block" disabled={picked.length === 0} onClick={() => setStep('review')}>Check my questions</button>
      )}
    </Screen>
  );
}
