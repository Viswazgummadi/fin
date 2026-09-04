"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wallet, Tags, Tag, Users, Repeat, Target, ShieldAlert, CalendarDays, Zap, type LucideIcon } from 'lucide-react';

const MANAGE_LINKS: [string, string, LucideIcon][] = [
  ['Quick spend', '/manage/quick-spend', Zap],
  ['Accounts', '/accounts', Wallet],
  ['Categories', '/categories', Tags],
  ['Tags', '/tags', Tag],
  ['People', '/people', Users],
  ['Recurring Rules', '/recurring-rules', Repeat],
  ['Goals', '/goals', Target],
  ['Limits', '/limits', ShieldAlert],
  ['Calendar', '/calendar', CalendarDays],
];

export function ManageGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MANAGE_LINKS.map(([label, href, Icon], index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: index * 0.035, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link href={href} className="surface-card flex items-center gap-3 p-4">
            <span className="surface-soft flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon size={18} className="text-[--accent-2]" />
            </span>
            <div className="min-w-0">
              <div className="font-medium">{label}</div>
              <div className="mt-0.5 truncate text-xs text-[--text-muted]">Open {label.toLowerCase()}</div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
