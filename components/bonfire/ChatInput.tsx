'use client';

import { useState, useEffect } from 'react';
import { LoaderCircle, Send, Sparkles } from 'lucide-react';
import { createBrowClient } from '@/lib/supabase/client';
import { toast } from 'sonner'; // Assuming you have sonner or use alert

export default function ChatInput({
  roomId,
  isRoomAiEnabled,
}: {
  roomId: string;
  isRoomAiEnabled: boolean;
}) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bonfireEnabled, setBonfireEnabled] = useState(isRoomAiEnabled);
  const supabase = createBrowClient();

  useEffect(() => {
    setBonfireEnabled(isRoomAiEnabled);
  }, [isRoomAiEnabled]);

  const handleSend = async () => {
    if (!content.trim()) return;

    setIsLoading(true);
    const text = content.trim();
    setContent(''); // Optimistic clear

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if Profile exists in DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { error } = await supabase.from('messages').insert({
        content: text,
        room_id: roomId,
        user_id: user.id,
        is_incognito: !bonfireEnabled || !isRoomAiEnabled, // if either is disabled, send as incognito
      });

      // Send message to AI if both text AI and room AI are enabled
      if (bonfireEnabled && isRoomAiEnabled) {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            roomId: roomId,
            summonedBy: user.id,
            userContext: {
              name: profile.name,
              vibe: profile.vibe,
              insecurity: profile.insecurity,
            },
          }),
        });
      }

      if (error) throw error;
    } catch (e) {
      console.error(e);
      toast.error('Failed to send');
      setContent(text); // Restore text on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='p-4 bg-[#1A1A1E] shrink-0'>
      <div className='bg-[#27272c] rounded-lg p-2 flex items-center gap-2 shadow-inner'>
        <button
          onClick={() => setBonfireEnabled(!bonfireEnabled)}
          disabled={!isRoomAiEnabled}
          className={`p-2 transition rounded-full cursor-pointer ${
            !isRoomAiEnabled
              ? 'text-gray-600 cursor-not-allowed opacity-50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#404249]'
          }`}
          title={
            !isRoomAiEnabled
              ? 'Bonfire is disabled for this room'
              : bonfireEnabled
                ? 'Disable Bonfire'
                : 'Enable Bonfire'
          }
        >
          <Sparkles
            size={20}
            className={bonfireEnabled ? 'text-orange-500' : 'text-gray-600'}
          />
        </button>

        <input
          className='flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none px-2'
          placeholder={`Message #${roomId.substring(0, 4)}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={!content.trim() || isLoading}
          className='p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer'
        >
          {!isLoading ? (
            <Send size={20} />
          ) : (
            <LoaderCircle size={20} className='animate-spin' />
          )}
        </button>
      </div>
      <div className='text-[10px] text-gray-500 mt-1 text-right px-2'>
        {bonfireEnabled ? 'Bonfire is listening.' : 'Bonfire is disabled.'}
      </div>
    </div>
  );
}
