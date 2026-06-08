import type { Metadata } from 'next';
import './globals.css';
import { ProjectProvider } from '@/context/ProjectProvider';
import { AppShell } from '@/components/shell/AppShell';
import { Toaster } from '@/components/ui/sonner';

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
      <body>
        <ProjectProvider>
          <AppShell>{children}</AppShell>
        </ProjectProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
