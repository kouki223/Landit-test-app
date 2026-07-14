import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'スポット探索アプリケーション',
  description: '地図上でスポットを周辺検索できる位置情報探索アプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="h-full">{children}</body>
    </html>
  );
}
