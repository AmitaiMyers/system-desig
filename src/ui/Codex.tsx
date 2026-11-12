// The Codex: every concept card, unlocked ones readable.
import { CARDS } from '../content';
import type { ConceptCard } from '../content/types';
import { Screen } from './controls';

export function CardView({ card }: { card: ConceptCard }) {
  return (
    <article className="card">
      <h3>{card.title}</h3>
      <ul>{card.points.map((point) => <li key={point}>{point}</li>)}</ul>
      <p className="insight"><strong>Senior insight:</strong> {card.insight}</p>
      <p className="card-source">{card.source}</p>
    </article>
  );
}

export function Codex({ unlocked, onBack }: { unlocked: string[]; onBack: () => void }) {
  const open = CARDS.filter((card) => unlocked.includes(card.id));
  const locked = CARDS.filter((card) => !unlocked.includes(card.id));
  return (
    <Screen title="Codex" onBack={onBack}>
      <p className="muted">{open.length} of {CARDS.length} concepts unlocked. Beat levels to unlock more.</p>
      {open.map((card) => <CardView key={card.id} card={card} />)}
      {locked.length > 0 && <h3>Locked</h3>}
      <div className="locked-cards">{locked.map((card) => <span key={card.id} className="chip">🔒 {card.title}</span>)}</div>
    </Screen>
  );
}
