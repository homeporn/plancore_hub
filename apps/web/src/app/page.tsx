'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { AuthScreen } from '@/components/AuthScreen';
import { Skeleton } from '@/components/ui/skeleton';

/** Landing / sign-in screen: brand title plus the login & registration form. */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Signed-in users go straight to their projects.
  useEffect(() => {
    if (!loading && user) router.replace('/hub');
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-12">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            P
          </span>
          <span className="text-2xl font-semibold tracking-tight">PlanCore</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Аудит и построение календарно-сетевых графиков
        </p>
      </div>

      {loading || user ? <Skeleton className="h-80 w-full max-w-sm" /> : <AuthScreen />}
    </main>
  );
}
