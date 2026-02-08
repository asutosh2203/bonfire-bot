import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function InviteNotFound() {
  return (
    <div className="bg-[url('/not-found.webp')] bg-cover bg-center min-h-screen flex items-center justify-center p-4">
      <div className='bg-[#2B2D31] p-8 rounded-lg shadow-2xl max-w-md w-full text-center border border-red-500/20 animate-in fade-in zoom-in-95 duration-300'>
        <AlertTriangle size={40} color='red' className='w-full mx-auto mb-2'/>
        <h1 className='text-2xl font-bold text-white mb-2'>Invite Invalid</h1>
        <p className='text-gray-400 mb-6'>
          This invite link is dead, mate. The owner might have revoked it, or it
          never existed.
        </p>

        <Link
          href='/dashboard'
          className='block w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-3 rounded font-medium transition'
        >
          Return to Safety
        </Link>
      </div>
    </div>
  );
}
