'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/useUserStore';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { FaCircleCheck } from 'react-icons/fa6';

type Props = {
  messageId: number;
  question: string;
  options: string[];
};

export default function PollCard({ messageId, question, options }: Props) {
  const supabase = createBrowClient();
  const currentUser = useUserStore((s) => s.currentUser);

  const [voteCounts, setVoteCounts] = useState<number[]>(
    Array(options.length).fill(0),
  );
  const [myVote, setMyVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Keep a stable ref of the user ID for the callbacks
  const currentUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  // ─── Shared helper defined inside a useCallback or just inline ───────────────
  const fetchAndApplyVotes = async () => {
    const { data } = await supabase
      .from('poll_votes')
      .select('option_index, user_id')
      .eq('message_id', messageId);

    if (data) {
      const counts = Array(options.length).fill(0);
      let mine: number | null = null;

      data.forEach((row: { option_index: number; user_id: string }) => {
        if (row.option_index < options.length) counts[row.option_index]++;
        if (row.user_id === currentUserIdRef.current) mine = row.option_index;
      });

      setVoteCounts(counts);
      setMyVote(mine);
    }
  };

  // ─── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      await fetchAndApplyVotes();
    })();
  }, [messageId, currentUser?.id]);

  // ─── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    // 🔥 FIX: Generate the unique channel name INSIDE the effect so it
    // is mathematically impossible to collide during Strict Mode remounts.
    const channelName = `poll-${messageId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `message_id=eq.${messageId}`,
        },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Trigger the fetch directly to ensure we have fresh state
          void (async () => {
            await fetchAndApplyVotes();
          })();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  // ─── Vote handler ───────────────────────────────────────────────────────────
  const handleVote = async (optionIndex: number) => {
    if (!currentUser || isVoting) return;

    setIsVoting(true);
    // Supabase Upsert handles the switch perfectly thanks to our UNIQUE constraint
    await supabase.from('poll_votes').upsert(
      {
        message_id: messageId,
        user_id: currentUser.id,
        option_index: optionIndex,
      },
      { onConflict: 'message_id,user_id' },
    );
    setIsVoting(false);
  };

  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  return (
    <div className='mt-2 inline-flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl p-4 min-w-[33vw] shadow-lg'>
      <span className='text-xs font-bold text-orange-400 uppercase tracking-widest'>
        Poll 📊
      </span>

      <p className='text-sm font-semibold text-white'>{question}</p>

      <div className='flex flex-col gap-2'>
        {options.map((option, index) => {
          const count = voteCounts[index];
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === index;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={isVoting || !currentUser}
              className={`group cursor-pointer text-left text-sm rounded-lg px-4 py-2.5 border transition-all overflow-hidden relative ${
                isMyVote
                  ? 'border-orange-500/70 text-white shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                  : 'border-white/10 hover:border-orange-500/40 text-gray-300'
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out ${
                  isMyVote
                    ? 'bg-orange-500/20'
                    : 'bg-white/5 group-hover:bg-white/10'
                }`}
                style={{ width: `${pct}%` }}
              />

              <span className='relative flex items-center justify-between gap-4'>
                <span className='flex items-center gap-2 font-medium'>
                  {isMyVote && (
                    <span className='text-green-400 text-xs'>
                      <FaCircleCheck />
                    </span>
                  )}
                  {option}
                </span>
                <span className='text-xs text-gray-400 shrink-0 tabular-nums font-mono'>
                  {count} {count === 1 ? 'vote' : 'votes'} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className='text-xs text-gray-500 mt-1'>
        {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
        {myVote !== null && ' · tap another option to change'}
      </p>
    </div>
  );
}
