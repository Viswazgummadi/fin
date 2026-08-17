"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/whathappened', label: 'Journal', icon: '📝' },
    { path: '/analysis', label: 'Analysis', icon: '📈' },
    { path: '/accounts', label: 'Accounts', icon: '💰' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-[--border] bg-[--bg-primary] transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="grid grid-cols-5">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center py-3 text-xs transition-colors ${
              pathname === item.path
                ? 'text-[--accent]'
                : 'text-[--text-muted] hover:text-[--text-primary]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}