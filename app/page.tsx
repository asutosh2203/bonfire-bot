"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Send, Flame, Info, Eye, EyeOff } from "lucide-react"; //  Added Eye icons
import { cn } from "@/lib/utils";

type Message = {
  text: string;
  sender: "user" | "bonfire";
  isIncognito?: boolean; //  New flag
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false); //  The Toggle State
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { text: "So, who are we stalking today? 💅", sender: "bonfire" },
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 1. Create message with the current Privacy Flag
    const newMsg: Message = {
      text: input,
      sender: "user",
      isIncognito: privacyMode, //  Tag it!
    };

    // Update UI immediately
    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setInput("");

    //  If Incognito, STOP here. Don't call AI.
    if (privacyMode) {
      return;
    }

    setLoading(true);

    try {
      //  THE FILTER: Create a version of history that the AI is ALLOWED to see
      // We remove any message where isIncognito is true
      const visibleHistory = newHistory.filter((msg) => !msg.isIncognito);

      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          history: visibleHistory, //  Send only clean history
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { text: data.text, sender: "bonfire" }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0E1621] text-white mx-auto shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-3 bg-[#17212B] flex items-center gap-3 shadow-md z-10">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg">
            <Flame size={20} fill="currentColor" />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212B] rounded-full"></div>
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-lg leading-tight tracking-wide">
            Bonfire
          </h1>
          <p className="text-xs text-blue-300 font-medium opacity-80">
            bot • judging you
          </p>
        </div>
        <Info
          size={20}
          className="text-gray-400 opacity-50 hover:opacity-100 cursor-pointer"
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0E1621]">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            text={msg.text}
            sender={msg.sender}
            isIncognito={msg.isIncognito}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 ml-4 animate-pulse">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#17212B]">
        {/*  Privacy Mode Indicator */}
        {privacyMode && (
          <div className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1">
            <EyeOff size={12} />
            <span>INCOGNITO ON: Bonfire can't see this.</span>
          </div>
        )}

        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          {/*  The Toggle Button */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={cn(
              "p-3 rounded-full transition-all active:scale-95 border",
              privacyMode
                ? "bg-green-900/30 text-green-400 border-green-500/50" // ON Style
                : "bg-[#2b3947] text-gray-400 border-transparent hover:text-white" // OFF Style
            )}
            title="Toggle Privacy Mode"
          >
            {privacyMode ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>

          <input
            className={cn(
              "flex-1 bg-[#0E1621] text-white rounded-2xl px-5 py-3 outline-none border transition-all resize-none",
              //  Change border color based on mode
              privacyMode
                ? "border-green-500/50 focus:border-green-400 placeholder:text-green-700/50"
                : "border-transparent focus:border-blue-500/30 placeholder:text-gray-500"
            )}
            placeholder={
              privacyMode
                ? "Whisper into the void..."
                : "Broadcast something risky..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className={cn(
              "p-3 rounded-full transition-all shadow-lg active:scale-95 text-white",
              privacyMode
                ? "bg-green-600 hover:bg-green-500"
                : "bg-[#2AABEE] hover:bg-[#229ED9]"
            )}
          >
            <Send size={22} className="ml-0.5 mt-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
