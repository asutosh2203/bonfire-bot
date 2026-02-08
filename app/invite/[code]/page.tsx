import { createServClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation'; // 👈 Import notFound
import { joinRoom } from './actions';
import { Users } from 'lucide-react';
import LoginButton from '@/components/bonfire/LoginButton';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const supabase = await createServClient();
  const inviteCode = (await params).code;

  // 1. Fetch Room Details
  const { data: room, error } = await supabase
    .from('rooms')
    .select(
      `
      id, 
      name, 
      room_participants (count)
    `,
    )
    .eq('invite_code', inviteCode)
    .single();

  // 2. TRIGGER 404 IF INVALID
  if (!room || error) {
    notFound(); // This automatically renders not-found.tsx
  }

  // 3. Get Current User
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Auto-Redirect if Already Joined
  if (user) {
    const { data: membership } = await supabase
      .from('room_participants')
      .select('room_id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single();

    if (membership) {
      redirect(`/dashboard/${room.id}`);
    }
  }

  // 5. The "Happy Path" UI (Preview Card)
  // (We use a safe check for count just in case)
  const memberCount = room.room_participants?.[0]?.count || 0;

  return (
    <div className='min-h-screen relative flex items-center justify-center p-4 overflow-hidden'>
      {/* Background Image */}
      {user ? (
        <div
          className={`absolute inset-0 z-0 bg-cover bg-center bg-[url('/present.webp')]`}
        />
      ) : (
        <div
          className={`absolute inset-0 z-0 bg-cover bg-center bg-[url('/invite.webp')]`}
        />
      )}
      <div className='absolute inset-0 z-0 bg-black/60' /> {/* Dark Overlay */}
      <div className='relative z-10 bg-[#313338] p-8 rounded-xl shadow-2xl max-w-sm w-full text-center border border-white/10 animate-in zoom-in-95 duration-300'>
        {/* Room Initial Avatar */}
        <div className='w-24 h-24 bg-[#5865F2] rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-bold text-white shadow-lg'>
          {room.name.substring(0, 2).toUpperCase()}
        </div>

        <p className='text-gray-400 text-xs uppercase tracking-wide font-bold mb-2'>
          You've been invited to join
        </p>

        <h1 className='text-3xl font-bold text-white mb-4 truncate'>
          {room.name}
        </h1>

        <div className='flex items-center justify-center gap-2 text-gray-400 mb-8 bg-black/20 py-2 rounded-full w-fit mx-auto px-4'>
          <Users size={16} />
          <span className='text-sm font-medium'>{memberCount} Members</span>
          <span className='w-2 h-2 bg-green-500 rounded-full ml-1 animate-pulse'></span>
        </div>

        {/* The Action Form */}
        <form action={joinRoom}>
          <input type='hidden' name='roomId' value={room.id} />
          <input type='hidden' name='inviteCode' value={inviteCode} />
          <button
            type='submit'
            disabled={!user}
            className='w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 rounded transition transform hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
          >
            Accept Invite
          </button>
        </form>

        {!user && (
          <div className='flex flex-col items-center justify-center mt-5'>
            <LoginButton />
            <p className='text-xs text-gray-500 mt-4'>
              You'll need to log in to join.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
