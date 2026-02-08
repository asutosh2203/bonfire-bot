'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { UserContextModal } from '@/components/bonfire/UserContextModal';
import LoginButton from '@/components/bonfire/LoginButton';

import { Send, Flame, Info, Eye, EyeOff, LogOut } from 'lucide-react'; //  Added Eye icons
import { cn } from '@/lib/utils';
import { UserContext } from '@/lib/types';
import { createBrowClient } from '@/lib/supabase/client';
import { saveUserProfile, getChatHistory, saveMessage } from '@/app/actions';
import { useRouter } from 'next/navigation';

type Message = {
  text: string;
  sender: 'user' | 'bonfire';
  isIncognito?: boolean;
};

export default function Home() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- CHAT STATE ---
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false); //  The Toggle State
  const [userContext, setUserContext] = useState<UserContext | null>(null); // User intro
  const bottomRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    { text: 'So, who are we stalking today? 💅', sender: 'bonfire' },
  ]);

  useEffect(() => {
    const supabase = createBrowClient();

    const checkUser = async () => {
      // Check Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Check if Profile exists in DB
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If we found a profile, load it into state (Hides the modal)
        if (profile) {
          setUserContext({
            name: profile.name,
            vibe: profile.vibe,
            insecurity: profile.insecurity,
          });
        }
      }

      // GET CHAT HISTORY
      const history = await getChatHistory();
      if (history.length > 0) {
        // Map DB format to UI format
        const formattedMessages: Message[] = history.map((msg: any) => ({
          text: msg.content,
          sender: msg.is_ai ? 'bonfire' : 'user',
          isIncognito: msg.is_incognito,
        }));
        setMessages(formattedMessages);
      }

      setAuthLoading(false);
    };

    checkUser();

    // Listen for auth changes (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setUserContext(null); // Reset context on logout
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = async () => {
    const supabase = createBrowClient();
    await supabase.auth.signOut();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 1. Create message with the current Privacy Flag
    const newMsg: Message = {
      text: input,
      sender: 'user',
      isIncognito: privacyMode,
    };

    // Update UI immediately
    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setInput('');

    // We don't await this because we want the UI to be snappy.
    // It runs in the background.
    saveMessage(input, 'user', privacyMode);

    //  If Incognito, STOP here. Don't call AI.
    if (privacyMode) {
      return;
    }

    setLoading(true);

    try {
      //  THE FILTER: Create a version of history that the AI is ALLOWED to see
      // We remove any message where isIncognito is true
      const visibleHistory = newHistory.filter((msg) => !msg.isIncognito);

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: input,
          history: visibleHistory, //  Send only clean history
          userContext,
        }),
      });

      const data = await res.json();

      if (data.silent) {
        setLoading(false); // Stop loading indicator
        return; // Do nothing else
      }

      setMessages((prev) => [...prev, { text: data.text, sender: 'bonfire' }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // While checking authenticaion
  if (authLoading) {
    return (
      <div className='h-screen bg-[#0E1621] flex items-center justify-center'>
        <div className='w-8 h-8 bg-orange-500 rounded-full animate-ping' />
      </div>
    );
  }

  // Render auth page
  if (!user) {
    return (
      <div className='flex flex-col h-screen bg-[#0E1621] text-white items-center justify-center p-6 relative overflow-hidden'>
        {/* Background Glows */}
        <div className='absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none' />
        <div className='absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none' />

        <div className='z-10 text-center space-y-8 max-w-md'>
          <div className='w-24 h-24 bg-linear-to-br from-orange-500 to-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl transform transition-transform rotate-3 hover:-rotate-3 animate-pulse'>
            <Flame size={48} fill='currentColor' className='text-white' />
          </div>

          <div className='space-y-2'>
            <h1 className='text-4xl font-bold tracking-tight'>Bonfire</h1>
            <p className='text-blue-200/60 text-lg'>
              The group chat that roasts you back.
            </p>
          </div>

          <div className='pt-4 flex justify-center'>
            <LoginButton />
          </div>

          <p className='text-xs text-gray-500 pt-8'>
            By entering, you agree to be judged. 💀
          </p>
        </div>
      </div>
    );
  } else {
    console.log('userContext:', userContext);
    if (!userContext) {
      return <UserContextModal onSubmit={(ctx) => setUserContext(ctx)} />;
    } else {
      router.replace('/dashboard');
    }
  }

  // return (
  //   <div className="flex flex-col h-screen bg-[#0E1621] text-white mx-auto shadow-2xl overflow-hidden font-sans">
  //     {!userContext && (
  //       <UserContextModal onSubmit={(ctx) => setUserContext(ctx)} />
  //     )}

  //     {/* Header */}
  //     <div className="px-4 py-3 bg-[#17212B] flex items-center gap-3 shadow-md z-10">
  //       <div className="relative">
  //         <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg">
  //           <Flame size={20} fill="currentColor" />
  //         </div>
  //         <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212B] rounded-full"></div>
  //       </div>
  //       <div className="flex-1">
  //         <h1 className="font-semibold text-lg leading-tight tracking-wide">
  //           Bonfire
  //         </h1>
  //         <p className="text-xs text-blue-300 font-medium opacity-80">
  //           {userContext ? `Target: ${userContext.name}` : "bot • judging you"}
  //         </p>
  //       </div>
  //       <Info
  //         size={20}
  //         className="text-gray-400 opacity-50 hover:opacity-100 cursor-pointer"
  //       />

  //       {/* Logout Button */}
  //       <button
  //         onClick={handleLogout}
  //         className="p-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
  //         title="Sign Out"
  //       >
  //         <LogOut size={20} />
  //       </button>
  //     </div>

  //     {/* Chat Area */}
  //     <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0E1621]">
  //       {messages.map((msg, i) => (
  //         <MessageBubble
  //           key={i}
  //           text={msg.text}
  //           sender={msg.sender}
  //           isIncognito={msg.isIncognito}
  //         />
  //       ))}

  //       {loading && (
  //         <div className="flex items-center gap-2 text-xs text-gray-500 ml-4 animate-pulse">
  //           <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
  //           <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
  //           <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
  //         </div>
  //       )}
  //       <div ref={bottomRef} />
  //     </div>

  //     {/* Input Area */}
  //     <div className="p-3 bg-[#17212B]">
  //       {/*  Privacy Mode Indicator */}
  //       {privacyMode && (
  //         <div className="text-xs text-green-400 font-bold mb-2 flex items-center justify-center gap-1 w-full">
  //           <EyeOff size={12} />
  //           <span>INCOGNITO ON: Bonfire can't see this.</span>
  //         </div>
  //       )}

  //       <div className="flex gap-2 items-end max-w-4xl mx-auto">
  //         {/*  The Toggle Button */}
  //         <button
  //           onClick={() => setPrivacyMode(!privacyMode)}
  //           className={cn(
  //             "p-3 rounded-full transition-all active:scale-95 border cursor-pointer",
  //             privacyMode
  //               ? "bg-green-900/30 text-green-400 border-green-500/50" // ON Style
  //               : "bg-[#2b3947] text-gray-400 border-transparent hover:text-white" // OFF Style
  //           )}
  //           title="Toggle Privacy Mode"
  //         >
  //           {privacyMode ? <EyeOff size={22} /> : <Eye size={22} />}
  //         </button>

  //         <input
  //           className={cn(
  //             "flex-1 bg-[#0E1621] text-white rounded-2xl px-5 py-3 outline-none border transition-all resize-none",
  //             //  Change border color based on mode
  //             privacyMode
  //               ? "border-green-500/50 focus:border-green-400 placeholder:text-green-700/50"
  //               : "border-transparent focus:border-blue-500/30 placeholder:text-gray-500"
  //           )}
  //           placeholder={
  //             privacyMode
  //               ? "Whisper into the void..."
  //               : "Broadcast something risky..."
  //           }
  //           value={input}
  //           onChange={(e) => setInput(e.target.value)}
  //           onKeyDown={(e) => e.key === "Enter" && sendMessage()}
  //         />

  //         <button
  //           onClick={sendMessage}
  //           disabled={loading}
  //           className={cn(
  //             " p-3 rounded-full transition-all shadow-lg active:scale-95 text-white cursor-pointer",
  //             privacyMode
  //               ? "bg-green-600 hover:bg-green-500"
  //               : "bg-linear-to-br from-orange-400 to-red-500 hover:bg-[#229ED9]"
  //           )}
  //         >
  //           <Send fill="white" size={22} className=" mt-0.5 mr-0.5" />
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );
}
