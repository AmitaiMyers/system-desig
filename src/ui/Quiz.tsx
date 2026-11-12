// One multiple-choice question at a time, with the explanation shown after answering.
import { useState } from 'react';
import type { QuizQuestion } from '../content/types';

type Props = { questions: QuizQuestion[]; finishLabel: string; onDone: (correct: number) => void };

export function Quiz({ questions, finishLabel, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = questions[index];
  const isLast = index === questions.length - 1;

  const pick = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.answerIndex) setCorrect(correct + 1);
  };
  const next = () => {
    if (isLast) return onDone(correct);
    setIndex(index + 1);
    setPicked(null);
  };
  const optionClass = (option: number) => {
    if (picked === null) return 'option';
    if (option === question.answerIndex) return 'option option-right';
    return option === picked ? 'option option-wrong' : 'option option-dim';
  };

  return (
    <div className="quiz">
      <div className="eyebrow">Question {index + 1} of {questions.length}</div>
      <h2 className="quiz-question">{question.question}</h2>
      <div className="options">
        {question.options.map((text, option) => (
          <button key={option} className={optionClass(option)} onClick={() => pick(option)}>{text}</button>
        ))}
      </div>
      {picked !== null && (
        <div className={picked === question.answerIndex ? 'callout callout-good' : 'callout callout-bad'}>
          <strong>{picked === question.answerIndex ? 'Correct.' : 'Not quite.'}</strong> {question.explanation}
        </div>
      )}
      {picked !== null && <button className="btn btn-primary btn-block" onClick={next}>{isLast ? finishLabel : 'Next question'}</button>}
    </div>
  );
}
