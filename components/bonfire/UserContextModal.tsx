'use client';

import { useState } from 'react';
import { Flame, ArrowRight, Loader2 } from 'lucide-react';
import { UserContext } from '@/lib/types';
import { saveUserProfile } from '@/app/actions';
import { useRouter } from 'next/navigation';

export const UserContextModal = () => {
  const [formData, setFormData] = useState<UserContext>({
    name: '',
    vibe: '',
    insecurity: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    // 1. Validation
    if (!formData.name || !formData.vibe || !formData.insecurity) return;

    setIsSaving(true);

    try {
      // 2. Call Server Action (Saves to Supabase)
      await saveUserProfile(formData);

      router.refresh(); // Updates the server state
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Bonfire choked. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='w-full max-w-md bg-[#17212B] rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden'>
        {/* Background Glow */}
        <div className='absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none' />

        <div className='relative z-10 text-center space-y-6'>
          <div className='mx-auto w-14 h-14 bg-linear-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform rotate-3 hover:-rotate-3'>
            <Flame size={28} className='text-white' fill='currentColor' />
          </div>

          <div>
            <h2 className='text-2xl font-bold text-white mb-2'>Who are you?</h2>
            <p className='text-gray-400 text-sm'>
              Bonfire needs ammo. Be honest, or I'll just assume you're boring.
            </p>
          </div>

          <div className='space-y-4 text-left'>
            {/* Name */}
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wider ml-1'>
                Name
              </label>
              <input
                autoFocus
                disabled={isSaving}
                className='w-full bg-[#0E1621] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent focus:border-orange-500/30 placeholder:text-gray-700 disabled:opacity-50'
                placeholder='e.g. Asutosh'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            {/* Vibe */}
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wider ml-1'>
                Vibe / Role
              </label>
              <input
                disabled={isSaving}
                className='w-full bg-[#0E1621] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent focus:border-orange-500/30 placeholder:text-gray-700 disabled:opacity-50'
                placeholder='e.g. The Over-Engineer, The Gym Bro'
                value={formData.vibe}
                onChange={(e) =>
                  setFormData({ ...formData, vibe: e.target.value })
                }
              />
            </div>

            {/* Insecurity */}
            <div>
              <label className='text-xs font-bold text-gray-500 uppercase tracking-wider ml-1'>
                Biggest Insecurity
              </label>
              <input
                disabled={isSaving}
                className='w-full bg-[#0E1621] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all border border-transparent focus:border-orange-500/30 placeholder:text-gray-700 disabled:opacity-50'
                placeholder='e.g. I never finish side projects'
                value={formData.insecurity}
                onChange={(e) =>
                  setFormData({ ...formData, insecurity: e.target.value })
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              !formData.name ||
              !formData.vibe ||
              !formData.insecurity ||
              isSaving
            }
            className='w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer'
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className='animate-spin' />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Enter the Pit</span>
                <ArrowRight
                  size={18}
                  className='group-hover:translate-x-1 transition-transform'
                />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
