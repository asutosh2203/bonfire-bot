'use client';

import { useState, useEffect } from 'react';
import {
  FiUser,
  FiMoon,
  FiMinusCircle,
  FiSettings,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { FaMinusCircle } from 'react-icons/fa';
import { FaCircle } from 'react-icons/fa6';
import { IoMdMoon } from 'react-icons/io';
import { AiFillEyeInvisible } from 'react-icons/ai';
import { useUserStore } from '@/store/useUserStore';
import { useProfileStore } from '@/store/useProfileStore';
import { createBrowClient } from '@/lib/supabase/client';

export default function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const currentUser = useUserStore((state) => state.currentUser);
  const profile = useProfileStore((state) => state.userProfile);
  // Assuming you have a way to update the profile in your store:
  const setProfile = useProfileStore((state) => state.setUserProfile);
  const supabase = createBrowClient();

  // Local state for the input field
  const [activityText, setActivityText] = useState(
    profile?.custom_activity || '',
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !profile) return null;

  // Optimistic update for status changes
  const handleStatusChange = async (newStatus: string) => {
    // 1. Instantly update Zustand (Triggers WebSocket broadcast immediately)
    setProfile({ ...profile, preferred_status: newStatus });

    // 2. Quietly update the database in the background
    await supabase
      .from('profiles')
      .update({ preferred_status: newStatus })
      .eq('id', currentUser?.id);
  };

  // Handle custom activity saves
  const handleActivitySave = async () => {
    if (activityText === profile.custom_activity) return;

    setIsSaving(true);
    setProfile({ ...profile, custom_activity: activityText });

    await supabase
      .from('profiles')
      .update({ custom_activity: activityText })
      .eq('id', currentUser?.id);

    setIsSaving(false);
  };

  const handleActivityClear = async () => {
    setActivityText('');
    setProfile({ ...profile, custom_activity: null });

    await supabase
      .from('profiles')
      .update({ custom_activity: null })
      .eq('id', currentUser?.id);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <div className='flex items-center justify-center rounded-full'>
            <FaCircle size={12} className='text-green-500' />
          </div>
        );
      case 'idle':
        return (
          <div className='flex items-center justify-center rounded-full'>
            <IoMdMoon size={14} className='text-yellow-600' />
          </div>
        );
      case 'dnd':
        return (
          <div className='flex h-3 w-3 items-center justify-center rounded-full text-white'>
            <FaMinusCircle size={14} className='text-red-500' />
          </div>
        );
      case 'invisible':
        return (
          <div className='flex items-center justify-center rounded-full text-white'>
            <AiFillEyeInvisible size={14} className='text-gray-500' />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className='w-80 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1E] shadow-2xl'
        onClick={(e) => e.stopPropagation()} // Prevent clicking inside from closing it
      >
        {/* Header Banner */}
        <div className='h-16 bg-[#ff5405]'></div>

        <div className='px-4 pb-4'>
          {/* Avatar & Status Row */}
          <div className='relative -mt-8 mb-3 flex items-end justify-between'>
            <div className='relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#1A1A1E] bg-gray-700 text-3xl text-white'>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt='Avatar'
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                <FiUser />
              )}
              <div className='absolute -bottom-1 -right-1 bg-[#1A1A1E] rounded-full h-5 w-5 flex items-center justify-center'>
                {renderStatusBadge(profile.preferred_status)}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className='mb-4'>
            <h2 className='text-xl font-bold text-white'>{profile.name}</h2>
          </div>

          {/* Custom Activity Input */}
          <div className='mb-6'>
            <label className='mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400'>
              Custom Activity
            </label>
            <div className='flex items-center gap-2 rounded-md bg-black/30 p-1 border border-white/5 focus-within:border-[#ff5405] transition-colors'>
              <input
                type='text'
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                placeholder="What's cooking?"
                className='w-full bg-transparent p-2 text-sm text-white outline-none placeholder:text-gray-600'
                maxLength={100}
              />
              {activityText && (
                <button
                  onClick={handleActivityClear}
                  className='p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer'
                >
                  <FiX />
                </button>
              )}
              <button
                onClick={handleActivitySave}
                disabled={isSaving || activityText === profile.custom_activity}
                className='rounded bg-[#ff5405] p-2 text-white hover:bg-[#ff4c05] disabled:opacity-50 transition-colors cursor-pointer'
              >
                <FiCheck />
              </button>
            </div>
          </div>

          <div className='h-px w-full bg-white/10 mb-4' />

          {/* Status Selectors */}
          <div className='flex flex-col gap-1'>
            <button
              onClick={() => handleStatusChange('online')}
              className='flex items-center gap-3 rounded-md p-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white cursor-pointer'
            >
              {renderStatusBadge('online')}
              Online
            </button>
            <button
              onClick={() => handleStatusChange('idle')}
              className='flex items-center gap-3 rounded-md p-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white cursor-pointer group'
            >
              {renderStatusBadge('idle')}
              Idle
            </button>
            <button
              onClick={() => handleStatusChange('dnd')}
              className='flex items-center gap-3 rounded-md p-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white cursor-pointer group'
            >
              {renderStatusBadge('dnd')}
              Do Not Disturb
            </button>
            <button
              onClick={() => handleStatusChange('invisible')}
              className='flex items-center gap-3 rounded-md p-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white cursor-pointer group'
            >
              {renderStatusBadge('invisible')}
              Invisible
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className='bg-black/40 p-3 flex justify-end'>
          <button className='flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white'>
            <FiSettings size={14} />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
