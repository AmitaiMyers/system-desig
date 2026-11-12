import { CAMPAIGN } from './campaign';
import { CARDS } from './cards';
import { CASES } from './cases';
import { TOPICS } from './topics';
import type { CaseStudy, ConceptCard, Level, Topic, TopicId } from './types';

export { CAMPAIGN, CARDS, CASES, TOPICS };

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

export function findTopic(id: TopicId): Topic {
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
