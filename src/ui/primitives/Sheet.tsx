// A modal bottom sheet: focus moves in and stays in, Escape / backdrop / swipe-down close it,
// and focus returns to whatever opened it.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = { title: string; onClose: () => void; children: ReactNode };

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const SWIPE_CLOSE_PX = 90;

export function Sheet({ title, onClose, children }: Props) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const opener = document.activeElement;
    const sheet = sheetRef.current;
    if (sheet === null) throw new Error('Sheet mounted without its element');
    sheet.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') return onClose();
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const leavingForward = !event.shiftKey && document.activeElement === last;
    const leavingBackward = event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget);
    if (!leavingForward && !leavingBackward) return;
    event.preventDefault();
    (leavingForward ? first : last).focus();
  };

  const onHandleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStartY(event.clientY);
  };
  const onHandleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartY !== null) setDragOffset(Math.max(0, event.clientY - dragStartY));
  };
  const onHandleUp = () => {
    if (dragOffset > SWIPE_CLOSE_PX) return onClose();
    setDragStartY(null);
    setDragOffset(0);
  };

  // Rendered at the document root so it can be opened from anywhere, including inside a paragraph.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={sheetRef}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
        onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="sheet-handle" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}><span /></div>
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button className="btn btn-small" onClick={onClose}>Done</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
