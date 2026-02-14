'use client';

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { RiMessage3Fill } from 'react-icons/ri';
import { useChatStore } from '@/store/useChatStore';

interface Message {
  id: number;
  content: string;
  name: string;
}

const ReactionModal = ({ message }: { message: Message }) => {
  const [showPicker, setShowPicker] = useState(false);
  const setReplyTarget = useChatStore((state) => state.setReplyTarget);

  return (
    <div className='bg-[#27272c] h-10 flex gap-1 items-center justify-center rounded-full px-2 py-1 absolute right-4 -top-5 bg-opacity-100 shadow-lg z-10 transition-all duration-200 ease-in-out border border-white/5 opacity-0 group-hover:opacity-100'>
      {/* 3 Basic reaction smileys */}
      <button className='cursor-pointer hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded-full text-lg leading-none'>
        👍
      </button>
      <button className='cursor-pointer hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded-full text-lg leading-none'>
        😂
      </button>
      <button className='cursor-pointer hover:scale-110 transition-transform p-1.5 hover:bg-white/10 rounded-full text-lg leading-none'>
        ❤️
      </button>

      {/* React Button - Click to open modal */}
      <div className='relative'>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className='hover:bg-white/10 cursor-pointer p-1.5 rounded-full transition-colors text-gray-400 hover:text-white flex items-center justify-center'
        >
          <SmilePlus size={18} />
        </button>

        {showPicker && (
          <div className='absolute bottom-12 right-0 z-50'>
            {/* Backdrop to close when clicking outside */}
            <div
              className='fixed inset-0 z-40'
              onClick={() => setShowPicker(false)}
            />
            <div className='relative z-50 shadow-xl rounded-lg overflow-hidden'>
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emojiData: EmojiClickData) => {
                  console.log(emojiData);
                  setShowPicker(false);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Vertical Line */}
      <div className='w-px h-5 bg-white/10 mx-1'></div>

      {/* Reply Button */}
      <button className='hover:bg-white/10 p-1.5 cursor-pointer rounded-full transition-colors text-gray-400 hover:text-white flex items-center justify-center'>
        <RiMessage3Fill size={18} onClick={() => setReplyTarget(message)}/>
      </button>
    </div>
  );
};

export default ReactionModal;
