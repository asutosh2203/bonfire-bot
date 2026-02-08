'use client';

import { useState, useEffect } from 'react';
import { UserContextModal } from '@/components/bonfire/UserContextModal';
import LoginButton from '@/components/bonfire/LoginButton';
import { Flame } from 'lucide-react';
import { UserContext } from '@/lib/types';
import { createBrowClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export default function Home() {
  /* ---------------- AUTH STATE ---------------- */
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* ---------------- PROFILE STATE ---------------- */
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  const router = useRouter();

  /* ---------------- INITIAL AUTH CHECK ---------------- */
  useEffect(() => {
    const supabase = createBrowClient();

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserContext({
            name: profile.name,
            vibe: profile.vibe,
            insecurity: profile.insecurity,
          });
        }
      }

      setAuthLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
        if (!session) setUserContext(null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  /* ---------------- UI STATE ---------------- */
  const uiState = authLoading
    ? 'loading'
    : user && userContext
      ? 'redirect'
      : !user
        ? 'login'
        : 'context';

  /* ---------------- REDIRECT ---------------- */
  useEffect(() => {
    if (uiState === 'redirect') {
      router.replace('/dashboard');
    }
  }, [uiState, router]);

  /* ---------------- RENDER ---------------- */

  if (uiState === 'loading') {
    return (
      <div className='h-screen bg-[#0E1621] flex items-center justify-center'>
        <div className='w-8 h-8 bg-orange-500 rounded-full animate-ping' />
      </div>
    );
  }

  if (uiState === 'redirect') {
    return null;
  }

  if (uiState === 'login') {
    return (
      <div className='flex flex-col h-screen bg-[#0E1621] text-white items-center justify-center p-6 relative overflow-hidden'>
        <div className='absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none' />
        <div className='absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none' />

        <div className='z-10 text-center space-y-8 max-w-md'>
          <div className='w-24 h-24 bg-linear-to-br from-orange-500 to-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform transition-transform rotate-3 hover:-rotate-3 animate-pulse'>
            <Flame size={48} fill='currentColor' className='text-white' />
          </div>

          <div className='space-y-2'>
            <h1 className='text-4xl font-bold tracking-tight'>Bonfire</h1>
            <p className='text-blue-200/60 text-lg'>
              The group chat that roasts you back.
            </p>
          </div>

          <div className='pt-4 flex justify-center'>
            <LoginButton />
          </div>

          <p className='text-xs text-gray-500 pt-8'>
            By entering, you agree to be judged. 💀
          </p>
        </div>
      </div>
    );
  }

  // context state
  return <UserContextModal onSubmit={(ctx) => setUserContext(ctx)} />;
}
