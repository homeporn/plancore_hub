'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getBrowserClient } from '@/lib/supabase/browser';

type Mode = 'sign_in' | 'sign_up';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const client = getBrowserClient();
    try {
      if (mode === 'sign_in') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Вход выполнен');
      } else {
        const { error } = await client.auth.signUp({
          email,
          password,
          // Return the user to the app after they confirm their email. The
          // origin must be allow-listed in Supabase → Auth → URL Configuration.
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success('Регистрация создана', {
          description: 'Проверьте почту для подтверждения.',
        });
      }
    } catch (err) {
      toast.error('Ошибка авторизации', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mode === 'sign_in' ? 'Вход' : 'Регистрация'}</CardTitle>
        <CardDescription>
          {mode === 'sign_in'
            ? 'Войдите, чтобы продолжить работу с проектами.'
            : 'Создайте аккаунт для доступа к PlanCore.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Подождите…' : mode === 'sign_in' ? 'Войти' : 'Зарегистрироваться'}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {mode === 'sign_in'
              ? 'Нет аккаунта? Зарегистрироваться'
              : 'Уже есть аккаунт? Войти'}
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}
