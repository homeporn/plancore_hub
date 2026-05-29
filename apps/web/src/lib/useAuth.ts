'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from './supabase/browser';

export interface AuthState {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getBrowserClient();
    let active = true;

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    signOut: async () => {
      await getBrowserClient().auth.signOut();
    },
  };
}
