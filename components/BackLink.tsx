import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-[--text-secondary] transition-colors hover:text-[--text-primary]"
    >
      <ArrowLeft size={14} strokeWidth={2.25} />
      {label}
    </Link>
  );
}
