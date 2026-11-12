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

export type FigureTone = 'plain' | 'good' | 'bad' | 'warn' | 'info' | 'muted';

/** A node of a data-described diagram, placed on a grid (column and row are zero-based). */
export type DiagramNodeSpec = {
  id: string;
  label: string;
  sub: string | null;
  shape: 'box' | 'store';
  tone: FigureTone;
  col: number;
  row: number;
  /** How many grid columns the node covers. */
  span: number;
};

export type DiagramEdgeSpec = { from: string; to: string; label: string | null; tone: FigureTone; dashed: boolean };

/** One scenario of a diagram: what is drawn, and one sentence saying what it means. */
export type DiagramState = { name: string; readout: string; cols: number; nodes: DiagramNodeSpec[]; edges: DiagramEdgeSpec[] };

/** A diagram described as data. With several states the reader can switch between scenarios. */
export type StateDiagram = { states: DiagramState[] };

export type TrackId = 'system-design' | 'aws' | 'microservices' | 'kubernetes' | 'postgresql' | 'redis' | 'kafka' | 'pytorch' | 'monitoring';

export type TopicSection = {
  heading: string;
  paragraphs: string[];
  /** A hand-drawn figure by id, a data-described diagram, or nothing. */
  figure: FigureId | StateDiagram | null;
  /** Concept cards this section explains in depth. */
  cardIds: string[];
};

/** One subject of the Learn tab: the full material behind a group of concept cards. */
export type Topic = {
  id: string;
  title: string;
  summary: string;
  sections: TopicSection[];
  /** Passing it earns stars and unlocks the topic's concept cards. Empty when levels do that job instead. */
  quiz: QuizQuestion[];
};

/** A whole subject on the Learn tab (System design, Kafka, …). */
export type Track = {
  id: TrackId;
  title: string;
  summary: string;
  topics: Topic[];
};
