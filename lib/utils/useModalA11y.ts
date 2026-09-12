"use client";

import { useEffect, useRef } from "react";

/**
 * Escape-to-close + focus restoration for modals.
 *
 * The brief requires the app to be "entirely navigable via keyboard (Tab,
 * Enter, Space)." Native <button>/<input>/<select> elements already get
 * Tab/Enter/Space for free, but a modal ALSO needs:
 *   1. Escape to close it (standard modal expectation).
 *   2. Focus to land inside the modal when it opens, so Tab doesn't leave
 *      the user tabbing through the page behind it.
 *   3. Focus to return to whatever opened the modal when it closes, so
 *      keyboard users aren't dropped back at the top of the page.
 */
export function useModalA11y(open: boolean, onClose: () => void, initialFocusRef?: React.RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      // Defer to let the modal mount before focusing.
      const id = requestAnimationFrame(() => {
        initialFocusRef?.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    } else {
      triggerRef.current?.focus?.();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
}
