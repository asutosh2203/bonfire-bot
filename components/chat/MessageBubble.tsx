'use client';

import { format } from 'date-fns';
import { Globe, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ReactionModal from './ReactionModal';
import { HiOutlineReply } from 'react-icons/hi';

// Define the Message type here to be self-contained or import if you have a shared type
export type Message = {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  is_ai: boolean;
  profiles: {
    name: string;
    avatar_url: string;
  };
  metadata: {
    sources: { title: string; url: string }[];
    searchQuery: string;
  };
  parent_message: any;
};

type Props = {
  message: Message;
  isCompact: boolean;
};

export default function MessageBubble({ message, isCompact }: Props) {
  const { metadata } = message;
  const sources = metadata?.sources || [];

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
    <div
      className={`flex gap-4 group p-2 ${
        isCompact ? 'mt-0.5 py-0.5 hover:bg-[#222227]' : 'hover:bg-[#222227]'
      } relative group`}
    >
      <ReactionModal
        message={{
          id: message.id,
          content: message.content,
          name: message.profiles?.name,
        }}
      />
      {/* Avatar Column */}
      <div className='w-12 flex justify-center'>
        {!isCompact && (
          <img
            src={message.profiles?.avatar_url}
            alt={message.profiles?.name}
            className='w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition text-sm font-medium text-white select-none'
          />
        )}
        {isCompact && (
          <span className='text-[10px] mt-1 text-gray-500 opacity-0 group-hover:opacity-100 select-none'>
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        )}
      </div>

      {/* Content Column */}
      <div className='flex-1 min-w-0'>
        {!isCompact && (
          <div className='flex items-center gap-2 text-sm'>
            <span
              className={`cursor-pointer hover:underline font-bold ${
                message.is_ai ? 'text-orange-500' : 'text-white'
              }`}
            >
              {message.is_ai
                ? 'Bonfire AI'
                : message.profiles?.name || 'Unknown'}
            </span>
            {message.is_ai && (
              <span className='bg-[#5865F2] text-white text-[10px] px-1 rounded'>
                BOT
              </span>
            )}
            <span className='text-xs text-gray-400 ml-1'>
              {format(new Date(message.created_at), 'MM/dd/yyyy h:mm a')}
            </span>
          </div>
        )}

        {/* Parent Message */}
        {message.parent_message && (
          <div className='flex items-center gap-2'>
            <div className='w-4 rotate-180'>
              <HiOutlineReply size={16} className='text-gray-400' />
            </div>
            <div className='my-2 p-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2 flex-none w-[95%]'>
              <div className='text-xs text-gray-400 shrink-0'>
                {message.parent_message.sender.name}
              </div>
              <div className='text-sm text-gray-200 truncate'>
                {message.parent_message.content}
              </div>
            </div>
          </div>
        )}
        <div
          className={`markdown-content text-gray-100 text-sm ${
            isCompact ? '' : 'mt-1'
          }`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
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
                <span className='truncate max-w-[150px]'>{source.title}</span>
                <ExternalLink size={10} className='opacity-50' />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
