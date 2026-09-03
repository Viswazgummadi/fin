// Auto-hide nav preference: sidebar + header slide away and reveal on cursor
// proximity to the screen edge. Desktop-only by design (see useAutoHideNav) —
// stored as a raw on/off flag here so Settings can read/write it directly.
export const AUTO_HIDE_NAV_KEY = 'fin.autohide-nav';
export const AUTO_HIDE_NAV_EVENT = 'fin:autohide-nav-change';

export function readAutoHideNavPref(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTO_HIDE_NAV_KEY) === 'true';
}

export function writeAutoHideNavPref(value: boolean) {
  window.localStorage.setItem(AUTO_HIDE_NAV_KEY, String(value));
  window.dispatchEvent(new CustomEvent(AUTO_HIDE_NAV_EVENT, { detail: value }));
}
