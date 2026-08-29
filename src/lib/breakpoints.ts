/**
 * Tailwind's breakpoints, mirrored for the JS that has to agree with them.
 *
 * These were previously written as bare literals in four places
 * (navbar, fullscreen-menu, about, services, plus a `768` inside a Next
 * `sizes` attribute in work-card). Two of them had already drifted: about.tsx
 * gated its animation on 768 while the layout that animation drives is keyed
 * to `lg:`, so between 768 and 1023px the JS believed it was on desktop while
 * the CSS was still stacked.
 *
 * These are the STOCK Tailwind v4 values. globals.css deliberately does not
 * override --breakpoint-*, so `md:` really is 768 and `lg:` really is 1024.
 * If a --breakpoint-* override is ever added to @theme, it must be mirrored
 * here — there is no way to read Tailwind's scale from JS at runtime.
 */
export const BP = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** `(min-width: Npx)`, for matchMedia. */
export const mqUp = (min: number) => `(min-width: ${min}px)`;

/**
 * The height floor that excludes landscape phones from the menu's desktop layout.
 *
 * The menu's desktop layout is nine absolutely positioned blocks with no flow
 * relationship, so nothing pushes anything else and collisions are silent. A
 * landscape phone (844x390) is above `md` on width and so used to take that
 * layout inside 390px of height, where the links overlapped the video and
 * wordmark by ~80px. This floor is what sends it to the mobile stack instead.
 *
 * The number is chosen to sit ABOVE the tallest landscape phone (~430px) and
 * BELOW any real desktop viewport — it is NOT "the height the layout needs to
 * fit". It was briefly 600px on that mistaken reading, which broke every wide
 * but short window: a snapped/half-height window, or one with DevTools docked
 * to the bottom, dropped the whole desktop composition — video included — into
 * the mobile stack. Viewport height, not screen height, is what is tested here,
 * so the floor must stay well clear of anything a desktop user can produce.
 *
 * MIRRORED in app/globals.css as the `wide` / `max-wide` custom variants. The
 * two are a single decision expressed twice — CSS cannot read this constant —
 * so changing one without the other silently desyncs the layout from the JS
 * that gates the menu video's load()/play().
 */
export const MENU_DESKTOP_MIN_H = 440;

/** The menu's desktop layout only applies when BOTH width and height allow it. */
export const MENU_DESKTOP_MQ = `${mqUp(BP.md)} and (min-height: ${MENU_DESKTOP_MIN_H}px)`;
