import { createServClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatHeader from '@/components/bonfire/ChatHeader';
import ChatInput from '@/components/bonfire/ChatInput';
import MessageList from '@/components/bonfire/MessageList';
import MemberSidebar from '@/components/bonfire/MemberSidebar';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const roomId = (await params).id;
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // 1. Fetch Room Details
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !room) {
    console.log(error);
    return <div className='p-10 text-white'>Room not found.</div>;
  }

  // 2. Fetch Members (For the Right Sidebar)
  const { data: members } = await supabase
    .from('room_participants')
    .select('user_id, profiles(id, email, name)')
    .eq('room_id', roomId);

  // Flatten members
  const participants = members?.map((m: any) => m.profiles) || [];

  return (
    <div className='flex h-full bg-[#1A1A1E]'>
      {/* CENTER: The Chat */}
      <div className='flex-1 flex flex-col min-w-0 relative'>
        {/* Header */}
        <ChatHeader
          roomName={room.name}
          roomId={room.id}
          inviteCode={room.invite_code}
          isOwner={room.created_by === user.id}
        />

        {/* Messages Area */}
        <MessageList roomId={room.id} currentUser={user} />

        {/* Input Area */}
        <ChatInput roomId={room.id} isRoomAiEnabled={room.bonfire_enabled} />
      </div>

      {/* RIGHT: Member Sidebar */}
      <MemberSidebar members={participants} />
    </div>
  );
}
