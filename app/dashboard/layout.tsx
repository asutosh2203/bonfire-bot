import { getMyRooms } from '@/app/actions';
import Sidebar from '@/components/bonfire/Sidebar';
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

  let profileData = null;

  // 2. Fetch the extra profile data using the secure ID
  const { data } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single();

  profileData = data;

  // 2. Data Fetching
  const rooms = await getMyRooms();

  return (
    // Flex row: Sidebar | Content
    <div className='flex h-screen w-full bg-[#313338] overflow-hidden relative'>
      <Sidebar rooms={rooms} />
      <UserProfileCard user={user} profile={profileData} />
      {/* Main Content Area */}
      <main className='flex-1 flex flex-col min-w-0 bg-[#313338]'>
        {children}
      </main>
    </div>
  );
}
