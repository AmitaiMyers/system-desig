// The Learn tab: every subject explained with diagrams, and the page for one subject.
import { useEffect } from 'react';
import { findCard, levelsForTopic, TOPICS } from '../../content';
import type { Level, Topic, TopicId } from '../../content/types';
import { Figure } from '../figures';
import { Icon, type IconName } from '../primitives/Icon';
import { CardView, Rich } from '../primitives/Rich';
import { Screen, TabBar } from '../primitives/Screen';
import { HOME_TABS, type HomeTab } from './tabs';

const TOPIC_ICON: Record<TopicId, IconName> = {
  scaling: 'server',
  database: 'database',
  sharding: 'balancer',
  caching: 'cache',
  delivery: 'bolt',
  async: 'queue',
  resilience: 'globe',
  interview: 'mic',
};

export function LearnScreen({ onOpenTopic, onGoTab }: { onOpenTopic: (topicId: TopicId) => void; onGoTab: (tab: HomeTab) => void }) {
  return (
    <Screen title="Learn" onBack={null} footer={<TabBar tabs={HOME_TABS} current="learn" onGo={onGoTab} />}>
      <p className="tagline">All the material, by subject — with diagrams you can play with.</p>
      {TOPICS.map((topic) => {
        const figures = topic.sections.filter((section) => section.figure !== null).length;
        return (
          <button key={topic.id} className="tile" onClick={() => onOpenTopic(topic.id)}>
            <span className="tile-badge"><Icon name={TOPIC_ICON[topic.id]} size={20} /></span>
            <span className="tile-text">
              <span className="tile-title">{topic.title}</span>
              <span className="tile-tagline">{topic.summary}</span>
              <span className="tile-meta">{topic.sections.length} sections · {figures} diagrams</span>
            </span>
            <Icon name="chevron" size={20} />
          </button>
        );
      })}
    </Screen>
  );
}

type TopicScreenProps = {
  topic: Topic;
  /** Scroll to this section on open (when arriving from a concept card). */
  focusSection: number | null;
  onBack: () => void;
  /** null when the reader is in the middle of something else and should not be sent to a level. */
  onPractice: ((level: Level) => void) | null;
};

const sectionDomId = (index: number) => `learn-section-${index}`;

export function TopicScreen({ topic, focusSection, onBack, onPractice }: TopicScreenProps) {
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
  return (
    <Screen title={topic.title} onBack={onBack}>
      <p className="tagline">{topic.summary}</p>
      {topic.sections.map((section, index) => (
        <section key={section.heading} id={sectionDomId(index)} className={index === focusSection ? 'learn-section learn-section-focus' : 'learn-section'}>
          <h2>{section.heading}</h2>
          {section.figure !== null && <Figure id={section.figure} />}
          {section.paragraphs.map((paragraph) => <p key={paragraph}><Rich text={paragraph} /></p>)}
          {section.cardIds.length > 0 && (
            <details className="fold">
              <summary>Summary card{section.cardIds.length > 1 ? 's' : ''} ({section.cardIds.length})</summary>
              <div className="stack">{section.cardIds.map((id) => <CardView key={id} card={findCard(id)} deeper={false} />)}</div>
            </details>
          )}
        </section>
      ))}
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
