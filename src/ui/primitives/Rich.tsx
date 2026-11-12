// Text whose technical terms explain themselves: a known term gets a dotted underline,
// and tapping it opens its concept card in place.
import { useState, type ReactNode } from 'react';
import { findCard, topicForCard } from '../../content';
import type { ConceptCard } from '../../content/types';
import { Icon } from './Icon';
import { useOpenCardTopic } from './nav';
import { Sheet } from './Sheet';

/** Term pattern → concept card. Longer phrases first so they win over the words inside them. */
const GLOSSARY: { pattern: string; cardId: string }[] = [
  { pattern: 'single points? of failure', cardId: 'single-server' },
  { pattern: 'thundering herd', cardId: 'cache-cold-start' },
  { pattern: 'object storage', cardId: 'object-storage' },
  { pattern: 'load balancers?', cardId: 'load-balancer' },
  { pattern: 'replication lag', cardId: 'replication-lag' },
  { pattern: 'read replicas?|replicas?', cardId: 'read-replicas' },
  { pattern: 'shard keys?', cardId: 'hot-shard' },
  { pattern: 'shard(?:s|ing|ed)?', cardId: 'sharding' },
  { pattern: 'cold standby|warm standby|hot standby|failover', cardId: 'failover' },
  { pattern: 'stateless', cardId: 'stateless' },
  { pattern: 'p99', cardId: 'sla-nines' },
  { pattern: 'CDNs?', cardId: 'cdn' },
  { pattern: 'caches?|cached', cardId: 'caching' },
  { pattern: 'queues?', cardId: 'message-queue' },
  { pattern: 'backlog', cardId: 'backpressure' },
];

const TERM_REGEX = new RegExp(`\\b(${GLOSSARY.map((g) => g.pattern).join('|')})\\b`, 'gi');

function cardIdFor(term: string): string {
  const entry = GLOSSARY.find((g) => new RegExp(`^(?:${g.pattern})$`, 'i').test(term));
  if (entry === undefined) throw new Error(`Glossary matched "${term}" but has no entry for it`);
  return entry.cardId;
}

type CardViewProps = {
  card: ConceptCard;
  /** Offer the link to the Learn section that explains this card. Off inside that section itself. */
  deeper?: boolean;
  /** Called just before navigating to the Learn section (e.g. to close the sheet the card is in). */
  onLeave?: () => void;
};

export function CardView({ card, deeper = true, onLeave }: CardViewProps) {
  const openCardTopic = useOpenCardTopic();
  const goDeeper = () => {
    if (onLeave !== undefined) onLeave();
    openCardTopic(card.id);
  };
  return (
    <article className="card">
      <h3>{card.title}</h3>
      <ul>{card.points.map((point) => <li key={point}>{point}</li>)}</ul>
      <p className="insight"><strong>Senior insight:</strong> {card.insight}</p>
      <p className="card-source">{card.source}</p>
      {deeper && (
        <button className="btn btn-small card-deeper" onClick={goDeeper}>
          <Icon name="book" size={18} /> Go deeper: {topicForCard(card.id).topic.title}
        </button>
      )}
    </article>
  );
}

/** Renders `text`, turning the first mention of each known term into a tappable explanation. */
export function Rich({ text }: { text: string }) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const parts: ReactNode[] = [];
  const explained = new Set<string>();
  let cursor = 0;
  for (const match of text.matchAll(TERM_REGEX)) {
    const term = match[0];
    const cardId = cardIdFor(term);
    if (explained.has(cardId)) continue;
    explained.add(cardId);
    parts.push(text.slice(cursor, match.index));
    parts.push(<button key={match.index} className="term" onClick={() => setOpenCardId(cardId)}>{term}</button>);
    cursor = match.index + term.length;
  }
  parts.push(text.slice(cursor));
  return (
    <>
      {parts}
      {openCardId !== null && <Sheet title="Concept" onClose={() => setOpenCardId(null)}><CardView card={findCard(openCardId)} onLeave={() => setOpenCardId(null)} /></Sheet>}
    </>
  );
}
