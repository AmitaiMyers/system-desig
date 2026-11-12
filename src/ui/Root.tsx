import { useEffect, useRef, useState } from 'react';
import { CAMPAIGN, CASES, findCampaignLevel, findCase, findTopic, topicForCard } from '../content';
import type { Level, TopicId } from '../content/types';
import { loadProgress, recordWin, saveProgress, starsFor, type Progress } from '../state/progress';
import { LevelScreen } from './level/LevelScreen';
import { useScrollTopOn } from './primitives/hooks';
import { OpenCardTopicContext } from './primitives/nav';
import { CaseIntro } from './screens/CaseIntro';
import { LearnScreen, TopicScreen } from './screens/Learn';
import { CodexScreen, MapScreen } from './screens/Map';
import type { HomeTab } from './screens/tabs';

type View =
  | { name: HomeTab }
  | { name: 'level'; levelId: string }
  | { name: 'caseIntro'; caseId: string }
  | { name: 'caseLevel'; caseId: string };

/** A Learn subject shown on top of the current view, so opening it never loses what is underneath. */
type TopicOverlay = { topicId: TopicId; focusSection: number | null };

const MAP: View = { name: 'map' };
const FIRST_LEVEL = CAMPAIGN[0];

/** A brand-new player starts inside the first level; everyone else starts on the map. */
function initialView(progress: Progress): View {
  const isNewPlayer = Object.keys(progress.stars).length === 0 && !progress.unlockAll;
  return isNewPlayer ? { name: 'level', levelId: FIRST_LEVEL.id } : MAP;
}

function viewForLevel(level: Level): View {
  const caseStudy = CASES.find((c) => c.level === level);
  return caseStudy === undefined ? { name: 'level', levelId: level.id } : { name: 'caseIntro', caseId: caseStudy.id };
}

export function Root() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [view, setView] = useState<View>(() => initialView(progress));
  const [overlay, setOverlay] = useState<TopicOverlay | null>(null);
  const scrollBeforeOverlay = useRef(0);
  useScrollTopOn(JSON.stringify(view));

  // Closing a subject returns the reader to where they were on the screen underneath.
  useEffect(() => {
    if (overlay === null) window.scrollTo(0, scrollBeforeOverlay.current);
  }, [overlay]);

  const update = (next: Progress) => {
    saveProgress(next);
    setProgress(next);
  };
  const goMap = () => setView(MAP);
  const goTab = (tab: HomeTab) => setView({ name: tab });
  const openOverlay = (next: TopicOverlay) => {
    scrollBeforeOverlay.current = window.scrollY;
    setOverlay(next);
  };
  const openCardTopic = (cardId: string) => {
    const { topic, sectionIndex } = topicForCard(cardId);
    openOverlay({ topicId: topic.id, focusSection: sectionIndex });
  };
  const practice = (level: Level) => {
    setOverlay(null);
    setView(viewForLevel(level));
  };

  const renderView = () => {
    switch (view.name) {
      case 'map':
        return (
          <MapScreen progress={progress} onGoTab={goTab}
            onPlayLevel={(levelId) => setView({ name: 'level', levelId })}
            onPlayCase={(caseId) => setView({ name: 'caseIntro', caseId })}
            onToggleUnlockAll={() => update({ ...progress, unlockAll: !progress.unlockAll })} />
        );
      case 'learn':
        return <LearnScreen onGoTab={goTab} onOpenTopic={(topicId) => openOverlay({ topicId, focusSection: null })} />;
      case 'codex':
        return <CodexScreen unlocked={progress.cards} onGoTab={goTab} />;
      case 'level': {
        const level = findCampaignLevel(view.levelId);
        const index = CAMPAIGN.indexOf(level);
        const next = index + 1 < CAMPAIGN.length ? CAMPAIGN[index + 1] : null;
        return (
          <LevelScreen key={level.id} level={level} caseStudy={null} nextLabel={next === null ? null : next.title}
            tutorial={level === FIRST_LEVEL && starsFor(progress, level.id) === 0}
            onWin={(stars) => update(recordWin(progress, level.id, stars, level.cardIds))}
            onExit={goMap}
            onNext={() => (next === null ? goMap() : setView({ name: 'level', levelId: next.id }))} />
        );
      }
      case 'caseIntro': {
        const caseStudy = findCase(view.caseId);
        return <CaseIntro key={caseStudy.id} caseStudy={caseStudy} onExit={goMap} onDone={() => setView({ name: 'caseLevel', caseId: caseStudy.id })} />;
      }
      case 'caseLevel': {
        const caseStudy = findCase(view.caseId);
        const level = caseStudy.level;
        return (
          <LevelScreen key={level.id} level={level} caseStudy={caseStudy} tutorial={false} nextLabel={null}
            onWin={(stars) => update(recordWin(progress, level.id, stars, level.cardIds))}
            onExit={goMap} onNext={goMap} />
        );
      }
    }
  };

  // Practice links only make sense from the Learn tab; elsewhere the reader is in the middle of something.
  const canPractice = view.name === 'learn';
  return (
    <OpenCardTopicContext.Provider value={openCardTopic}>
      <div hidden={overlay !== null}>{renderView()}</div>
      {overlay !== null && (
        <TopicScreen topic={findTopic(overlay.topicId)} focusSection={overlay.focusSection} onBack={() => setOverlay(null)} onPractice={canPractice ? practice : null} />
      )}
    </OpenCardTopicContext.Provider>
  );
}
