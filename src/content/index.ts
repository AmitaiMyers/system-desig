import { CAMPAIGN } from './campaign';
import { CARDS } from './cards';
import { CASES } from './cases';
import type { CaseStudy, ConceptCard, Level } from './types';

export { CAMPAIGN, CARDS, CASES };

/** Campaign level that must be beaten before each case study opens. */
export const CASE_PREREQUISITE: Record<string, string> = {
  'url-shortener': 'replicas',
  youtube: 'queues',
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
