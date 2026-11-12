import type { Build, Scenario } from '../engine/types';

/** Controls the player may use in a level. Everything else is hidden. */
export type Feature =
  | 'appSize'
  | 'splitDb'
  | 'dbSize'
  | 'loadBalancer'
  | 'cache'
  | 'replicas'
  | 'failover'
  | 'cdn'
  | 'ownCdn'
  | 'objectStorage'
  | 'shards'
  | 'queue'
  | 'regions';

/** Diagrams drawn by the UI. Interactive ones ("labs") let the reader change a value and see the effect. */
export type FigureId =
  | 'evolve' | 'scale-out' | 'n-plus-one' | 'latency-curve'
  | 'failover' | 'replication'
  | 'shards' | 'denormalize' | 'cap'
  | 'cache' | 'lru'
  | 'cdn' | 'object-storage' | 'egress-cost' | 'abr'
  | 'queue' | 'backlog' | 'upload-pipeline'
  | 'blast-radius' | 'regions' | 'nines'
  | 'interview-flow' | 'estimator' | 'url-shortener'
  | 'reservation' | 'crawler' | 'decay' | 'inverted-index';

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type Level = {
  id: string;
  title: string;
  tagline: string;
  /** Short story paragraphs shown in the brief. */
  story: string[];
  scenario: Scenario;
  unlocked: Feature[];
  initialBuild: Build;
  /** The diagram shown in the brief to introduce this level's concept. */
  lab: FigureId;
  /** One nudge shown after a failed run. Never the full answer. */
  hint: string;
  /** Concept cards unlocked by finishing this level. */
  cardIds: string[];
  quiz: QuizQuestion[];
};

export type RequirementOption = {
  text: string;
  /** true = a good clarifying question / in-scope requirement; false = a trap. */
  good: boolean;
  why: string;
};

export type SourceLink = { label: string; url: string };

export type CaseStudy = {
  id: string;
  title: string;
  tagline: string;
  /** What the interviewer says. */
  prompt: string;
  requirementsIntro: string;
  requirements: RequirementOption[];
  estimation: QuizQuestion[];
  level: Level;
  /** How the real system does it. */
  debrief: string[];
  sources: SourceLink[];
};

export type ConceptCard = {
  id: string;
  title: string;
  points: string[];
  /** The senior-level trade-off. */
  insight: string;
  source: string;
};

export type TopicId = 'scaling' | 'database' | 'sharding' | 'caching' | 'delivery' | 'async' | 'resilience' | 'interview' | 'designs';

export type TopicSection = {
  heading: string;
  paragraphs: string[];
  figure: FigureId | null;
  /** Concept cards this section explains in depth. */
  cardIds: string[];
};

/** One subject of the Learn tab: the full material behind a group of concept cards. */
export type Topic = {
  id: TopicId;
  title: string;
  summary: string;
  sections: TopicSection[];
};
