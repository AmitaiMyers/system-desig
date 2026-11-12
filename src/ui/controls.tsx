// Small touch-friendly form controls shared by all sheets.
import { useEffect, type ReactNode } from 'react';

/** Start every new screen at the top, like a page navigation would. */
export function useScrollTopOn(value: string): void {
  // Braces matter: newer browsers return a Promise from scrollTo, and an effect must not return one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [value]);
}

type StepperProps = { label: string; value: number; min: number; max: number; steps: number[]; onChange: (value: number) => void; note?: string };

export function Stepper({ label, value, min, max, steps, onChange, note }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const descending = [...steps].sort((a, b) => b - a);
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="stepper">
        {descending.map((step) => (
          <button key={`-${step}`} className="step" disabled={value <= min} onClick={() => onChange(clamp(value - step))}>−{step}</button>
        ))}
        <div className="step-value">{value.toLocaleString()}</div>
        {[...descending].reverse().map((step) => (
          <button key={`+${step}`} className="step" disabled={value >= max} onClick={() => onChange(clamp(value + step))}>+{step}</button>
        ))}
      </div>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

type SegmentedProps<T extends string> = { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; note?: string };

export function Segmented<T extends string>({ label, value, options, onChange, note }: SegmentedProps<T>) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="segmented">
        {options.map((o) => (
          <button key={o.value} className={o.value === value ? 'seg seg-on' : 'seg'} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

export function Toggle({ label, value, onChange, note }: { label: string; value: boolean; onChange: (value: boolean) => void; note?: string }) {
  return (
    <div className="field">
      <button className={value ? 'toggle toggle-on' : 'toggle'} onClick={() => onChange(!value)}>
        <span>{label}</span>
        <span className="toggle-pill">{value ? 'ON' : 'OFF'}</span>
      </button>
      {note !== undefined && <div className="field-note">{note}</div>}
    </div>
  );
}

export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => <span key={n} className={n <= count ? 'star star-on' : 'star'}>★</span>)}
    </span>
  );
}

export function Screen({ title, onBack, children, footer }: { title: string; onBack: (() => void) | null; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="screen">
      <header className="topbar">
        {onBack !== null ? <button className="back" onClick={onBack} aria-label="Back">‹</button> : <span className="back-spacer" />}
        <h1>{title}</h1>
        <span className="back-spacer" />
      </header>
      <main className="content">{children}</main>
      {footer !== undefined && <footer className="footer">{footer}</footer>}
    </div>
  );
}
