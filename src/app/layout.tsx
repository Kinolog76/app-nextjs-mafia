import type { Metadata } from 'next';
import { Unbounded, Onest } from 'next/font/google';
import './globals.css';

const display = Unbounded({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-display',
});

const body = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Mafia Rooms — онлайн-мафия с видео',
  description: 'Онлайн-комнаты для игры в Мафию: видео, роли, таймеры и голосование',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="noir-bg min-h-screen">{children}</body>
    </html>
  );
}
