'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import MessageBubble, { Message } from '../chat/MessageBubble';

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
     createBrowClient returns a singleton instance. 
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
        .select(
          `*,
           profiles ( name, avatar_url ),
           parent_message:parent_message_id (
             id,
             content,
             sender: user_id( name )
          )`,
        )
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) console.error('Fetch Error:', error); // Debug log
      if (data) setMessages(data as any);
    };

    fetchMessages();

    let channel: RealtimeChannel;
    const setupRealtime = async () => {
      // 1. CHECK AUTH STATE FIRST
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn('⚠️ No session found. Realtime disabled for security.');
        return;
      }

      console.log(`🔌 Subscribing as user: ${session.user.id}`);

      // 2. Real-time Subscription (DEBUG MODE)
      console.log('🔌 Attempting to subscribe to room:', roomId);
      const channelId = `room:${roomId}:${Date.now()}`;

      channel = supabase
        ?.channel(channelId) // Channel name
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`
          },
          async (payload: any) => {
            // Manual Filter (since we removed the server-side one)
            if (payload.new.room_id !== roomId) return;

            // Fetch the profile for the sender
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, avatar_url') // Updated schema
              .eq('id', payload.new.user_id)
              .single();

            // Fetch the parent message
            const { data: parentMessage } = await supabase
              .from('messages')
              .select('*, sender:user_id(name)')
              .eq('id', payload.new.parent_message_id)
              .single();

            const newMessage = {
              ...payload.new,
              profiles: profile,
              parent_message: parentMessage,
            } as Message;

            console.log(newMessage);
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
    };

    setupRealtime();
    return () => {
      console.log('🔌 Disconnecting...');
      supabase?.removeChannel(channel);
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

  return (
    <div className='flex-1 overflow-y-auto py-4 space-y-1 bg-[#1A1A1E] scrollbar-thin scrollbar-thumb-black/20'>
      {messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const compact = isCompact(msg, prevMsg);

        return <MessageBubble key={msg.id} message={msg} isCompact={compact} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
