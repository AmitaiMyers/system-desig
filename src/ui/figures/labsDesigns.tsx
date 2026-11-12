// Interactive diagrams for the worked designs: time decay and the inverted index.
import { useState } from 'react';
import { Slider } from '../primitives/controls';
import { Box, Frame, Lab, Meter, Note } from './kit';

const OLD_HIT = { name: 'Last month’s hit', units: 1000, ageDays: 30 };
const NEW_RISER = { name: 'This week’s riser', units: 300, ageDays: 1 };
const DECAY_CHART = { left: 30, right: 306, top: 8, bottom: 74, maxAgeDays: 60 };

export function DecayLab() {
  const [halfLife, setHalfLife] = useState(7);
  const weight = (ageDays: number) => 0.5 ** (ageDays / halfLife);
  const score = (item: typeof OLD_HIT) => item.units * weight(item.ageDays);
  const x = (age: number) => DECAY_CHART.left + (age / DECAY_CHART.maxAgeDays) * (DECAY_CHART.right - DECAY_CHART.left);
  const y = (w: number) => DECAY_CHART.bottom - w * (DECAY_CHART.bottom - DECAY_CHART.top);
  const points = Array.from({ length: DECAY_CHART.maxAgeDays + 1 }, (_, age) => `${x(age)},${y(weight(age))}`).join(' ');
  const top = Math.max(score(OLD_HIT), score(NEW_RISER));
  const leader = score(NEW_RISER) > score(OLD_HIT) ? NEW_RISER : OLD_HIT;
  const readout = `With a ${halfLife}-day half-life, “${leader.name}” ranks first. A sale from 30 days ago counts ${Math.round(weight(30) * 100)}% of a sale today.`;
  return (
    <Lab readout={readout} controls={<Slider label="Half-life of a sale" value={halfLife} min={1} max={30} step={1} format={(v) => `${v} days`} onChange={setHalfLife} />}>
      <Frame height={176} label={readout}>
        <line className="fig-axis" x1={DECAY_CHART.left} y1={DECAY_CHART.bottom} x2={DECAY_CHART.right} y2={DECAY_CHART.bottom} />
        <line className="fig-axis" x1={DECAY_CHART.left} y1={DECAY_CHART.top} x2={DECAY_CHART.left} y2={DECAY_CHART.bottom} />
        <polyline className="fig-curve" points={points} />
        <Note x={DECAY_CHART.left - 4} y={DECAY_CHART.top + 6} anchor="end" text="1×" />
        <Note x={DECAY_CHART.left} y={88} text="sold today" />
        <Note x={DECAY_CHART.right} y={88} anchor="end" text="60 days ago" />
        <Note x={168} y={88} anchor="middle" text="weight of one sale, by age" />
        {[OLD_HIT, NEW_RISER].map((item, i) => (
          <Meter key={item.name} x={20} y={118 + i * 38} w={280} value={score(item) / top} tone={item === leader ? 'good' : 'muted'}
            label={`${item.name}: ${item.units} sold ${item.ageDays} day${item.ageDays === 1 ? '' : 's'} ago`} valueText={`score ${Math.round(score(item))}`} />
        ))}
      </Frame>
    </Lab>
  );
}

const DOCUMENTS = [
  { id: 1, words: ['palm', 'tree', 'beach'] },
  { id: 2, words: ['dinosaur', 'fossil'] },
  { id: 3, words: ['palm', 'beach', 'hotel'] },
  { id: 4, words: ['dinosaur', 'park', 'tree'] },
];
const KEYWORDS = ['palm', 'tree', 'beach', 'dinosaur'];

export function InvertedIndexLab() {
  const [keyword, setKeyword] = useState('tree');
  const matches = DOCUMENTS.filter((doc) => doc.words.includes(keyword));
  const skipped = DOCUMENTS.length - matches.length;
  const readout = `Index entry “${keyword}” → documents ${matches.map((d) => d.id).join(', ')}. The query reads one entry and never opens the other ${skipped} document${skipped === 1 ? '' : 's'}.`;
  return (
    <Lab readout={readout}
      controls={
        <div className="field" role="group" aria-label="Search for a keyword">
          <div className="field-label">Search for</div>
          <div className="segmented">
            {KEYWORDS.map((word) => <button key={word} className={word === keyword ? 'seg seg-on' : 'seg'} aria-pressed={word === keyword} onClick={() => setKeyword(word)}>{word}</button>)}
          </div>
        </div>
      }>
      <Frame height={150} label={readout}>
        <Note x={160} y={14} anchor="middle" strong tone="info" text={`“${keyword}” → [ ${matches.map((d) => `doc ${d.id}`).join(', ')} ]`} />
        {DOCUMENTS.map((doc, i) => (
          <Box key={doc.id} x={8 + (i % 2) * 156} y={28 + Math.floor(i / 2) * 60} w={148} h={50} label={`Document ${doc.id}`} sub={doc.words.join(' · ')} tone={doc.words.includes(keyword) ? 'good' : 'muted'} />
        ))}
      </Frame>
    </Lab>
  );
}
