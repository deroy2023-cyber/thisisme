"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a media query and re-renders when it changes.
 *
 * Every matchMedia call in this codebase except custom-cursor.tsx's was a
 * one-shot read taken inside an event handler or on mount, with no `change`
 * listener — so a resize or a phone rotation across the breakpoint was never
 * re-evaluated. The menu in particular only re-read the query on its next
 * open, which meant rotating a phone while the menu was open left it in the
 * layout for the previous orientation.
 *
 * Returns false on the server and for the first client render, so the markup
 * matches and there is no hydration mismatch. Consumers that would flash the
 * wrong layout for that one frame should gate on a `mounted` flag as well —
 * see services.tsx, which pairs `mounted && isDesktop` for exactly that reason.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Read once on mount as well as subscribing: the query may already be true
    // by the time the effect runs, and `change` only fires on transitions.
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * True once the component has mounted on the client.
 *
 * Pairs with useMediaQuery wherever rendering the mobile branch for one frame
 * on a desktop viewport would be visible. Same purpose as the `mounted` flag
 * services.tsx already carries.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
