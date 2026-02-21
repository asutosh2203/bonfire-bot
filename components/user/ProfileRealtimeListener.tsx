'use client';

import { useEffect } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { useProfileStore } from '@/store/useProfileStore';

export default function ProfileRealtimeListener({
  userId,
}: {
  userId: string;
}) {
  const setUserProfile = useProfileStore((state) => state.setUserProfile);

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowClient();

    // Listen to the profiles table for this specific user
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // We only care about updates
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`, // Crucial: Only listen to YOUR profile changes
        },
        (payload: any) => {

          // Update your Zustand store instantly
          setUserProfile(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setUserProfile]);

  return null; // This is purely a logic component
}
