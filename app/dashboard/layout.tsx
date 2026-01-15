import { getMyRooms } from "@/app/actions";
import Sidebar from "@/components/bonfire/Sidebar";
import { createServClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
  if (!user) redirect("/");

  // 2. Data Fetching
  const rooms = await getMyRooms();

  return (
    // Flex row: Sidebar | Content
    <div className="flex h-screen w-full bg-[#313338] overflow-hidden">
      <Sidebar rooms={rooms} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#313338]">
        {children}
      </main>
    </div>
  );
}
