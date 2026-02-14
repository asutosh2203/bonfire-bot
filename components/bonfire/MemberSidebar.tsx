import { User } from 'lucide-react';

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
};

export default function MemberSidebar({ members }: { members: Profile[] }) {
  return (
    <div className='w-72 bg-[#1A1A1E] flex-col hidden lg:flex border-l border-white/5'>
      <div className='p-4 uppercase text-lg font-bold text-gray-400 tracking-wide'>
        Members — {members.length}
      </div>

      <div className='flex-1 overflow-y-auto px-2 space-y-1'>
        {members.map((member) => (
          <div
            key={member.id}
            className='flex items-center gap-3 p-2 rounded hover:bg-[#222227] transition cursor-pointer group opacity-90 hover:opacity-100'
          >
            {/* Avatar */}
            <div className='w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden'>
             {/* TODO: Add Avatar */}
              {/* {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name || "User"} className="w-full h-full object-cover" />
                ) : */}
              <User size={16} className='text-gray-300' />
            </div>

            {/* Name */}
            <div>
              <p className='text-sm font-medium text-gray-300 group-hover:text-white truncate'>
                {member.name || member.email?.split('@')[0]}
              </p>
              {/* Status placeholder */}
              {/* <p className="text-[10px] text-gray-500">Playing Valorant</p> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
