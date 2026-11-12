// The map: campaign levels, case studies and the Codex.
import { CAMPAIGN, CARDS, CASE_PREREQUISITE, CASES, findCampaignLevel } from '../content';
import { starsFor, type Progress } from '../state/progress';
import { Screen, Stars } from './controls';

type Props = {
  progress: Progress;
  onPlayLevel: (levelId: string) => void;
  onPlayCase: (caseId: string) => void;
  onOpenCodex: () => void;
  onToggleUnlockAll: () => void;
};

type TileProps = { badge: string; title: string; tagline: string; stars: number; lockedReason: string | null; onPlay: () => void };

function Tile({ badge, title, tagline, stars, lockedReason, onPlay }: TileProps) {
  const locked = lockedReason !== null;
  return (
    <button className={locked ? 'tile tile-locked' : 'tile'} disabled={locked} onClick={onPlay}>
      <span className="tile-badge">{locked ? '🔒' : badge}</span>
      <span className="tile-text">
        <span className="tile-title">{title}</span>
        <span className="tile-tagline">{locked ? lockedReason : tagline}</span>
      </span>
      {!locked && <Stars count={stars} />}
    </button>
  );
}

export function Home({ progress, onPlayLevel, onPlayCase, onOpenCodex, onToggleUnlockAll }: Props) {
  const beaten = (levelId: string) => starsFor(progress, levelId) > 0;
  const totalStars = [...CAMPAIGN, ...CASES.map((c) => c.level)].reduce((sum, level) => sum + starsFor(progress, level.id), 0);
  const maxStars = (CAMPAIGN.length + CASES.length) * 3;

  return (
    <Screen title="Scale or Fail" onBack={null}>
      <p className="tagline">Build the architecture. Run the traffic. Watch what breaks.</p>
      <div className="summary">
        <span>★ {totalStars} / {maxStars}</span>
        <button className="btn btn-small" onClick={onOpenCodex}>📚 Codex {progress.cards.length}/{CARDS.length}</button>
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
          <Tile key={caseStudy.id} badge="🎤" title={caseStudy.title} tagline={caseStudy.tagline} stars={starsFor(progress, caseStudy.level.id)}
            lockedReason={open ? null : `Beat “${prerequisite.title}” first`} onPlay={() => onPlayCase(caseStudy.id)} />
        );
      })}

      <button className="btn btn-small btn-ghost" onClick={onToggleUnlockAll}>
        {progress.unlockAll ? 'Lock levels again (play in order)' : 'Unlock all levels'}
      </button>
    </Screen>
  );
}
