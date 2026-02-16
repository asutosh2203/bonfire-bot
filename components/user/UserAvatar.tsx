'use client';
import { FaMinusCircle } from 'react-icons/fa';
import { FaCircle } from 'react-icons/fa6';
import { FiUser } from 'react-icons/fi';
import { IoMdMoon } from 'react-icons/io';

interface UserAvatarProps {
  user: any;
  bgColor?: string;
}

const UserAvatar = ({ user, bgColor = '#1A1A1E' }: UserAvatarProps) => {
  // Helper to render the correct Discord-style status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <div
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-transparent bg-[${bgColor}]`}
          >
            <FaCircle size={10} className='text-green-500' />
          </div>
        );
      case 'idle':
        return (
          <div
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-transparent bg-[${bgColor}]`}
          >
            <IoMdMoon size={10} className='text-yellow-600' />
          </div>
        );
      case 'dnd':
        return (
          <div
            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-transparent bg-[${bgColor}]`}
          >
            <FaMinusCircle size={10} className='text-red-500' />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className='relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4A5565] text-xl'>
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className='h-full w-full rounded-full object-cover'
        />
      ) : (
        <FiUser className='text-white' />
      )}

      {/* The Status Badge Overlay */}
      <div className='absolute -bottom-0.5 -right-0.5'>
        {renderStatusBadge(user?.preferred_status)}
      </div>
    </div>
  );
};

export default UserAvatar;
