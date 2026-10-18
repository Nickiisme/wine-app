import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import "./record-interactions.css";
import { platform } from "./platform/web";

export function RecordSwipe({ children, open, onOpen, onEdit, onDelete, disabled, name }: { children: ReactNode; open: boolean; onOpen: (open: boolean) => void; onEdit: () => void; onDelete: () => void; disabled: boolean; name: string }) {
  const cleanup = useRef<() => void>(() => {});
  const suppressUntil = useRef(0);
  useEffect(() => () => cleanup.current(), []);
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('.record-drawer')) return;
    cleanup.current();
    const startX = event.clientX, startY = event.clientY, id = event.pointerId;
    let dx = 0, dy = 0, cancelled = false;
    const reveal = () => { suppressUntil.current = Date.now() + 800; onOpen(true); };
    const timer = platform.delay(() => { if (!cancelled) reveal(); }, 500);
    const move = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== id) return;
      dx = next.clientX - startX; dy = next.clientY - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) platform.cancelDelay(timer);
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) cancelled = true;
    };
    const end = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== id) return;
      if (next.type === 'pointerup' && !cancelled && Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 2) {
        suppressUntil.current = Date.now() + 800;
        onOpen(dx < 0);
      }
      cleanup.current();
    };
    const offMove = platform.onPointer('pointermove', move);
    const offUp = platform.onPointer('pointerup', end);
    const offCancel = platform.onPointer('pointercancel', end);
    cleanup.current = () => { platform.cancelDelay(timer); offMove(); offUp(); offCancel(); };
  };
  return <div className={`record-swipe ${open ? 'is-open' : ''}`} tabIndex={0} aria-label={`${name}的品鉴记录，长按或左滑显示操作`} onPointerDown={begin} onContextMenu={event => { event.preventDefault(); if (!disabled) onOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') onOpen(false); else if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen(true); } }}>
    <div className="record-drawer" aria-hidden={!open}>
      <button tabIndex={open ? 0 : -1} disabled={disabled || !open} onClick={onEdit}>编辑记录</button>
      <button tabIndex={open ? 0 : -1} disabled={disabled || !open} onClick={onDelete}>删除记录</button>
    </div>
    <div className="record-swipe-content" onClickCapture={event => {
      if (Date.now() < suppressUntil.current || open) { event.preventDefault(); event.stopPropagation(); if (Date.now() >= suppressUntil.current) onOpen(false); }
    }}>{children}</div>
  </div>;
}
