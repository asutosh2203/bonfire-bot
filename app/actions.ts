'use server'; // 👈 This magic string makes it a Server Action

import { createServClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type UserContext = {
  name: string;
  vibe: string;
  insecurity: string;
};

export async function saveUserProfile(formData: UserContext) {
  const supabase = await createServClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Upsert (Insert or Update) into 'profiles' table
  const { error } = await supabase.from('profiles').upsert({
    id: user.id, // Matches Auth ID
    email: user.email,
    name: formData.name,
    vibe: formData.vibe,
    insecurity: formData.insecurity,
  });

  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to save profile');
  }

  // 3. Purge the cache so the UI updates immediately
  revalidatePath('/');

  return { success: true };
}

// FETCH HISTORY
export async function getChatHistory() {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id) // Only get MY chat with the bot
    .order('created_at', { ascending: true });

  return data || [];
}

// SAVE MESSAGE (User or AI)
export async function saveMessage(
  content: string,
  role: 'user' | 'bonfire',
  isIncognito: boolean = false,
) {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // AI messages are also stored under the USER'S ID so we know whose chat it belongs to.
  // We distinguish them using the 'is_ai' flag.
  const { error } = await supabase.from('messages').insert({
    content,
    user_id: user.id,
    is_ai: role === 'bonfire',
    is_incognito: isIncognito,
  });

  if (error) console.error('Error saving message:', error);
}

// --- 1. FETCHING ROOMS ---

export async function getMyRooms() {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch rooms where the user is a participant
  const { data, error } = await supabase
    .from('room_participants')
    .select(
      `
      room_id,
      rooms (
        id,
        name,
        created_by,
        invite_code
      )
    `,
    )
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }

  // Flatten the structure for the frontend
  return data.map((item: any) => item.rooms);
}

// Used for the Invite Preview Card
export async function getRoomByInviteCode(code: string) {
  const supabase = await createServClient();
  // No auth check needed here (public preview)
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, name, created_by')
    .eq('invite_code', code)
    .single();

  if (error || !room) return null;
  return room;
}

// --- 2. CREATING & JOINING ---

export async function createRoom(roomName: string, enableBonfire: boolean) {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate a random 6-char code (e.g., "X9B22A")
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // 1. Create the Room
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      name: roomName,
      created_by: user.id,
      invite_code: inviteCode,
      bonfire_enabled: enableBonfire,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 2. Auto-join the creator
  await supabase.from('room_participants').insert({
    room_id: room.id,
    user_id: user.id,
  });

  revalidatePath('/dashboard');
  return { success: true, roomId: room.id };
}

export async function joinRoom(inviteCode: string) {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Find the room
  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('invite_code', inviteCode)
    .single();

  if (!room) return { error: 'Room not found or link expired.' };

  // 2. Add User as Participant
  const { error } = await supabase.from('room_participants').insert({
    room_id: room.id,
    user_id: user.id,
  });

  if (error) {
    // Code 23505 = Unique Violation (Already joined)
    if (error.code !== '23505') return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, roomId: room.id };
}

// --- 3. SECURITY (The "Regenerate" Feature) ---

export async function regenerateInviteCode(roomId: string) {
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // 1. Verify Ownership (Only the creator can change the lock)
  const { data: room } = await supabase
    .from('rooms')
    .select('created_by, name')
    .eq('id', roomId)
    .single();

  if (!room || room.created_by !== user.id) {
    throw new Error('Only the owner can reset the invite.');
  }

  console.log('Rotatting Invite code for:', room.name);
  // 2. Generate New Code
  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // 3. Update DB
  const { data, error } = await supabase
    .from('rooms')
    .update({ invite_code: newCode })
    .eq('id', roomId)
    .select();

  if (!data || data.length === 0) {
    console.error(
      'Update failed: RLS policy blocked the update or Room ID invalid.',
    );
    throw new Error('You do not have permission to update this room.');
  }

  if (error) {
    console.error('Error regenerating invite code:', error);
    throw new Error('Failed to regenerate code');
  }

  revalidatePath(`/dashboard/${roomId}`);
  return { success: true, newCode };
}
