import { getMyRooms } from '@/app/actions';
import Sidebar from '@/components/bonfire/Sidebar';
import ProfileRealtimeListener from '@/components/user/ProfileRealtimeListener';
import UserProfileCard from '@/components/user/UserProfileCard';
import { createServClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Auth Check
  const supabase = await createServClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // 2. Fetch the extra profile data using the secure ID
  const { data: profileData } = await supabase
    .from('profiles')
    .select(
      'name, email, preferred_status, custom_activity, username, avatar_url',
    )
    .eq('id', user.id)
    .single();

  // 2. Data Fetching
  const rooms = await getMyRooms();

  return (
    // Flex row: Sidebar | Content
    <div className='flex h-screen w-full bg-[#313338] overflow-hidden relative'>
      <ProfileRealtimeListener userId={user.id} />
      <Sidebar rooms={rooms} />
      {profileData && <UserProfileCard user={user} profile={profileData} />}

      {/* Main Content Area */}
      <main className='flex-1 flex flex-col min-w-0 bg-[#313338]'>
        {children}
      </main>
    </div>
  );
}
