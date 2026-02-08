'use client';

import { Hash, Users, Settings } from 'lucide-react';
import RoomSettings from './RoomSettings'; // reusing the component from before
import { useState } from 'react';

type Props = {
  roomName: string;
  roomId: string;
  inviteCode: string;
  isOwner: boolean;
};

export default function ChatHeader({
  roomName,
  roomId,
  inviteCode,
  isOwner,
}: Props) {
  const [showMembers, setShowMembers] = useState(false); // Local state for mobile toggle if needed

  return (
    <div className='h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#313338] shadow-sm shrink-0'>
      {/* Left: Room Title */}
      <div className='flex items-center gap-2 text-white'>
        <Hash className='text-gray-400' size={20} />
        <h1 className='font-bold text-2xl italic truncate'>{roomName}</h1>
        {/* Optional: Add a topic description here later */}
      </div>

      {/* Right: Actions */}
      <div className='flex items-center gap-4'>
        {/* The Security/Invite Modal */}
        <RoomSettings
          roomId={roomId}
          currentCode={inviteCode}
          isOwner={isOwner}
        />

        {/* Member List Toggle (Visual only for now, desktop usually keeps it open) */}
        <button
          className='text-gray-400 hover:text-white transition cursor-pointer'
          title='Member List'
        >
          <Users size={20} />
        </button>
      </div>
    </div>
  );
}
