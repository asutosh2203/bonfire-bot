'use client';

import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowClient } from '@/lib/supabase/client'; // Adjust this import to your actual setup
import { useUserStore } from '@/store/useUserStore';
import { useProfileStore } from '@/store/useProfileStore';

import { FaGear } from 'react-icons/fa6';
import { RiLogoutCircleRLine } from 'react-icons/ri';
import UserAvatar from './UserAvatar';
import SettingsModal from './UserSettingsModal';

export default function UserProfileCard({
  user,
  profile,
}: {
  user: any;
  profile: any;
}) {
  const router = useRouter();

  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const currentUser = useUserStore((state) => state.currentUser);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const isLoading = !user || !profile;

  const supabase = createBrowClient();

  // Set user and profile to global state
  useEffect(() => {
    setCurrentUser(user);
  }, [user, profile]);

  // auth subscription
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setCurrentUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.replace('/');
  };

  // Skeleton loader so the UI doesn't jump around before the user loads
  if (isLoading) {
    return (
      <div className='flex w-[18rem] h-14 absolute bottom-[30px] right-4 z-50 rounded-lg bg-[#202024] p-3 shadow-md animate-pulse'></div>
    );
  }

  // If somehow there's no user, don't render the card
  if (!currentUser) return null;

  return (
    <>
      <div className='flex w-[18rem] absolute bottom-[30px] right-4 z-50 items-center justify-between rounded-lg bg-[#202024] p-3 text-white shadow-md'>
        <div className='flex items-center gap-3'>
          {/* Avatar Placeholder */}
          <UserAvatar user={profile} bgColor='#202024' />

          {/* User Info & Status */}
          <div className='flex flex-col'>
            <span className='text-xs font-semibold'>
              {profile?.name || 'User'}
            </span>
            <div className='flex items-center gap-1'>
              <span className='text-xs text-gray-400'>
                {profile?.custom_activity}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center text-gray-400'>
          <button
            className='rounded-md p-2 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer'
            title='Settings'
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <FaGear size={16} />
          </button>
          <button
            onClick={handleLogout}
            className='rounded-md p-2 gap-2 hover:bg-red-900/50 hover:text-red-400 transition-colors cursor-pointer'
            title='Logout'
          >
            <RiLogoutCircleRLine size={16} />
          </button>
        </div>
      </div>
      {isSettingsModalOpen && (
        <SettingsModal
          key={isSettingsModalOpen ? 'open' : 'closed'}
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </>
  );
}
