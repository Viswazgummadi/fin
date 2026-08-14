import './globals.css';
import type { Metadata, Viewport } from 'next';
import { PWARegister } from '../components/PWARegister';

export const metadata: Metadata = {
  title: 'Personal Finance Journal',
  description: 'A private personal money journal and analysis app.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f10',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
