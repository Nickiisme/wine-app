/** Web implementation of the platform seam. A mini program can supply these
 * capabilities without changing the tasting screens or business modules. */
export const platform = {
  id: () => crypto.randomUUID(),
  storage: {
    get: (key: string) => window.localStorage.getItem(key),
    set: (key: string, value: string) => window.localStorage.setItem(key, value),
  },
  delay: (callback: () => void, milliseconds: number) => window.setTimeout(callback, milliseconds),
  cancelDelay: (timer: number) => window.clearTimeout(timer),
  frame: (callback: FrameRequestCallback) => window.requestAnimationFrame(callback),
  cancelFrame: (frame: number) => window.cancelAnimationFrame(frame),
  preloadImage: (src: string) => { const image = new Image(); image.src = src; },
  createPreview: (blob: Blob) => URL.createObjectURL(blob),
  revokePreview: (url: string) => URL.revokeObjectURL(url),
  readBase64: (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      const separator = result.indexOf(",");
      if (separator < 0) reject(new Error("无法读取酒标照片"));
      else resolve(result.slice(separator + 1));
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("无法读取酒标照片")), { once: true });
    reader.readAsDataURL(file);
  }),
  currentUrl: () => window.location.href,
  share: async (title: string, text: string) => {
    if (navigator.share) await navigator.share({ title, text, url: window.location.href });
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  },
  isShareCancelled: (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  emitAnalytics: (event: string, properties: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent("wine-app:analytics", { detail: { event, properties } }));
    (window as typeof window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer?.push({ event, ...properties });
  },
  onPageHidden: (callback: () => void) => {
    const listener = () => { if (document.hidden) callback(); };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
  onEditorActivity: (callback: (target: EventTarget | null, afterFocus: boolean) => void) => {
    const focus = (event: FocusEvent) => callback(event.target, true);
    const input = (event: Event) => callback(event.target, false);
    document.addEventListener("focusin", focus);
    document.addEventListener("input", input);
    return () => { document.removeEventListener("focusin", focus); document.removeEventListener("input", input); };
  },
  isTextEditor: (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement,
  onPointer: (type: "pointermove" | "pointerup" | "pointercancel", listener: (event: PointerEvent) => void) => {
    window.addEventListener(type, listener, true);
    return () => window.removeEventListener(type, listener, true);
  },
  onSaveViewportChange: (callback: () => void) => {
    window.visualViewport?.addEventListener("resize", callback);
    window.visualViewport?.addEventListener("scroll", callback);
    window.addEventListener("resize", callback);
    return () => {
      window.visualViewport?.removeEventListener("resize", callback);
      window.visualViewport?.removeEventListener("scroll", callback);
      window.removeEventListener("resize", callback);
    };
  },
  saveBarInset: (previewInset: number) => {
    const previewKeyboard = document.querySelector<HTMLElement>(".keyboard-dock");
    if (previewKeyboard && window.getComputedStyle(previewKeyboard).display !== "none") return previewInset;
    const app = document.querySelector<HTMLElement>(".wine-app");
    const viewport = window.visualViewport;
    const visibleBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
    const obscured = Math.max(0, (app?.getBoundingClientRect().bottom ?? visibleBottom) - visibleBottom);
    return obscured >= 80 ? Math.round(obscured) : 0;
  },
  onNativeKeyboardClosed: (callback: () => void) => {
    const viewport = window.visualViewport;
    if (!viewport) return () => {};
    let expandedHeight = viewport.height;
    let wasOpen = false;
    const sync = () => {
      expandedHeight = Math.max(expandedHeight, viewport.height);
      if (viewport.height < expandedHeight - 120) wasOpen = true;
      else if (wasOpen && viewport.height > expandedHeight - 60) { wasOpen = false; callback(); }
    };
    viewport.addEventListener("resize", sync);
    return () => viewport.removeEventListener("resize", sync);
  },
  resetFirstScroll: () => { const scroll = document.querySelector<HTMLElement>(".mobile-scroll"); if (scroll) scroll.scrollTop = 0; },
  scrollAuthMessage: () => document.querySelector(".auth-message")?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
  keepEditorAboveKeyboard: (editor: HTMLElement) => {
    const scroll = editor.closest<HTMLElement>(".mobile-scroll");
    if (!scroll) return;
    const scrollBounds = scroll.getBoundingClientRect();
    const editorBounds = editor.getBoundingClientRect();
    const visibleTop = scrollBounds.top + 20;
    const visibleBottom = scrollBounds.bottom - 20;
    let next = scroll.scrollTop;
    if (editorBounds.bottom > visibleBottom) next += editorBounds.bottom - visibleBottom;
    else if (editorBounds.top < visibleTop) next -= visibleTop - editorBounds.top;
    const clamped = Math.max(0, Math.min(Math.max(0, scroll.scrollHeight - scroll.clientHeight), next));
    if (Math.abs(clamped - scroll.scrollTop) > 1) scroll.scrollTo({ top: clamped, behavior: "smooth" });
  },
  installPasswordToggle: () => {
    const input = document.querySelector<HTMLInputElement>(".auth-fields input[type='password']");
    const label = input?.closest("label");
    if (!input || !label) return () => {};
    label.classList.add("has-password-toggle");
    const toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "显示密码"); toggle.setAttribute("aria-pressed", "false"); toggle.textContent = "◉";
    toggle.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.textContent = visible ? "◉" : "⊙";
      toggle.setAttribute("aria-label", visible ? "显示密码" : "隐藏密码");
      toggle.setAttribute("aria-pressed", String(!visible));
    });
    label.append(toggle);
    return () => { toggle.remove(); label.classList.remove("has-password-toggle"); };
  },
};

export type PlatformAdapter = typeof platform;
