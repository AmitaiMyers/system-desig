// Touch-friendly form controls. Roles, labels and keyboard behaviour live here so screens cannot get them wrong.
import { useId, useRef, type KeyboardEvent } from 'react';

type StepperProps = { label: string; value: number; min: number; max: number; steps: number[]; onChange: (value: number) => void; note?: string };

export function Stepper({ label, value, min, max, steps, onChange, note }: StepperProps) {
  const labelId = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const descending = [...steps].sort((a, b) => b - a);
  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <div className="field-label" id={labelId}>{label}</div>
      <div className="stepper">
        {descending.map((step) => (
          <button key={`-${step}`} className="step" disabled={value <= min} aria-label={`Decrease ${label} by ${step}`} onClick={() => onChange(clamp(value - step))}>−{step}</button>
        ))}
        <output className="step-value" aria-live="polite">{value.toLocaleString()}</output>
        {[...descending].reverse().map((step) => (
          <button key={`+${step}`} className="step" disabled={value >= max} aria-label={`Increase ${label} by ${step}`} onClick={() => onChange(clamp(value + step))}>+{step}</button>
        ))}
      </div>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

type SegmentedProps<T extends string> = { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; note?: string };

/** A radio group: arrow keys move the selection, Tab enters and leaves the group once. */
export function Segmented<T extends string>({ label, value, options, onChange, note }: SegmentedProps<T>) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const current = options.findIndex((o) => o.value === value);
    const next = (current + direction + options.length) % options.length;
    onChange(options[next].value);
    const group = groupRef.current;
    if (group === null) throw new Error('Segmented control lost its group element');
    (group.children[next] as HTMLElement).focus();
  };
  return (
    <div className="field">
      <div className="field-label" id={labelId}>{label}</div>
      <div className="segmented" role="radiogroup" aria-labelledby={labelId} ref={groupRef} onKeyDown={onKeyDown}>
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1}
            className={o.value === value ? 'seg seg-on' : 'seg'} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

export function Switch({ label, value, onChange, note }: { label: string; value: boolean; onChange: (value: boolean) => void; note?: string }) {
  return (
    <div className="field">
      <button role="switch" aria-checked={value} className={value ? 'switch switch-on' : 'switch'} onClick={() => onChange(!value)}>
        <span>{label}</span>
        <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
      </button>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

/** `animated` pops the earned stars in one after another. */
export function Stars({ count, animated = false }: { count: number; animated?: boolean }) {
  return (
    <span className="stars" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} aria-hidden="true" className={`star${n <= count ? ' star-on' : ''}${animated && n <= count ? ' star-pop' : ''}`} style={{ animationDelay: `${n * 160}ms` }}>★</span>
      ))}
    </span>
  );
}

type SliderProps = { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void };

export function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <label className="field">
      <span className="field-label slider-label"><span>{label}</span><output>{format(value)}</output></span>
      <input className="slider" type="range" min={min} max={max} step={step} value={value} aria-valuetext={format(value)} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
