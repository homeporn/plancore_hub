'use client';

import { useState } from 'react';
import { Button, Input, Card } from '@plancore/ui';
import { getBrowserClient } from '@/lib/supabase/browser';

type Mode = 'sign_in' | 'sign_up';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const client = getBrowserClient();
    try {
      if (mode === 'sign_in') {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Проверьте почту для подтверждения регистрации.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка авторизации');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto mt-10 max-w-sm rounded-xl p-6">
      <h2 className="mb-4 text-lg font-semibold">
        {mode === 'sign_in' ? 'Вход' : 'Регистрация'}
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={busy} className="w-full">
          {mode === 'sign_in' ? 'Войти' : 'Зарегистрироваться'}
        </Button>
      </form>
      {message && (
        <p className="mt-3 text-xs text-[var(--muted)]">{message}</p>
      )}
      <button
        onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
        className="mt-4 text-xs text-[var(--info)] hover:underline"
      >
        {mode === 'sign_in'
          ? 'Нет аккаунта? Зарегистрироваться'
          : 'Уже есть аккаунт? Войти'}
      </button>
    </Card>
  );
}
