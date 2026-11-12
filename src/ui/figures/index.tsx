// Registry of every diagram, so content can refer to one by id.
import type { ReactNode } from 'react';
import type { FigureId, StateDiagram } from '../../content/types';
import { CapLab, EvolveLab, FailoverLab, LatencyCurveLab, NPlusOneLab, ScaleOutLab, ShardsLab } from './labsScaling';
import { DecayLab, InvertedIndexLab } from './labsDesigns';
import { AbrLab, BacklogLab, CacheLab, CdnLab, EgressCostLab, EstimatorLab, LruLab, NinesLab, RegionsLab } from './labsSystems';
import { StateDiagramView } from './StateDiagramView';
import { BlastRadiusFigure, CrawlerFigure, DenormalizeFigure, InterviewFlowFigure, ObjectStorageFigure, QueueFigure, ReplicationFigure, ReservationFigure, UploadPipelineFigure, UrlShortenerFigure } from './static';

type Entry = { render: () => ReactNode; interactive: boolean };

const lab = (render: () => ReactNode): Entry => ({ render, interactive: true });
const drawing = (render: () => ReactNode): Entry => ({ render, interactive: false });

const FIGURES: Record<FigureId, Entry> = {
  evolve: lab(EvolveLab),
  'scale-out': lab(ScaleOutLab),
  'n-plus-one': lab(NPlusOneLab),
  'latency-curve': lab(LatencyCurveLab),
  failover: lab(FailoverLab),
  replication: drawing(ReplicationFigure),
  shards: lab(ShardsLab),
  denormalize: drawing(DenormalizeFigure),
  cap: lab(CapLab),
  cache: lab(CacheLab),
  lru: lab(LruLab),
  cdn: lab(CdnLab),
  'object-storage': drawing(ObjectStorageFigure),
  'egress-cost': lab(EgressCostLab),
  abr: lab(AbrLab),
  queue: drawing(QueueFigure),
  backlog: lab(BacklogLab),
  'upload-pipeline': drawing(UploadPipelineFigure),
  'blast-radius': drawing(BlastRadiusFigure),
  regions: lab(RegionsLab),
  nines: lab(NinesLab),
  'interview-flow': drawing(InterviewFlowFigure),
  estimator: lab(EstimatorLab),
  'url-shortener': drawing(UrlShortenerFigure),
  reservation: drawing(ReservationFigure),
  crawler: drawing(CrawlerFigure),
  decay: lab(DecayLab),
  'inverted-index': lab(InvertedIndexLab),
};

export function Figure({ id }: { id: FigureId }) {
  const entry = FIGURES[id];
  const Body = entry.render;
  return (
    <figure className="figure">
      {entry.interactive && <figcaption className="figure-badge">Interactive — try the controls</figcaption>}
      <Body />
    </figure>
  );
}

/** A section's figure is either a hand-drawn one (by id) or a diagram described as data. */
export function SectionFigure({ figure }: { figure: FigureId | StateDiagram }) {
  return typeof figure === 'string' ? <Figure id={figure} /> : <StateDiagramView diagram={figure} />;
}
