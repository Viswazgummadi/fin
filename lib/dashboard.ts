export type DashboardWidget = {
  id: string;
  type: 'balance' | 'spending-trend' | 'recent-transactions' | 'budget-summary' | 'top-categories';
  position: number;
  visible: boolean;
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'balance', type: 'balance', position: 0, visible: true },
  { id: 'spending-trend', type: 'spending-trend', position: 1, visible: true },
  { id: 'recent-transactions', type: 'recent-transactions', position: 2, visible: true },
  { id: 'budget-summary', type: 'budget-summary', position: 3, visible: true },
  { id: 'top-categories', type: 'top-categories', position: 4, visible: true },
];

export function getUserDashboardWidgets(): DashboardWidget[] {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;
  
  try {
    const raw = window.localStorage.getItem('fin.dashboard-widgets.v1');
    if (!raw) return DEFAULT_WIDGETS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function saveUserDashboardWidgets(widgets: DashboardWidget[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('fin.dashboard-widgets.v1', JSON.stringify(widgets));
}