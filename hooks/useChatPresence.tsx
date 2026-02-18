import { useEffect, useRef, useState } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import { useProfileStore } from '@/store/useProfileStore';

import { hasPresenceChanged } from '@/lib/utils';

export function useChatPresence(roomId: string) {
  // Pulling the user and their fresh profile data from Zustand
  const currentUser = useUserStore((state) => state.currentUser);
  const profile = useProfileStore((state) => state.userProfile);

  const supabase = createBrowClient();

  // This state will hold everyone currently online in the room
  const [activeUsers, setActiveUsers] = useState<Record<string, any>>({});
  const stateCache = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!currentUser || !profile) return;

    // 1. Create a unique channel for this specific chat room
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: currentUser.id } },
    });

    // 2. Listen for anyone joining, leaving, or updating their status
    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();

      // Only update if our fast-checker finds a difference
      if (hasPresenceChanged(stateCache.current, newState)) {
        stateCache.current = structuredClone(newState); // Update the bouncer's list
        setActiveUsers({ ...newState }); // Tell React to re-render
      }
    });

    // 3. Connect to the WebSocket
    channel.subscribe(
      async (
        status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
      ) => {
        console.log(status);
        if (status === 'SUBSCRIBED') {
          // The Phantom Mode Check 👻
          if (profile.preferred_status === 'invisible') {
            console.log('Phantom Mode: ', profile);
            await channel.untrack();
          } else {
            console.log('Broadcasting: ', profile);
            // Broadcast their exact chosen status and activity
            await channel.track({
              user_id: currentUser.id,
              preferred_status: profile.preferred_status,
              custom_activity: profile.custom_activity,
              name: profile.name,
              avatar_url: profile.avatar_url,
            });
          }
        }
      },
    );

    // 4. Cleanup when they leave the room or close the tab
    return () => {
      channel.unsubscribe();
    };
  }, [roomId, currentUser, profile]);

  return activeUsers;
}
