import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Pheonix Kanban',
  description: 'Pheonix real-time collaborative Kanban board built with Next.js and Socket.IO.'
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
