import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import "./record-interactions.css";

export function RecordSwipe({ children, open, onOpen, onEdit, onDelete, disabled, name }: { children: ReactNode; open: boolean; onOpen: (open: boolean) => void; onEdit: () => void; onDelete: () => void; disabled: boolean; name: string }) {
  const cleanup = useRef<() => void>(() => {});
  const suppressUntil = useRef(0);
  useEffect(() => () => cleanup.current(), []);
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('.record-drawer, .record-menu-access')) return;
    cleanup.current();
    const startX = event.clientX, startY = event.clientY, id = event.pointerId;
    let dx = 0, dy = 0, cancelled = false;
    const reveal = () => { suppressUntil.current = Date.now() + 800; onOpen(true); };
    const timer = window.setTimeout(() => { if (!cancelled) reveal(); }, 500);
    const move = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== id) return;
      dx = next.clientX - startX; dy = next.clientY - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) window.clearTimeout(timer);
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) cancelled = true;
    };
    const end = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== id) return;
      if (next.type === 'pointerup' && !cancelled && Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 2) {
        suppressUntil.current = Date.now() + 800;
        onOpen(dx > 0);
      }
      cleanup.current();
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    cleanup.current = () => { clearTimeout(timer); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', end, true); window.removeEventListener('pointercancel', end, true); };
  };
  return <div className={`record-swipe ${open ? 'is-open' : ''}`} onPointerDown={begin} onContextMenu={event => { event.preventDefault(); if (!disabled) onOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') onOpen(false); }}>
    <div className="record-drawer" aria-hidden={!open}>
      <button tabIndex={open ? 0 : -1} disabled={disabled || !open} onClick={onEdit}>编辑记录</button>
      <button tabIndex={open ? 0 : -1} disabled={disabled || !open} onClick={onDelete}>删除记录</button>
      <button tabIndex={open ? 0 : -1} disabled={!open} onClick={() => onOpen(false)}>收起</button>
    </div>
    <div className="record-swipe-content" onClickCapture={event => {
      if (Date.now() < suppressUntil.current || open) { event.preventDefault(); event.stopPropagation(); if (Date.now() >= suppressUntil.current) onOpen(false); }
    }}>{children}</div>
    <button className="record-menu-access" disabled={disabled} aria-label={`${name}的记录操作`} aria-expanded={open} onClick={() => onOpen(!open)}>···</button>
  </div>;
}
