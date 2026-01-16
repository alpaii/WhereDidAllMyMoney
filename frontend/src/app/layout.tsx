import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '소비 관리 - WhereDidAllMyMoneyGo',
  description: '개인 소비 및 지출 관리 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
