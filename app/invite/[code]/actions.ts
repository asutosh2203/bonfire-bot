'use server';

import { createServClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function joinRoom(formData: FormData) {
  const roomId = formData.get('roomId') as string;
  const inviteCode = formData.get('inviteCode') as string;
  const supabase = await createServClient();

  // 1. Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // If not logged in, send them to login, then bounce them back here
    const returnUrl = encodeURIComponent(`/invite/${inviteCode}`);
    return redirect(`/?next=${returnUrl}`);
  }

  // 2. Add to Participants
  // We use 'upsert' or 'insert' with ignoreDuplicates to prevent errors if they double-click
  const { error } = await supabase
    .from('room_participants')
    .insert({ room_id: roomId, user_id: user.id })
    .select();

  // 3. Handle Result
  if (error && error.code !== '23505') {
    // 23505 = Unique violation (already joined)
    console.error('Join Error:', error);
    throw new Error('Failed to join room.');
  }

  // 4. Redirect to the Dashboard
  redirect(`/dashboard/${roomId}`);
}
