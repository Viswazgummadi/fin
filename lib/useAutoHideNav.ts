"use client";

import { useEffect, useState } from 'react';
import { AUTO_HIDE_NAV_EVENT, readAutoHideNavPref } from './nav-preferences';

const DESKTOP_QUERY = '(min-width: 1024px)'; // matches Tailwind's `lg:` breakpoint

/**
 * Whether auto-hide nav should be ACTIVE right now — the stored preference AND
 * the viewport is desktop-sized. Deliberately re-checks viewport on resize so a
 * preference enabled on a laptop doesn't leave the sidebar/header stuck hidden
 * with no way to reveal them if the window (or a mobile browser) is narrow.
 */
export function useAutoHideNav() {
  const [pref, setPref] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setPref(readAutoHideNavPref());

    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const onViewportChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onViewportChange);

    const onPrefChange = (e: Event) => setPref(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(AUTO_HIDE_NAV_EVENT, onPrefChange);

    return () => {
      mql.removeEventListener('change', onViewportChange);
      window.removeEventListener(AUTO_HIDE_NAV_EVENT, onPrefChange);
    };
  }, []);

  return pref && isDesktop;
}
