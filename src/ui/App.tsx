import { useState } from 'react';
import { CAMPAIGN, findCampaignLevel, findCase } from '../content';
import { loadProgress, recordWin, saveProgress, type Progress } from '../state/progress';
import { CaseIntro } from './CaseIntro';
import { useScrollTopOn } from './controls';
import { Codex } from './Codex';
import { Home } from './Home';
import { LevelScreen } from './LevelScreen';

type View =
  | { name: 'home' }
  | { name: 'codex' }
  | { name: 'level'; levelId: string }
  | { name: 'caseIntro'; caseId: string }
  | { name: 'caseLevel'; caseId: string };

const HOME: View = { name: 'home' };

export function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [view, setView] = useState<View>(HOME);
  useScrollTopOn(JSON.stringify(view));

  const update = (next: Progress) => {
    saveProgress(next);
    setProgress(next);
  };
  const goHome = () => setView(HOME);

  switch (view.name) {
    case 'home':
      return (
        <Home progress={progress}
          onPlayLevel={(levelId) => setView({ name: 'level', levelId })}
          onPlayCase={(caseId) => setView({ name: 'caseIntro', caseId })}
          onOpenCodex={() => setView({ name: 'codex' })}
          onToggleUnlockAll={() => update({ ...progress, unlockAll: !progress.unlockAll })} />
      );
    case 'codex':
      return <Codex unlocked={progress.cards} onBack={goHome} />;
    case 'level': {
      const level = findCampaignLevel(view.levelId);
      const index = CAMPAIGN.indexOf(level);
      const next = index + 1 < CAMPAIGN.length ? CAMPAIGN[index + 1] : null;
      return (
        <LevelScreen key={level.id} level={level} caseStudy={null} nextLabel={next === null ? null : next.title}
          onWin={(stars) => update(recordWin(progress, level.id, stars, level.cardIds))}
          onExit={goHome}
          onNext={() => (next === null ? goHome() : setView({ name: 'level', levelId: next.id }))} />
      );
    }
    case 'caseIntro': {
      const caseStudy = findCase(view.caseId);
      return <CaseIntro key={caseStudy.id} caseStudy={caseStudy} onExit={goHome} onDone={() => setView({ name: 'caseLevel', caseId: caseStudy.id })} />;
    }
    case 'caseLevel': {
      const caseStudy = findCase(view.caseId);
      const level = caseStudy.level;
      return (
        <LevelScreen key={level.id} level={level} caseStudy={caseStudy} nextLabel={null}
          onWin={(stars) => update(recordWin(progress, level.id, stars, level.cardIds))}
          onExit={goHome} onNext={goHome} />
      );
    }
  }
}
