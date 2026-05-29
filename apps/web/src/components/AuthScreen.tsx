'use client';

import { useState } from 'react';
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
    <div className="mx-auto mt-10 max-w-sm rounded-xl border border-[var(--border)] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        {mode === 'sign_in' ? 'Вход' : 'Регистрация'}
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--foreground)] py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {mode === 'sign_in' ? 'Войти' : 'Зарегистрироваться'}
        </button>
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
    </div>
  );
}
