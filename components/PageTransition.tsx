"use client";

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // `popLayout` pulls the exiting page out of flow immediately so the incoming page can
    // take its place without being shoved down for the ~0.3s the old one takes to fade —
    // the default `sync` mode keeps both mounted in normal flow at once, which visibly
    // jumps the layout on every navigation.
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
