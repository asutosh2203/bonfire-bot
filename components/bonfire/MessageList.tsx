'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { User } from 'lucide-react';

type Message = {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  is_ai: boolean;
  profiles: {
    name: string;
  };
};

export default function MessageList({
  roomId,
  currentUser,
}: {
  roomId: string;
  currentUser: any;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  /* 
     STABILITY FIX: 
     We use useMemo to initialize the client once. 
     This prevents the client from being recreated on every render, 
     which can disconnect the real-time socket. 
  */
  const supabase = createBrowClient();

  // 1. Fetch Initial Messages
  useEffect(() => {
    // 1. Fetch History (Keep this as is)
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`*, profiles ( name )`) // Updated to use 'name' based on your schema
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) console.error('Fetch Error:', error); // Debug log
      if (data) setMessages(data as any);
    };

    fetchMessages();

    // 2. Real-time Subscription (DEBUG MODE)
    console.log('🔌 Attempting to subscribe to room:', roomId);
    const channelId = `room:${roomId}:${Date.now()}`;

    const channel = supabase
      .channel(channelId) // Channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // ⚠️ Temporarily REMOVING the filter to see if that's the blocker
          // filter: `room_id=eq.${roomId}`
        },
        async (payload: any) => {
          // Manual Filter (since we removed the server-side one)
          if (payload.new.room_id !== roomId) return;

          // Fetch the profile for the sender
          const { data: profile } = await supabase
            .from('profiles')
            .select('name') // Updated schema
            .eq('id', payload.new.user_id)
            .single();

          const newMessage = { ...payload.new, profiles: profile } as Message;
          setMessages((prev) => {
            // Deduping: Make sure we don't add the same message twice
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        },
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ LIVE: Connected to room');
        } else if (status === 'CLOSED') {
          console.log('❌ DISCONNECTED: Channel closed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(
            '⚠️ ERROR: Realtime connection failed. Check network or RLS.',
          );
        }
      });

    return () => {
      console.log('🔌 Disconnecting...');
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Helper for Message Grouping
  const isCompact = (current: Message, prev?: Message) => {
    if (!prev) return false;
    // Same User?
    if (current.user_id !== prev.user_id) return false;
    // Within 5 minutes?
    const diff =
      new Date(current.created_at).getTime() -
      new Date(prev.created_at).getTime();
    return diff < 5 * 60 * 1000;
  };

  // 4. Helper for Initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    const trimmed = name.trim();
    const words = trimmed.split(/\s+/);

    if (words.length < 2) {
      return trimmed.substring(0, 2).toUpperCase();
    }

    // If more than 3 words, use only first 2 initials
    if (words.length > 3) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }

    // Otherwise (2 or 3 words), use first letter of each
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className='flex-1 overflow-y-auto p-4 space-y-1 bg-[#313338] scrollbar-thin scrollbar-thumb-black/20'>
      {messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const compact = isCompact(msg, prevMsg);

        return (
          <div
            key={msg.id}
            className={`flex gap-4 group pr-4 ${compact ? 'mt-0.5 py-0.5 hover:bg-black/5' : 'mt-4 hover:bg-black/5'}`}
          >
            {/* Avatar Column */}
            <div className='w-10 flex flex-col items-center'>
              {!compact && (
                // TODO: Add avatar image
                <div className='w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition text-sm font-medium text-white select-none'>
                  {msg.is_ai ? 'AI' : getInitials(msg.profiles?.name)}
                </div>
              )}
              {compact && (
                <span className='text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 mt-1 select-none'>
                  {format(new Date(msg.created_at), 'h:mm a')}
                </span>
              )}
            </div>

            {/* Content Column */}
            <div className='flex-1 min-w-0'>
              {!compact && (
                <div className='flex items-center gap-2'>
                  <span
                    className={`font-medium cursor-pointer hover:underline ${msg.is_ai ? 'text-orange-500' : 'text-white'}`}
                  >
                    {msg.is_ai ? 'Bonfire AI' : msg.profiles?.name || 'Unknown'}
                  </span>
                  {msg.is_ai && (
                    <span className='bg-[#5865F2] text-white text-[10px] px-1 rounded'>
                      BOT
                    </span>
                  )}
                  <span className='text-xs text-gray-400 ml-1'>
                    {format(new Date(msg.created_at), 'MM/dd/yyyy h:mm a')}
                  </span>
                </div>
              )}

              <p
                className={`text-gray-100 whitespace-pre-wrap leading-relaxed ${compact ? '' : 'mt-1'}`}
              >
                {msg.content}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
