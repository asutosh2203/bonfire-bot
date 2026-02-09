import { createServClient } from '@/lib/supabase/server'; // ⚠️ Use the Server Client
import { redirect } from 'next/navigation';
import { UserContextModal } from '@/components/bonfire/UserContextModal';
import LoginButton from '@/components/bonfire/LoginButton';
import { Flame } from 'lucide-react';

export default async function Home() {
  const supabase = await createServClient();

  // 1. Check Auth on the Server (Instant)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---------------------------------------------------------
  // SCENARIO A: User is Logged In
  // ---------------------------------------------------------
  if (user) {
    // Check if they have a profile setup
    const { data: profile } = await supabase
      .from('profiles')
      .select('vibe, insecurity') // Just check fields we need
      .eq('id', user.id)
      .single();

    // ✅ FULLY SETUP? -> Get them out of here.
    if (profile?.vibe && profile?.insecurity) {
      redirect('/dashboard');
    }

    // 📝 LOGGED IN BUT NO PROFILE? -> Show the Modal.
    return <UserContextModal />;
  }

  // ---------------------------------------------------------
  // SCENARIO B: User is NOT Logged In (Show Landing Page)
  // ---------------------------------------------------------
  return (
    <div className='flex flex-col h-screen bg-[#0E1621] text-white items-center justify-center p-6 relative overflow-hidden'>
      {/* Background Effects */}
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
          {/* Pass any searchParams if you need redirect logic */}
          <LoginButton />
        </div>

        <p className='text-xs text-gray-500 pt-8'>
          By entering, you agree to be judged. 💀
        </p>
      </div>
    </div>
  );
}
