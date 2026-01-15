import { Flame } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 select-none">
      <div className="w-24 h-24 bg-[#2B2D31] rounded-full flex items-center justify-center grayscale animate-pulse">
        <Flame size={48} className="text-gray-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-200">Welcome to Bonfire</h1>
        <p className="text-gray-400 mt-2">
          Select a server on the left to start roasting.
        </p>
      </div>
    </div>
  );
}
