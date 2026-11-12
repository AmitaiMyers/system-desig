// One multiple-choice question at a time, with the explanation shown after answering.
import { useState } from 'react';
import type { QuizQuestion } from '../../content/types';
import { Icon } from '../primitives/Icon';
import { Rich } from '../primitives/Rich';
import { Callout } from '../primitives/Screen';

type Props = { questions: QuizQuestion[]; finishLabel: string; onDone: (correct: number) => void };

export function Quiz({ questions, finishLabel, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answered = picked !== null;

  const pick = (option: number) => {
    if (answered) return;
    setPicked(option);
    if (option === question.answerIndex) setCorrect(correct + 1);
  };
  const next = () => {
    if (isLast) return onDone(correct);
    setIndex(index + 1);
    setPicked(null);
  };
  const verdictOf = (option: number): 'right' | 'wrong' | 'dim' | null => {
    if (!answered) return null;
    if (option === question.answerIndex) return 'right';
    return option === picked ? 'wrong' : 'dim';
  };

  return (
    <div className="quiz">
      <div className="overline">Question {index + 1} of {questions.length}</div>
      <h2 className="quiz-question">{question.question}</h2>
      <div className="options">
        {question.options.map((text, option) => {
          const verdict = verdictOf(option);
          return (
            <button key={`${index}-${option}`} className={verdict === null ? 'option' : `option option-${verdict}`} aria-disabled={answered} onClick={() => pick(option)}>
              <span className="option-row">
                <span>{text}</span>
                {verdict === 'right' && <><Icon name="check" size={20} /><span className="sr-only">Correct answer</span></>}
                {verdict === 'wrong' && <><Icon name="cross" size={20} /><span className="sr-only">Your answer, incorrect</span></>}
              </span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <Callout tone={picked === question.answerIndex ? 'good' : 'bad'} title={picked === question.answerIndex ? 'Correct.' : 'Not quite.'}>
            <Rich text={question.explanation} />
          </Callout>
        )}
      </div>
      {answered && <button className="btn btn-primary btn-block" onClick={next}>{isLast ? finishLabel : 'Next question'}</button>}
    </div>
  );
}
