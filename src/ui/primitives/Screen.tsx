// Page frame shared by every screen, plus the two navigation aids that sit in it.
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type ScreenProps = {
  title: string;
  onBack: (() => void) | null;
  children: ReactNode;
  /** Shown under the title bar (e.g. the step indicator). */
  subheader?: ReactNode;
  /** Docked at the bottom: the screen's primary action or the tab bar. */
  footer?: ReactNode;
  /** Use the two-pane desktop width. */
  wide?: boolean;
};

export function Screen({ title, onBack, children, subheader, footer, wide = false }: ScreenProps) {
  return (
    <div className={wide ? 'screen screen-wide' : 'screen'}>
      <header className="topbar">
        <div className="topbar-row">
          {onBack !== null ? <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon name="back" /></button> : <span className="icon-btn-spacer" />}
          <h1>{title}</h1>
          <span className="icon-btn-spacer" />
        </div>
        {subheader}
      </header>
      <main className="content">{children}</main>
      {footer !== undefined && <footer className="footer">{footer}</footer>}
    </div>
  );
}

export type Step<T extends string> = { id: T; label: string };

type StepIndicatorProps<T extends string> = { steps: Step<T>[]; current: T; onGo: (id: T) => void; canGo: (id: T) => boolean };

/** Shows where the player is inside a level and lets them step back to earlier stages. */
export function StepIndicator<T extends string>({ steps, current, onGo, canGo }: StepIndicatorProps<T>) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <ol className="steps" aria-label="Level progress">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'step-done' : index === currentIndex ? 'step-current' : 'step-todo';
        const reachable = index !== currentIndex && canGo(step.id);
        return (
          <li key={step.id} className={`step-item ${state}`} aria-current={index === currentIndex ? 'step' : undefined}>
            {reachable ? <button onClick={() => onGo(step.id)}>{step.label}</button> : <span>{step.label}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export type Tab<T extends string> = { id: T; label: string; icon: IconName };

export function TabBar<T extends string>({ tabs, current, onGo }: { tabs: Tab<T>[]; current: T; onGo: (id: T) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((tab) => (
        <button key={tab.id} className={tab.id === current ? 'tab tab-on' : 'tab'} aria-current={tab.id === current ? 'page' : undefined} onClick={() => onGo(tab.id)}>
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

type CalloutTone = 'good' | 'bad' | 'warn' | 'info';
const CALLOUT_ICON: Record<CalloutTone, IconName> = { good: 'check', bad: 'alert', warn: 'alert', info: 'bulb' };

/** A tinted message box. The icon and title carry the status, never the colour alone. */
export function Callout({ tone, title, children, action }: { tone: CalloutTone; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`callout callout-${tone}`}>
      <span className="callout-icon"><Icon name={CALLOUT_ICON[tone]} size={20} /></span>
      <div className="callout-body">
        <strong>{title}</strong> {children}
        {action !== undefined && <div className="callout-action">{action}</div>}
      </div>
    </div>
  );
}
