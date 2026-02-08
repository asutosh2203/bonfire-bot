"use client";

import { createBrowClient } from "@/lib/supabase/client";

export default function LoginButton() {
  const handleLogin = async () => {
    const supabase = createBrowClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=/`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition flex items-center gap-2 cursor-pointer"
    >
      <img
        src="https://authjs.dev/img/providers/google.svg"
        className="w-5 h-5"
        alt="G"
      />
      Sign in with Google
    </button>
  );
}
