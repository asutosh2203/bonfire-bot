'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { createRoom } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CreateRoomModalProps {
  onClose: () => void;
}

export default function CreateRoomModal({ onClose }: CreateRoomModalProps) {
  const [input, setInput] = useState('');
  const [bonfireEnabled, setBonfireEnabled] = useState(true);

  const router = useRouter();

  // Helper: "Late Night Coding" -> "LNC"
  function getInitials(input: string) {
    return input
      .trim() // Remove leading/trailing whitespace
      .split(/\s+/) // Split by one or more spaces (handles multiple spaces)
      .map((word: string) => word[0].toUpperCase()) // Take first letter and capitalize
      .join(''); // Join them back together
  }

  // Create Room
  const handleCreate = async () => {
    if (!input.trim()) return;
    const res = await createRoom(input, bonfireEnabled);
    onClose();
    setInput('');
    router.push(`/dashboard/${res.roomId}`);
  };

  return (
    <div className='fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='bg-[#313338] w-full max-w-sm p-6 rounded-md shadow-2xl animate-in zoom-in-95 duration-200'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-xl font-bold text-white uppercase tracking-wide text-center w-full'>
            Create Server
          </h3>
          <button
            onClick={onClose}
            className='absolute right-4 top-4 text-gray-400 hover:text-white cursor-pointer'
          >
            <X size={24} />
          </button>
        </div>

        <div className='space-y-4'>
          <div className='flex justify-center'>
            <div className='w-24 h-24 rounded-full bg-[#1E1F22] border-2 border-dashed border-gray-500 flex items-center justify-center text-gray-400 text-2xl font-bold uppercase'>
              {input ? getInitials(input) : '?'}
            </div>
          </div>

          <div className='text-center text-gray-300 text-sm pb-2'>
            Give your new server a personality.
          </div>

          <div>
            <label className='text-xs font-bold text-gray-400 uppercase mb-2 block'>
              Server Name
            </label>
            <input
              autoFocus
              className='w-full bg-[#1E1F22] text-white px-3 py-2 rounded border-none focus:ring-2 focus:ring-[#5865F2] outline-none transition'
              placeholder='e.g. The Bonfire Pit'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Bonfire AI Toggle */}
          <div
            className='bg-[#1E1F22] p-3 rounded border border-white/5 flex items-center justify-between cursor-pointer group'
            onClick={() => setBonfireEnabled(!bonfireEnabled)}
          >
            <div className='flex flex-col'>
              <span className='text-sm font-bold text-gray-200 group-hover:text-white transition'>
                Enable Bonfire AI
              </span>
              <span className='text-xs text-gray-500'>
                {bonfireEnabled
                  ? 'She will listen and roast everyone.'
                  : 'She will be locked out of this room.'}
              </span>
            </div>

            {/* The Toggle Switch */}
            <div
              className={cn(
                'w-10 h-6 rounded-full relative transition-colors duration-200',
                bonfireEnabled ? 'bg-orange-600' : 'bg-gray-600',
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200',
                  bonfireEnabled ? 'left-5' : 'left-1',
                )}
              />
            </div>
          </div>

          <div className='flex justify-between items-center pt-4'>
            <button
              onClick={onClose}
              className='text-sm hover:underline text-gray-300 cursor-pointer'
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!input.trim()}
              className='bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
