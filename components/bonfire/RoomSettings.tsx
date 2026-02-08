'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { regenerateInviteCode } from '@/app/actions';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for merging tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RoomSettingsProps {
  roomId: string;
  currentCode: string;
  isOwner: boolean;
}

export default function RoomSettings({
  roomId,
  currentCode,
  isOwner,
}: RoomSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(currentCode);
  const [copied, setCopied] = useState(false);

  // Async states
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);

  // Refs for click outside
  const modalRef = useRef<HTMLDivElement>(null);

  // Safe window origin
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const inviteLink = origin ? `${origin}/invite/${code}` : `.../invite/${code}`;

  // Handle modal open/close with keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        resetStates();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resetStates = () => {
    setShowConfirmRegenerate(false);
    setRegenerateError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetStates();
  };

  const handleCopy = useCallback(async () => {
    if (!origin) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [inviteLink, origin]);

  const handleRegenerate = async () => {
    if (!showConfirmRegenerate) {
      setShowConfirmRegenerate(true);
      return;
    }

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      const res = await regenerateInviteCode(roomId);
      if (res.success && res.newCode) {
        console.log('New invite code:', res.newCode);
        setCode(res.newCode);
        setShowConfirmRegenerate(false); // Reset confirmation on success
      } else {
        setRegenerateError('Server returned an invalid response.');
      }
    } catch (error) {
      setRegenerateError('Failed to rotate key. Please try again.');
      console.error('Regenerate error:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className={cn(
          'p-2 text-gray-400 rounded transition-colors duration-200 cursor-pointer',
          'hover:text-white hover:bg-white/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]',
        )}
        aria-label='Room Settings'
        aria-haspopup='dialog'
        aria-expanded={isOpen}
      >
        <Settings size={20} />
      </button>

      {isOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
          role='dialog'
          aria-modal='true'
          aria-labelledby='modal-title'
        >
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'
            onClick={handleClose}
            aria-hidden='true'
          />

          {/* Modal Content */}
          <div
            ref={modalRef}
            className={cn(
              'relative w-full max-w-md bg-[#313338] p-6 rounded-lg shadow-2xl',
              'animate-in zoom-in-95 duration-200 border border-white/5',
            )}
          >
            <button
              onClick={handleClose}
              className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer'
              aria-label='Close settings'
            >
              <X size={24} />
            </button>

            <h2 id='modal-title' className='text-xl font-bold text-white mb-1'>
              Room Settings
            </h2>
            <p className='text-gray-400 text-sm mb-6'>
              Manage invites and security settings.
            </p>

            <div className='space-y-6'>
              {/* Invite Link Section */}
              <section className='space-y-2'>
                <label
                  htmlFor='invite-link'
                  className='text-xs font-bold text-gray-400 uppercase tracking-wide block'
                >
                  Invite Link
                </label>

                <div className='bg-[#1E1F22] p-2 rounded flex items-center gap-2 border border-black/20 focus-within:border-[#5865F2]/50 transition-colors'>
                  <input
                    id='invite-link'
                    readOnly
                    value={inviteLink}
                    className='flex-1 bg-transparent text-sm text-gray-200 outline-none truncate font-mono select-all'
                  />
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'p-2 rounded transition-all duration-200 min-w-[36px] flex items-center justify-center cursor-pointer',
                      copied
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-[#5865F2] text-white hover:bg-[#4752C4]',
                    )}
                    aria-label={copied ? 'Copied' : 'Copy invite link'}
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className='text-[11px] text-gray-500'>
                  Share this link to grant access to this room.
                </p>
              </section>

              {/* Danger Zone */}
              {isOwner && (
                <section className='border-t border-white/5 pt-5 mt-5'>
                  <h3 className='text-xs font-bold text-red-400 uppercase tracking-wide mb-3'>
                    Danger Zone
                  </h3>

                  <div className='bg-red-500/5 border border-red-500/10 rounded-md p-4 space-y-4'>
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <AlertTriangle size={16} className='text-red-400' />
                        <span className='text-sm font-medium text-gray-200'>
                          Revoke Invite Link
                        </span>
                      </div>
                      <p className='text-xs text-gray-400 leading-relaxed'>
                        Generating a new link will immediately invalidate the
                        current one. Existing members will not be kicked.
                      </p>
                    </div>

                    {regenerateError && (
                      <div className='p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300'>
                        {regenerateError}
                      </div>
                    )}

                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-all duration-200 cursor-pointer',
                        showConfirmRegenerate
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : 'bg-red-500 hover:bg-red-600 text-white',
                        isRegenerating && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <RefreshCw
                        size={14}
                        className={cn(isRegenerating && 'animate-spin')}
                      />
                      {isRegenerating
                        ? 'Rotating Keys...'
                        : showConfirmRegenerate
                          ? 'Are you sure? Click to Confirm'
                          : 'Regenerate Invite Code'}
                    </button>

                    {showConfirmRegenerate && (
                      <button
                        onClick={() => setShowConfirmRegenerate(false)}
                        className='w-full text-xs text-gray-400 hover:text-gray-300 underline decoration-gray-600 cursor-pointer'
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
