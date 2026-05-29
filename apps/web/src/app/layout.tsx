import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanCore — аудит календарно-сетевых графиков',
  description:
    'Импорт графика из Excel и автоматический аудит качества КСГ.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
