import { CAMPAIGN } from './campaign';
import { SYSTEM_DESIGN_CARDS } from './cards';
import { CASES } from './cases';
import { LESSON_CARDS, TOPICS, TRACKS } from './tracks';
import type { CaseStudy, ConceptCard, Level, Topic, Track, TrackId } from './types';

export const CARDS: ConceptCard[] = [...SYSTEM_DESIGN_CARDS, ...LESSON_CARDS];

export { CAMPAIGN, CASES, TOPICS, TRACKS };

/** Campaign level that must be beaten before each case study opens. */
export const CASE_PREREQUISITE: Record<string, string> = {
  'url-shortener': 'replicas',
  restaurant: 'queues',
  crawler: 'queues',
  'top-sellers': 'queues',
  youtube: 'queues',
  search: 'queues',
  netflix: 'region-down',
};

export function findCampaignLevel(id: string): Level {
  const level = CAMPAIGN.find((l) => l.id === id);
  if (level === undefined) throw new Error(`Unknown campaign level "${id}"`);
  return level;
}

export function findCase(id: string): CaseStudy {
  const found = CASES.find((c) => c.id === id);
  if (found === undefined) throw new Error(`Unknown case study "${id}"`);
  return found;
}

export function findCard(id: string): ConceptCard {
  const card = CARDS.find((c) => c.id === id);
  if (card === undefined) throw new Error(`Unknown concept card "${id}"`);
  return card;
}

export function findTopic(id: string): Topic {
  const topic = TOPICS.find((t) => t.id === id);
  if (topic === undefined) throw new Error(`Unknown topic "${id}"`);
  return topic;
}

/** Where a concept card is explained in depth. Every card belongs to exactly one section (enforced by tests). */
export function topicForCard(cardId: string): { topic: Topic; sectionIndex: number } {
  for (const topic of TOPICS) {
    const sectionIndex = topic.sections.findIndex((section) => section.cardIds.includes(cardId));
    if (sectionIndex >= 0) return { topic, sectionIndex };
  }
  throw new Error(`Concept card "${cardId}" is not explained by any topic`);
}

/** Levels and case studies that exercise a topic, for "practice this" links. */
export function levelsForTopic(topic: Topic): Level[] {
  const cardIds = topic.sections.flatMap((section) => section.cardIds);
  return [...CAMPAIGN, ...CASES.map((c) => c.level)].filter((level) => level.cardIds.some((id) => cardIds.includes(id)));
}

export function findTrack(id: TrackId): Track {
  const track = TRACKS.find((t) => t.id === id);
  if (track === undefined) throw new Error(`Unknown track "${id}"`);
  return track;
}

export function trackForTopic(topic: Topic): Track {
  const track = TRACKS.find((t) => t.topics.includes(topic));
  if (track === undefined) throw new Error(`Topic "${topic.id}" belongs to no track`);
  return track;
}
