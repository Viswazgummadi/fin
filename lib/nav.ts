import {
  LayoutDashboard,
  Receipt,
  ChartPie,
  LayoutGrid,
  Settings,
  Wallet,
  Tags,
  Tag,
  Users,
  Target,
  ShieldAlert,
  Repeat,
  CalendarDays,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Transactions', href: '/transactions', icon: Receipt },
  { label: 'Analysis', href: '/analysis', icon: ChartPie },
  { label: 'Manage', href: '/manage', icon: LayoutGrid },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Full destination list for the command palette — primary nav plus the
// secondary screens tucked under /manage that don't otherwise get quick access.
export const ALL_DESTINATIONS: NavItem[] = [
  ...NAV_ITEMS,
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Journal', href: '/whathappened', icon: BookOpen },
  { label: 'Accounts', href: '/accounts', icon: Wallet },
  { label: 'Categories', href: '/categories', icon: Tags },
  { label: 'Tags', href: '/tags', icon: Tag },
  { label: 'People', href: '/people', icon: Users },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Limits', href: '/limits', icon: ShieldAlert },
  { label: 'Recurring rules', href: '/recurring-rules', icon: Repeat },
];

export function isActiveNavPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/' || pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
