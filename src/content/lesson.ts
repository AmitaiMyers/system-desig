// Authoring helpers for lessons: short one-section topics with a diagram, a concept card and a quiz.
// They keep the lesson files readable; every default is filled in here, explicitly.

import type { ConceptCard, DiagramEdgeSpec, DiagramNodeSpec, DiagramState, FigureTone, QuizQuestion, Topic } from './types';

type NodeOptions = { sub?: string; tone?: FigureTone; span?: number };

function node(shape: DiagramNodeSpec['shape'], id: string, label: string, col: number, row: number, options: NodeOptions): DiagramNodeSpec {
  return {
    id, label, shape, col, row,
    sub: options.sub === undefined ? null : options.sub,
    tone: options.tone === undefined ? 'plain' : options.tone,
    span: options.span === undefined ? 1 : options.span,
  };
}

/** A service or process. */
export function box(id: string, label: string, col: number, row: number, options: NodeOptions = {}): DiagramNodeSpec {
  return node('box', id, label, col, row, options);
}

/** A data store, drawn as a cylinder. */
export function store(id: string, label: string, col: number, row: number, options: NodeOptions = {}): DiagramNodeSpec {
  return node('store', id, label, col, row, options);
}

type EdgeOptions = { label?: string; tone?: FigureTone; dashed?: boolean };

export function edge(from: string, to: string, options: EdgeOptions = {}): DiagramEdgeSpec {
  return {
    from, to,
    label: options.label === undefined ? null : options.label,
    tone: options.tone === undefined ? 'muted' : options.tone,
    dashed: options.dashed === undefined ? false : options.dashed,
  };
}

const DEFAULT_COLUMNS = 3;

/** One scenario of a diagram on a 3-column grid (pass `cols` for a different grid). */
export function state(name: string, readout: string, nodes: DiagramNodeSpec[], edges: DiagramEdgeSpec[], cols: number = DEFAULT_COLUMNS): DiagramState {
  return { name, readout, cols, nodes, edges };
}

export function q(question: string, options: string[], answerIndex: number, explanation: string): QuizQuestion {
  return { question, options, answerIndex, explanation };
}

type LessonInput = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  states: DiagramState[];
  card: { points: string[]; insight: string; source: string };
  quiz: QuizQuestion[];
};

export type Lesson = { topic: Topic; card: ConceptCard };

/** A lesson is a topic with one section; its concept card shares the lesson's id and title. */
export function lesson(input: LessonInput): Lesson {
  return {
    topic: {
      id: input.id,
      title: input.title,
      summary: input.summary,
      quiz: input.quiz,
      sections: [{ heading: input.title, paragraphs: input.paragraphs, figure: { states: input.states }, cardIds: [input.id] }],
    },
    card: { id: input.id, title: input.title, ...input.card },
  };
}
