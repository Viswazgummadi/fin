import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personal Finance Journal',
  description: 'A private personal money journal and analysis app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
