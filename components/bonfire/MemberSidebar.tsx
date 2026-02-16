'use client';
import { useChatPresence } from '@/hooks/useChatPresence';
import { useProfileStore } from '@/store/useProfileStore';
import { useUserStore } from '@/store/useUserStore';
import { useEffect } from 'react';

import { FaMinusCircle } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';
import { IoMdMoon } from 'react-icons/io';
import UserAvatar from '../user/UserAvatar';

export default function MemberSidebar({
  roomId,
  participants,
}: {
  roomId: string;
  participants: any[];
}) {
  const activeUsers = useChatPresence(roomId);
  // activeUsers is an object with user_id as key and an array of presence data as value
  // Example: { "user1": [ { "user_id": "user1", "status": "online", "activity": "Working on project", "name": "John Doe", "avatar_url": "https://example.com/avatar.jpg" } ] }
  const members = Object.values(activeUsers).map(
    (presenceArray: any) => presenceArray[0],
  );

  // 1. Create an O(1) lookup Set of the active IDs
  const activeUserIds = new Set(members.map((member) => member.user_id));

  // 2. Filter the master list and force the offline state
  const offlineMembers = participants
    .filter((participant) => !activeUserIds.has(participant.id))
    .map((user) => ({
      ...user,
      preferred_status: 'offline',
      custom_activity: null, // Wipe out any stale activity text so it's perfectly clean
    }));


  const currentUser = useUserStore((state) => state.currentUser);

  const currentUserProfile = participants.find((participant) => {
    return participant.id === currentUser?.id;
  });

  // Update the user profile when the current user's presence changes
  useEffect(() => {
    useProfileStore.setState({ userProfile: currentUserProfile });
  }, [currentUserProfile]);

  return (
    <div className='w-[20rem] bg-[#121214] flex-col hidden lg:flex border-l border-white/10 px-2 py-4'>
      <div className='px-2 font-bold text-gray-400 tracking-wide'>
        Online - {members?.length}
      </div>

      <div className='flex flex-col'>
        {members.map((user, index) => {
          return (
            <div
              key={user.user_id + index}
              className='flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-[#242428] cursor-pointer'
            >
              {/* Avatar Container */}
              <UserAvatar user={user} bgColor='#121214' />

              {/* Name and Custom Activity */}
              <div className='flex flex-col overflow-hidden'>
                <span
                  className={`text-sm font-medium truncate ${user.preferred_status === 'dnd' ? 'text-gray-400' : 'text-gray-100'}`}
                >
                  {user.name || 'Unknown User'}
                </span>

                {user.custom_activity && (
                  <span
                    className='text-xs text-gray-400 truncate'
                    title={user.custom_activity}
                  >
                    {user.custom_activity}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className='px-2 pt-4 font-bold text-gray-400 tracking-wide'>
        Offline - {offlineMembers?.length}
      </div>

      <div className='flex flex-col'>
        {offlineMembers.map((user, index) => (
          <div
            key={user.user_id + index.toString()}
            className='flex items-center gap-3 p-2 rounded-md transition-colors opacity-50 hover:opacity-100 hover:bg-[#242428] cursor-pointer'
          >
            {/* Avatar Container */}
            <UserAvatar user={user} bgColor='#121214'/>

            {/* Name and Custom Activity */}
            <div className='flex flex-col overflow-hidden'>
              <span
                className={`text-sm font-medium truncate ${user.preferred_status === 'dnd' ? 'text-gray-400' : 'text-gray-100'}`}
              >
                {user.name || 'Unknown User'}
              </span>

              {user.custom_activity && (
                <span
                  className='text-xs text-gray-400 truncate'
                  title={user.custom_activity}
                >
                  {user.custom_activity}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
