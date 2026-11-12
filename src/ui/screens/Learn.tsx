// The Learn tab: a subject switcher, the topics of the chosen subject, and the page for one topic.
import { useEffect, useState } from 'react';
import { findCard, findTrack, levelsForTopic, TRACKS } from '../../content';
import type { Level, Topic, TrackId } from '../../content/types';
import { quizProgressId, quizStars, starsFor, type Progress } from '../../state/progress';
import { SectionFigure } from '../figures';
import { Stars } from '../primitives/controls';
import { Icon } from '../primitives/Icon';
import { CardView, Rich } from '../primitives/Rich';
import { Callout, Screen, TabBar } from '../primitives/Screen';
import { Quiz } from './Quiz';
import { HOME_TABS, type HomeTab } from './tabs';

type LearnScreenProps = {
  trackId: TrackId;
  progress: Progress;
  onSelectTrack: (trackId: TrackId) => void;
  onOpenTopic: (topicId: string) => void;
  onGoTab: (tab: HomeTab) => void;
};

function diagramCount(topic: Topic): number {
  return topic.sections.filter((section) => section.figure !== null).length;
}

export function LearnScreen({ trackId, progress, onSelectTrack, onOpenTopic, onGoTab }: LearnScreenProps) {
  const track = findTrack(trackId);
  const quizTopics = track.topics.filter((topic) => topic.quiz.length > 0);
  const passed = quizTopics.filter((topic) => starsFor(progress, quizProgressId(topic.id)) > 0).length;
  return (
    <Screen title="Learn" onBack={null} footer={<TabBar tabs={HOME_TABS} current="learn" onGo={onGoTab} />}>
      <div className="strip subject-strip" role="tablist" aria-label="Subjects">
        {TRACKS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === trackId} className={t.id === trackId ? 'subject subject-on' : 'subject'} onClick={() => onSelectTrack(t.id)}>{t.title}</button>
        ))}
      </div>
      <p className="tagline">{track.summary}</p>
      {quizTopics.length > 0 && <p className="muted">{passed} of {quizTopics.length} quizzes passed in this subject.</p>}
      {track.topics.map((topic, index) => {
        const hasQuiz = topic.quiz.length > 0;
        const diagrams = diagramCount(topic);
        return (
          <button key={topic.id} className="tile" onClick={() => onOpenTopic(topic.id)}>
            <span className="tile-badge">{index + 1}</span>
            <span className="tile-text">
              <span className="tile-title">{topic.title}</span>
              <span className="tile-tagline">{topic.summary}</span>
              <span className="tile-meta">{diagrams} diagram{diagrams === 1 ? '' : 's'}{hasQuiz ? ` · ${topic.quiz.length}-question quiz` : ` · ${topic.sections.length} sections`}</span>
            </span>
            {hasQuiz ? <Stars count={starsFor(progress, quizProgressId(topic.id))} /> : <Icon name="chevron" size={20} />}
          </button>
        );
      })}
    </Screen>
  );
}

type TopicQuizProps = { topic: Topic; bestStars: number; onPassed: (stars: number) => void };

/** The topic's quiz: start it, answer, and see the score. Any star unlocks the topic's cards. */
function TopicQuiz({ topic, bestStars, onPassed }: TopicQuizProps) {
  const [stage, setStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [correct, setCorrect] = useState(0);
  const total = topic.quiz.length;
  const finish = (score: number) => {
    setCorrect(score);
    setStage('done');
    const stars = quizStars(score, total);
    if (stars > 0) onPassed(stars);
  };

  if (stage === 'running') return <Quiz questions={topic.quiz} finishLabel="See my score" onDone={finish} />;
  const earned = quizStars(correct, total);
  return (
    <>
      {stage === 'done' && (
        <Callout tone={earned > 0 ? 'good' : 'bad'} title={`${correct} of ${total} correct.`}>
          {earned > 0 ? <>You earned <Stars count={earned} animated /> and unlocked this topic’s concept card.</> : 'Read the section again and retry — one right answer is enough to unlock the card.'}
        </Callout>
      )}
      <div className="quiz-start">
        <span className="quiz-best">Best: <Stars count={Math.max(bestStars, earned)} /></span>
        <button className="btn btn-primary" onClick={() => setStage('running')}>{stage === 'done' || bestStars > 0 ? 'Retake the quiz' : `Take the quiz (${total} questions)`}</button>
      </div>
    </>
  );
}

type TopicScreenProps = {
  topic: Topic;
  /** Scroll to this section on open (when arriving from a concept card). */
  focusSection: number | null;
  /** Best quiz result so far (0 when not passed or the topic has no quiz). */
  quizBestStars: number;
  onQuizPassed: (stars: number) => void;
  onBack: () => void;
  /** null when the reader is in the middle of something else and should not be sent to a level. */
  onPractice: ((level: Level) => void) | null;
};

const sectionDomId = (index: number) => `learn-section-${index}`;

export function TopicScreen({ topic, focusSection, quizBestStars, onQuizPassed, onBack, onPractice }: TopicScreenProps) {
  useEffect(() => {
    // Never return scrollTo's result from an effect: newer browsers make it a Promise.
    if (focusSection === null) {
      window.scrollTo(0, 0);
      return;
    }
    const section = document.getElementById(sectionDomId(focusSection));
    if (section === null) throw new Error(`Topic "${topic.id}" has no section ${focusSection}`);
    section.scrollIntoView();
  }, [topic, focusSection]);

  const practice = levelsForTopic(topic);
  const isLesson = topic.sections.length === 1;
  return (
    <Screen title={topic.title} onBack={onBack}>
      <p className="tagline">{topic.summary}</p>
      {topic.sections.map((section, index) => (
        <section key={section.heading} id={sectionDomId(index)} className={index === focusSection && !isLesson ? 'learn-section learn-section-focus' : 'learn-section'}>
          {!isLesson && <h2>{section.heading}</h2>}
          {section.figure !== null && <SectionFigure figure={section.figure} />}
          {section.paragraphs.map((paragraph) => <p key={paragraph}><Rich text={paragraph} /></p>)}
          {section.cardIds.length > 0 && (
            <details className="fold">
              <summary>Summary card{section.cardIds.length > 1 ? 's' : ''} ({section.cardIds.length})</summary>
              <div className="stack">{section.cardIds.map((id) => <CardView key={id} card={findCard(id)} deeper={false} />)}</div>
            </details>
          )}
        </section>
      ))}
      {topic.quiz.length > 0 && (
        <>
          <h2>Check yourself</h2>
          <TopicQuiz key={topic.id} topic={topic} bestStars={quizBestStars} onPassed={onQuizPassed} />
        </>
      )}
      {onPractice !== null && practice.length > 0 && (
        <>
          <h2>Practice this</h2>
          {practice.map((level) => (
            <button key={level.id} className="tile" onClick={() => onPractice(level)}>
              <span className="tile-badge"><Icon name="play" size={18} /></span>
              <span className="tile-text"><span className="tile-title">{level.title}</span><span className="tile-tagline">{level.tagline}</span></span>
              <Icon name="chevron" size={20} />
            </button>
          ))}
        </>
      )}
    </Screen>
  );
}
