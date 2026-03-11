import type { Metadata } from 'next';
import { SidebarLayout } from '@/components/sidebar-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Proposals',
  description: 'Freelancer proposal generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
