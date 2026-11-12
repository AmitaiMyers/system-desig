// Two of the top-level places: the Map (campaign + case studies) and the Codex (concept cards).
import { CAMPAIGN, CARDS, CASE_PREREQUISITE, CASES, findCampaignLevel, findCard, TRACKS } from '../../content';
import { starsFor, type Progress } from '../../state/progress';
import { Stars } from '../primitives/controls';
import { Icon, type IconName } from '../primitives/Icon';
import { CardView } from '../primitives/Rich';
import { Screen, TabBar } from '../primitives/Screen';
import { HOME_TABS, type HomeTab } from './tabs';

type MapProps = {
  progress: Progress;
  onPlayLevel: (levelId: string) => void;
  onPlayCase: (caseId: string) => void;
  onGoTab: (tab: HomeTab) => void;
  onToggleUnlockAll: () => void;
};

type TileProps = { badge: string | IconName; title: string; tagline: string; stars: number; lockedReason: string | null; onPlay: () => void };

function Tile({ badge, title, tagline, stars, lockedReason, onPlay }: TileProps) {
  const locked = lockedReason !== null;
  const isNumber = /^\d+$/.test(badge);
  return (
    <button className={locked ? 'tile tile-locked' : 'tile'} disabled={locked} onClick={onPlay}>
      <span className="tile-badge">{locked ? <Icon name="lock" size={20} /> : isNumber ? badge : <Icon name={badge as IconName} size={20} />}</span>
      <span className="tile-text">
        <span className="tile-title">{title}</span>
        <span className="tile-tagline">{locked ? lockedReason : tagline}</span>
      </span>
      {!locked && <Stars count={stars} />}
    </button>
  );
}

export function MapScreen({ progress, onPlayLevel, onPlayCase, onGoTab, onToggleUnlockAll }: MapProps) {
  const beaten = (levelId: string) => starsFor(progress, levelId) > 0;
  const totalStars = [...CAMPAIGN, ...CASES.map((c) => c.level)].reduce((sum, level) => sum + starsFor(progress, level.id), 0);
  const maxStars = (CAMPAIGN.length + CASES.length) * 3;

  return (
    <Screen title="Scale or Fail" onBack={null} footer={<TabBar tabs={HOME_TABS} current="map" onGo={onGoTab} />}>
      <p className="tagline">Build the architecture. Run the traffic. Watch what breaks.</p>
      <div className="summary" role="img" aria-label={`${totalStars} of ${maxStars} stars earned`}>
        <span className="summary-stars">★ {totalStars} / {maxStars}</span>
        <span className="summary-bar"><span style={{ transform: `scaleX(${totalStars / maxStars})` }} /></span>
      </div>

      <h2>Campaign — grow Snapgram</h2>
      {CAMPAIGN.map((level, index) => {
        const open = progress.unlockAll || index === 0 || beaten(CAMPAIGN[index - 1].id);
        return (
          <Tile key={level.id} badge={String(index + 1)} title={level.title} tagline={level.tagline} stars={starsFor(progress, level.id)}
            lockedReason={open ? null : `Beat “${CAMPAIGN[index - 1].title}” first`} onPlay={() => onPlayLevel(level.id)} />
        );
      })}

      <h2>Interview case studies</h2>
      {CASES.map((caseStudy) => {
        const prerequisite = findCampaignLevel(CASE_PREREQUISITE[caseStudy.id]);
        const open = progress.unlockAll || beaten(prerequisite.id);
        return (
          <Tile key={caseStudy.id} badge="mic" title={caseStudy.title} tagline={caseStudy.tagline} stars={starsFor(progress, caseStudy.level.id)}
            lockedReason={open ? null : `Beat “${prerequisite.title}” first`} onPlay={() => onPlayCase(caseStudy.id)} />
        );
      })}

      <button className="btn btn-small btn-ghost" onClick={onToggleUnlockAll}>
        {progress.unlockAll ? 'Lock levels again (play in order)' : 'Unlock all levels'}
      </button>
    </Screen>
  );
}

export function CodexScreen({ unlocked, onGoTab }: { unlocked: string[]; onGoTab: (tab: HomeTab) => void }) {
  return (
    <Screen title="Codex" onBack={null} footer={<TabBar tabs={HOME_TABS} current="codex" onGo={onGoTab} />}>
      <p className="muted">{unlocked.length} of {CARDS.length} concepts unlocked. Beat levels and pass Learn quizzes to unlock more. Each card links to its full explanation.</p>
      {TRACKS.map((track) => {
        const cards = track.topics.flatMap((topic) => topic.sections.flatMap((section) => section.cardIds)).map(findCard);
        const open = cards.filter((card) => unlocked.includes(card.id));
        return (
          <section key={track.id} className="stack">
            <h2>{track.title} <small>{open.length} / {cards.length}</small></h2>
            {open.map((card) => <CardView key={card.id} card={card} />)}
            {open.length < cards.length && (
              <ul className="strip strip-wrap">{cards.filter((card) => !open.includes(card)).map((card) => <li key={card.id} className="chip"><Icon name="lock" size={14} /> {card.title}</li>)}</ul>
            )}
          </section>
        );
      })}
    </Screen>
  );
}
