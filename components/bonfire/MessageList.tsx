'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ExternalLink, Globe, User } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  is_ai: boolean;
  profiles: {
    name: string;
  };
  metadata: {
    sources: { title: string; url: string }[];
    searchQuery: string;
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
        .select(`*, profiles ( name )`)
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

  // 5. Helper for highlighting mentions
  function highlightMentions(text: string) {
    // Match @username but avoid emails/URLs
    const regex = /(^|\s)(@\w+)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, prefix, mention] = match;
      const start = match.index + prefix.length;

      // push text before mention
      parts.push(text.slice(lastIndex, start));

      // push styled mention
      parts.push(
        <span key={start} className='font-bold italic'>
          {mention}
        </span>,
      );

      lastIndex = start + mention.length;
    }

    parts.push(text.slice(lastIndex));
    return parts;
  }

  return (
    <div className='flex-1 overflow-y-auto p-4 space-y-1 bg-[#1A1A1E] scrollbar-thin scrollbar-thumb-black/20'>
      {messages.map((msg, index) => {
        const prevMsg = messages[index - 1];
        const compact = isCompact(msg, prevMsg);

        const { metadata } = msg;
        const sources = metadata?.sources || [];

        return (
          <div
            key={msg.id}
            className={`flex gap-4 group px-4 py-2 rounded-md ${compact ? 'mt-0.5 py-0.5 hover:bg-[#222227]' : 'hover:bg-[#222227]'}`}
          >
            {/* Avatar Column */}
            <div className='w-12 flex flex-col items-center'>
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
                    className={`cursor-pointer hover:underline font-bold ${msg.is_ai ? 'text-orange-500' : 'text-white'}`}
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
              {/* <p
                className={`text-gray-100 whitespace-pre-wrap leading-relaxed ${compact ? '' : 'mt-1'}`}
              > */}
                <div className={`markdown-content text-gray-100 ${compact ? '' : 'mt-1'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              {/* </p> */}
              {/* Citation chips */}
              {sources.length > 0 && (
                <div className='mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/10'>
                  {sources.map((source: any, index: number) => (
                    <a
                      key={index}
                      href={source.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1.5 bg-black/20 hover:bg-black/40 text-xs text-blue-300 px-3 py-1.5 rounded-full transition border border-white/5'
                    >
                      <Globe size={12} />
                      <span className='truncate max-w-[150px]'>
                        {source.title}
                      </span>
                      <ExternalLink size={10} className='opacity-50' />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
