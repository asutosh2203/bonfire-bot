'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils'; // Make sure you have a cn utility (clsx/tailwind-merge)
import CreateRoomModal from './CreateRoomModal';

type Room = { id: string; name: string };

export default function Sidebar({ rooms }: { rooms: Room[] }) {
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Helper: "Late Night Coding" -> "LNC"
  function getInitials(input: string) {
    return input
      .trim() // Remove leading/trailing whitespace
      .split(/\s+/) // Split by one or more spaces (handles multiple spaces)
      .map((word: string) => word[0].toUpperCase()) // Take first letter and capitalize
      .join(''); // Join them back together
  }

  // Logout
  const handleLogout = async () => {
    const supabase = createBrowClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className='h-full shrink-0 z-20'>
      {/* 1. THE RAIL (Icons) */}
      <div className='w-[72px] h-full bg-[#1E1F22] flex flex-col items-center py-3 gap-2 overflow-y-auto hide-scrollbar select-none'>
        {/* List of Rooms */}
        {rooms.map((room) => {
          const isActive = pathname === `/dashboard/${room.id}`;
          return (
            <div
              key={room.id}
              className='relative group w-full flex justify-center'
            >
              {/* Tooltip (Simple browser title for MVP, or custom div later) */}

              {/* Left Pill Indicator */}
              <div
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[4px] bg-white rounded-r-full transition-all duration-200',
                  isActive
                    ? 'h-[40px]' // Tall pill if active
                    : 'h-[8px] scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-hover:h-[20px]', // Small pill on hover
                )}
              />

              <Link
                href={`/dashboard/${room.id}`}
                title={room.name}
                className={cn(
                  'w-[48px] h-[48px] flex items-center justify-center text-white font-medium transition-all duration-300 overflow-hidden shadow-sm group-active:translate-y-[1px]',
                  isActive
                    ? 'bg-[#5865F2] rounded-[16px]' // Discord Blurple & Squircle
                    : 'bg-[#313338] text-gray-300 rounded-[24px] group-hover:bg-[#5865F2] group-hover:text-white group-hover:rounded-[16px]',
                )}
              >
                {getInitials(room.name)}
              </Link>
            </div>
          );
        })}

        {/* Separator */}
        <div className='w-8 h-[2px] bg-[#35363C] rounded-full my-1' />

        {/* Create Room Button */}
        <div className='relative group w-full flex justify-center'>
          <button
            onClick={() => setIsCreating(true)}
            title='Create a Room'
            className='w-[48px] h-[48px] flex items-center justify-center bg-[#313338] text-[#FF6801] rounded-[24px] transition-all duration-300 hover:bg-green-600 hover:text-white hover:rounded-[16px] group-active:translate-y-[1px] cursor-pointer'
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Logout Button (Bottom) */}
        <div className='mt-auto mb-2 relative group w-full flex justify-center'>
          <button
            onClick={handleLogout}
            title='Sign Out'
            className='w-[48px] h-[48px] flex items-center justify-center bg-[#313338] text-red-400 rounded-[24px] transition-all duration-300 hover:bg-red-500 hover:text-white hover:rounded-[16px] cursor-pointer'
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 2. THE CREATE MODAL (Overlay) */}
      {isCreating && <CreateRoomModal onClose={() => setIsCreating(false)} />}
    </nav>
  );
}
